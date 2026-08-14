import { createReadStream } from "node:fs";
import path from "node:path";
import process from "node:process";
import { createInterface } from "node:readline";
import { createClient } from "@supabase/supabase-js";

type QueueCandidate = {
  id: string;
  institutionName: string;
  sourceRank: number;
};

type ScorecardInstitution = {
  ipedsUnitId: string;
  name: string;
  officialWebsite: string;
};

type ResolvedCandidate = {
  candidate: QueueCandidate;
  institution: ScorecardInstitution;
};

type InstitutionUpsert = {
  ipeds_unitid: string;
  name: string;
  short_name: string;
  country: string;
  region: string;
  official_website: string;
  is_published: boolean;
};

type UpsertedInstitution = {
  id: string;
  ipeds_unitid: string;
};

const collectionKey = "usnews-national-universities-2026";

// These are reviewed primary-campus UNITIDs from the official College
// Scorecard file. They resolve legitimate naming differences without relying
// on fuzzy matching for multi-campus university systems.
const reviewedIpedsIdOverrides = new Map<string, string>([
  ["columbia university", "190150"],
  ["university of notre dame", "152080"],
  ["university of north carolina chapel hill", "199120"],
  ["university of virginia", "234076"],
  ["university of texas austin", "228778"],
  ["georgia institute of technology", "139755"],
  ["ohio state university", "204796"],
  ["university of washington", "236948"],
  ["texas a and m university", "228723"],
  ["virginia tech", "233921"],
  ["pennsylvania state university university park", "214777"],
  ["stony brook university suny", "196097"],
  ["north carolina state university", "199193"],
  ["university of pittsburgh", "215293"],
  ["binghamton university suny", "196079"],
  ["university at buffalo suny", "196088"],
]);

function getScorecardPath(): string {
  const argument = process.argv.find((value) => value.startsWith("--scorecard="));
  if (!argument) {
    throw new Error("Pass the unzipped College Scorecard CSV with --scorecard=/absolute/path/to/file.csv.");
  }

  return argument.slice("--scorecard=".length);
}

function isValidationOnly(): boolean {
  return process.argv.includes("--validate-only");
}

function isDryRun(): boolean {
  return process.argv.includes("--dry-run");
}

function getRequiredEnvironmentValue(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required. Keep it in .env.local and never commit it.`);
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseQueueCandidates(value: unknown): QueueCandidate[] {
  if (!Array.isArray(value)) {
    throw new Error("Queue query did not return an array.");
  }

  return value.map((item, index) => {
    if (
      !isRecord(item) ||
      typeof item.id !== "string" ||
      typeof item.institution_name !== "string" ||
      typeof item.source_rank !== "number"
    ) {
      throw new Error(`Queue record ${index + 1} has an invalid shape.`);
    }

    return {
      id: item.id,
      institutionName: item.institution_name,
      sourceRank: item.source_rank,
    };
  });
}

function parseUpsertedInstitutions(value: unknown): UpsertedInstitution[] {
  if (!Array.isArray(value)) {
    throw new Error("Institution upsert did not return an array.");
  }

  return value.map((item, index) => {
    if (!isRecord(item) || typeof item.id !== "string" || typeof item.ipeds_unitid !== "string") {
      throw new Error(`Institution result ${index + 1} has an invalid shape.`);
    }

    return { id: item.id, ipeds_unitid: item.ipeds_unitid };
  });
}

function normalizeName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-US")
    .replace(/&/g, " and ")
    .replace(/--/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^the\s+/, "");
}

function tokenSimilarity(left: string, right: string): number {
  const leftTokens = new Set(normalizeName(left).split(" ").filter(Boolean));
  const rightTokens = new Set(normalizeName(right).split(" ").filter(Boolean));
  const union = new Set([...leftTokens, ...rightTokens]);
  const intersection = [...leftTokens].filter((token) => rightTokens.has(token));
  return union.size === 0 ? 0 : intersection.length / union.size;
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let isQuoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (isQuoted) {
      if (character === '"' && line[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        isQuoted = false;
      } else {
        cell += character;
      }
      continue;
    }

    if (character === '"') {
      isQuoted = true;
    } else if (character === ",") {
      cells.push(cell);
      cell = "";
    } else {
      cell += character;
    }
  }

  if (isQuoted) {
    throw new Error("College Scorecard CSV contains an unterminated quoted value.");
  }

  cells.push(cell);
  return cells;
}

function toOfficialWebsite(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || /^privacy/i.test(trimmed)) {
    return null;
  }

  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

async function loadScorecardInstitutions(scorecardPath: string): Promise<ScorecardInstitution[]> {
  const reader = createInterface({
    input: createReadStream(path.resolve(scorecardPath), { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  let columnIndexes: Map<string, number> | null = null;
  const institutions: ScorecardInstitution[] = [];

  for await (const line of reader) {
    const cells = parseCsvLine(line);

    if (!columnIndexes) {
      columnIndexes = new Map(cells.map((column, index) => [column.replace(/^\uFEFF/, ""), index]));
      const requiredColumns = ["UNITID", "INSTNM", "INSTURL", "CURROPER"];
      const missingColumns = requiredColumns.filter((column) => !columnIndexes?.has(column));

      if (missingColumns.length > 0) {
        throw new Error(`College Scorecard CSV is missing: ${missingColumns.join(", ")}.`);
      }
      continue;
    }

    const unitId = cells[columnIndexes.get("UNITID") ?? -1]?.trim();
    const name = cells[columnIndexes.get("INSTNM") ?? -1]?.trim();
    const website = toOfficialWebsite(cells[columnIndexes.get("INSTURL") ?? -1] ?? "");
    const isCurrentlyOperating = cells[columnIndexes.get("CURROPER") ?? -1]?.trim() === "1";

    if (unitId && name && website && isCurrentlyOperating) {
      institutions.push({ ipedsUnitId: unitId, name, officialWebsite: website });
    }
  }

  return institutions;
}

function resolveCandidates(
  candidates: QueueCandidate[],
  scorecardInstitutions: ScorecardInstitution[],
): { resolved: ResolvedCandidate[]; unresolved: QueueCandidate[] } {
  const normalizedIndex = new Map<string, ScorecardInstitution[]>();
  const ipedsUnitIdIndex = new Map<string, ScorecardInstitution>();

  for (const institution of scorecardInstitutions) {
    const normalized = normalizeName(institution.name);
    const matches = normalizedIndex.get(normalized) ?? [];
    matches.push(institution);
    normalizedIndex.set(normalized, matches);
    ipedsUnitIdIndex.set(institution.ipedsUnitId, institution);
  }

  const resolved: ResolvedCandidate[] = [];
  const unresolved: QueueCandidate[] = [];

  for (const candidate of candidates) {
    const normalizedCandidateName = normalizeName(candidate.institutionName);
    const reviewedUnitId = reviewedIpedsIdOverrides.get(normalizedCandidateName);
    const reviewedInstitution = reviewedUnitId ? ipedsUnitIdIndex.get(reviewedUnitId) : undefined;
    if (reviewedInstitution) {
      resolved.push({ candidate, institution: reviewedInstitution });
      continue;
    }

    const exactMatches = normalizedIndex.get(normalizedCandidateName) ?? [];
    if (exactMatches.length === 1) {
      resolved.push({ candidate, institution: exactMatches[0] });
      continue;
    }

    const rankedMatches = scorecardInstitutions
      .map((institution) => ({ institution, score: tokenSimilarity(candidate.institutionName, institution.name) }))
      .filter((match) => match.score >= 0.8)
      .sort((left, right) => right.score - left.score);
    const bestMatch = rankedMatches[0];
    const secondBestMatch = rankedMatches[1];

    if (
      bestMatch &&
      bestMatch.score >= 0.92 &&
      (!secondBestMatch || bestMatch.score - secondBestMatch.score >= 0.12)
    ) {
      resolved.push({ candidate, institution: bestMatch.institution });
    } else {
      unresolved.push(candidate);
    }
  }

  return { resolved, unresolved };
}

async function main(): Promise<void> {
  const scorecardPath = getScorecardPath();
  const scorecardInstitutions = await loadScorecardInstitutions(scorecardPath);

  if (isValidationOnly()) {
    console.log(`Validated ${scorecardInstitutions.length} active institutions from ${scorecardPath}.`);
    return;
  }

  const supabaseUrl = getRequiredEnvironmentValue("NEXT_PUBLIC_SUPABASE_URL");
  const secretKey = getRequiredEnvironmentValue("SUPABASE_SECRET_KEY");
  const client = createClient(supabaseUrl, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  const { data: queueData, error: queueError } = await client
    .from("institution_intake_queue")
    .select("id, institution_name, source_rank")
    .eq("collection_key", collectionKey)
    .eq("review_status", "pending_resolution")
    .order("source_rank", { ascending: true });

  if (queueError) {
    throw new Error(`Could not read the intake queue: ${queueError.message}`);
  }

  const candidates = parseQueueCandidates(queueData as unknown);
  const { resolved, unresolved } = resolveCandidates(candidates, scorecardInstitutions);

  if (resolved.length === 0) {
    throw new Error("No candidates matched College Scorecard data. No database changes were made.");
  }

  if (isDryRun()) {
    console.log(`Dry run resolved ${resolved.length} of ${candidates.length} candidates.`);
    if (unresolved.length > 0) {
      console.log(`Needs manual review (${unresolved.length}): ${unresolved.map((candidate) => candidate.institutionName).join(" | ")}`);
    }
    return;
  }

  const institutionRows: InstitutionUpsert[] = resolved.map(({ institution }) => ({
    ipeds_unitid: institution.ipedsUnitId,
    name: institution.name,
    short_name: institution.name,
    country: "United States",
    region: "美国",
    official_website: institution.officialWebsite,
    is_published: false,
  }));

  const { data: upsertData, error: upsertError } = await client
    .from("institutions")
    .upsert(institutionRows, { onConflict: "ipeds_unitid" })
    .select("id, ipeds_unitid");

  if (upsertError) {
    throw new Error(`Could not upsert resolved institutions: ${upsertError.message}`);
  }

  const upsertedInstitutions = parseUpsertedInstitutions(upsertData as unknown);
  const resolvedIds = new Map(upsertedInstitutions.map((institution) => [institution.ipeds_unitid, institution.id]));
  const updates = resolved.map(({ candidate, institution }) => {
    const resolvedInstitutionId = resolvedIds.get(institution.ipedsUnitId);
    if (!resolvedInstitutionId) {
      throw new Error(`Missing returned database ID for IPEDS ${institution.ipedsUnitId}.`);
    }
    return { id: candidate.id, resolvedInstitutionId };
  });

  const batchSize = 20;
  for (let start = 0; start < updates.length; start += batchSize) {
    const batch = updates.slice(start, start + batchSize);
    const results = await Promise.all(
      batch.map(({ id, resolvedInstitutionId }) =>
        client
          .from("institution_intake_queue")
          .update({
            review_status: "resolved",
            resolved_institution_id: resolvedInstitutionId,
            reviewed_at: new Date().toISOString(),
          })
          .eq("id", id),
      ),
    );

    const failed = results.find((result) => result.error);
    if (failed?.error) {
      throw new Error(`Could not update the intake queue: ${failed.error.message}`);
    }
  }

  console.log(`Resolved ${resolved.length} of ${candidates.length} candidates to active College Scorecard institutions.`);

  if (unresolved.length > 0) {
    console.log(`Needs manual review (${unresolved.length}): ${unresolved.map((candidate) => candidate.institutionName).join(" | ")}`);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown IPEDS resolution failure.";
  console.error(message);
  process.exitCode = 1;
});
