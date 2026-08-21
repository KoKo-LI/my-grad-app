import { createHash } from "node:crypto";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

const sourceKindValues = ["official_program", "official_institution", "IPEDS", "CDS", "licensed_partner"] as const;

type SourceKind = (typeof sourceKindValues)[number];

type CandidateRow = {
  degree_name: string;
  field_of_study: string;
  id: string;
  institution_id: string;
  major_categories: string[];
  official_url: string;
  program_name: string;
  record_key: string;
  source_excerpt: string | null;
  source_kind: SourceKind;
  source_title: string;
  source_url: string;
  source_year: string;
};

type BatchRow = { id: string };
type InstitutionRow = { is_published: boolean };
type ProgramRow = { id: string };
type SourceRow = { id: string };

function createServiceClient(url: string, secretKey: string) {
  return createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

type ServiceClient = ReturnType<typeof createServiceClient>;

function getRequiredEnvironmentValue(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required. Keep it in .env.local and never commit it.`);
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === "string" && allowed.includes(value as T);
}

function parseRows<T>(value: unknown, label: string, parse: (item: Record<string, unknown>) => T): T[] {
  if (!Array.isArray(value)) throw new Error(`${label} did not return an array.`);
  return value.map((item, index) => {
    if (!isRecord(item)) throw new Error(`${label}[${index}] has an invalid shape.`);
    return parse(item);
  });
}

function parseSingleRow<T>(value: unknown, label: string, parse: (item: Record<string, unknown>) => T): T {
  const rows = parseRows(value, label, parse);
  if (rows.length !== 1) throw new Error(`${label} must return exactly one row.`);
  return rows[0];
}

function getBatchKey(): string | null {
  const argument = process.argv.find((value) => value.startsWith("--batch="));
  if (!argument) return null;
  const batchKey = argument.slice("--batch=".length).trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9:_-]{2,79}$/.test(batchKey)) {
    throw new Error("--batch must use lowercase letters, numbers, colons, underscores or hyphens.");
  }
  return batchKey;
}

function isDryRun(): boolean {
  return process.argv.includes("--dry-run");
}

function createProgramSourceRecordKey(recordKey: string): string {
  const fingerprint = createHash("sha256").update(recordKey).digest("hex").slice(0, 48);
  return `program:${fingerprint}`;
}

function parseCandidate(value: Record<string, unknown>): CandidateRow {
  const requiredTextKeys = [
    "id",
    "institution_id",
    "program_name",
    "degree_name",
    "field_of_study",
    "official_url",
    "record_key",
    "source_title",
    "source_url",
    "source_year",
  ] as const;
  const textValues = Object.fromEntries(requiredTextKeys.map((key) => [key, value[key]]));
  if (Object.values(textValues).some((item) => typeof item !== "string" || !item.trim())) {
    throw new Error("Program candidate has an invalid text field.");
  }
  if (!Array.isArray(value.major_categories) || value.major_categories.some((item) => typeof item !== "string")) {
    throw new Error("Program candidate has invalid major categories.");
  }
  if (!isOneOf(value.source_kind, sourceKindValues)) throw new Error("Program candidate has an invalid source kind.");
  if (value.source_excerpt !== null && value.source_excerpt !== undefined && typeof value.source_excerpt !== "string") {
    throw new Error("Program candidate has an invalid source excerpt.");
  }
  return {
    id: textValues.id as string,
    institution_id: textValues.institution_id as string,
    program_name: textValues.program_name as string,
    degree_name: textValues.degree_name as string,
    field_of_study: textValues.field_of_study as string,
    official_url: textValues.official_url as string,
    record_key: textValues.record_key as string,
    source_title: textValues.source_title as string,
    source_url: textValues.source_url as string,
    source_year: textValues.source_year as string,
    major_categories: value.major_categories.map((category) => category.trim()),
    source_kind: value.source_kind,
    source_excerpt: typeof value.source_excerpt === "string" ? value.source_excerpt : null,
  };
}

async function resolveBatchId(client: ServiceClient, batchKey: string | null): Promise<string | null> {
  if (!batchKey) return null;
  const { data, error } = await client
    .from("undergraduate_program_import_batches")
    .select("id")
    .eq("batch_key", batchKey);
  if (error) throw new Error(`Could not load batch ${batchKey}: ${error.message}`);
  return parseSingleRow(data as unknown, "Batch lookup", (item): BatchRow => {
    if (typeof item.id !== "string") throw new Error("Batch lookup returned an invalid ID.");
    return { id: item.id };
  }).id;
}

async function findOrCreateVerifiedSource(
  client: ServiceClient,
  candidate: CandidateRow,
): Promise<string> {
  const { data: existingData, error: existingError } = await client
    .from("data_sources")
    .select("id")
    .eq("source_url", candidate.source_url)
    .eq("source_year", candidate.source_year)
    .eq("title", candidate.source_title)
    .limit(1);
  if (existingError) throw new Error(`Could not look up ${candidate.source_url}: ${existingError.message}`);
  const existingRows = parseRows(existingData as unknown, "Source lookup", (item): SourceRow => {
    if (typeof item.id !== "string") throw new Error("Source lookup row has an invalid ID.");
    return { id: item.id };
  });
  const existing = existingRows[0];
  if (existing) {
    const { error } = await client
      .from("data_sources")
      .update({ source_excerpt: candidate.source_excerpt, verification_status: "verified" })
      .eq("id", existing.id);
    if (error) throw new Error(`Could not verify existing source ${candidate.source_url}: ${error.message}`);
    return existing.id;
  }

  const { data: sourceData, error: sourceError } = await client
    .from("data_sources")
    .insert({
      source_kind: candidate.source_kind,
      title: candidate.source_title,
      source_url: candidate.source_url,
      source_year: candidate.source_year,
      source_excerpt: candidate.source_excerpt,
      verification_status: "verified",
    })
    .select("id");
  if (sourceError) throw new Error(`Could not create source ${candidate.source_url}: ${sourceError.message}`);
  return parseSingleRow(sourceData as unknown, "Source insert", (item): SourceRow => {
    if (typeof item.id !== "string") throw new Error("Source insert returned an invalid ID.");
    return { id: item.id };
  }).id;
}

async function publishCandidate(client: ServiceClient, candidate: CandidateRow): Promise<void> {
  const { data: institutionData, error: institutionError } = await client
    .from("institutions")
    .select("is_published")
    .eq("id", candidate.institution_id);
  if (institutionError) throw new Error(`Could not read institution for ${candidate.program_name}: ${institutionError.message}`);
  const institution = parseSingleRow(institutionData as unknown, "Institution lookup", (item): InstitutionRow => {
    if (typeof item.is_published !== "boolean") throw new Error("Institution lookup returned an invalid publication state.");
    return { is_published: item.is_published };
  });
  if (!institution.is_published) {
    throw new Error(`${candidate.program_name} cannot publish until its institution is published.`);
  }

  const sourceId = await findOrCreateVerifiedSource(client, candidate);
  const { data: programData, error: programError } = await client
    .from("undergraduate_programs")
    .upsert(
      {
        institution_id: candidate.institution_id,
        program_name: candidate.program_name,
        degree_name: candidate.degree_name,
        field_of_study: candidate.field_of_study,
        major_categories: candidate.major_categories,
        official_url: candidate.official_url,
        is_published: true,
      },
      { onConflict: "institution_id,program_name,degree_name" },
    )
    .select("id");
  if (programError) throw new Error(`Could not publish ${candidate.program_name}: ${programError.message}`);
  const programId = parseSingleRow(programData as unknown, "Program upsert", (item): ProgramRow => {
    if (typeof item.id !== "string") throw new Error("Program upsert returned an invalid ID.");
    return { id: item.id };
  }).id;

  const { error: programSourceError } = await client
    .from("undergraduate_program_sources")
    .upsert(
      {
        program_id: programId,
        source_id: sourceId,
        source_record_key: createProgramSourceRecordKey(candidate.record_key),
        is_primary: true,
      },
      { onConflict: "program_id,source_id,source_record_key" },
    );
  if (programSourceError) throw new Error(`Could not link source for ${candidate.program_name}: ${programSourceError.message}`);

  const { error: statusError } = await client
    .from("undergraduate_program_import_candidates")
    .update({
      review_status: "published",
      published_program_id: programId,
      published_source_id: sourceId,
      published_at: new Date().toISOString(),
    })
    .eq("id", candidate.id)
    .eq("review_status", "approved");
  if (statusError) throw new Error(`Could not mark ${candidate.program_name} as published: ${statusError.message}`);
}

async function main(): Promise<void> {
  const client = createServiceClient(
    getRequiredEnvironmentValue("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnvironmentValue("SUPABASE_SECRET_KEY"),
  );
  const batchId = await resolveBatchId(client, getBatchKey());
  let query = client
    .from("undergraduate_program_import_candidates")
    .select("id, institution_id, program_name, degree_name, field_of_study, major_categories, official_url, record_key, source_kind, source_title, source_url, source_year, source_excerpt")
    .eq("review_status", "approved")
    .order("created_at")
    .limit(5000);
  if (batchId) query = query.eq("batch_id", batchId);
  const { data, error } = await query;
  if (error) throw new Error(`Could not load approved program candidates: ${error.message}`);
  const candidates = parseRows(data as unknown, "Approved program candidates", parseCandidate);

  if (isDryRun()) {
    console.log(`Validated ${candidates.length} approved program candidates for publication.`);
    return;
  }
  for (const candidate of candidates) {
    await publishCandidate(client, candidate);
  }
  console.log(`Published ${candidates.length} reviewed undergraduate programs.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Unknown program publication failure.");
  process.exitCode = 1;
});
