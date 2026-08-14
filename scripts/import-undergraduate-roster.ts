import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

type RosterEntry = {
  name: string;
  rank: number;
};

type IntakeRow = {
  collection_key: string;
  source_publisher: string;
  source_edition: string;
  source_url: string;
  source_rank: number;
  institution_name: string;
};

const collectionKey = "usnews-national-universities-2026";
const sourcePublisher = "U.S. News & World Report";
const sourceEdition = "2026 Best Colleges: National Universities";
const sourceUrl = "https://www.usnews.com/best-colleges/rankings/national-universities";
const defaultInputPath = "data/intake/usnews-national-universities-2026.json";

function getInputPath(): string {
  const argument = process.argv.find((value) => value.startsWith("--input="));
  return argument ? argument.slice("--input=".length) : defaultInputPath;
}

function isValidationOnly(): boolean {
  return process.argv.includes("--validate-only");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseRoster(value: unknown): RosterEntry[] {
  if (!Array.isArray(value)) {
    throw new Error("Roster input must be a JSON array.");
  }

  const seenNames = new Set<string>();
  const entries = value.map((item, index) => {
    if (!isRecord(item) || typeof item.name !== "string" || typeof item.rank !== "number") {
      throw new Error(`Roster entry ${index + 1} must contain a string name and numeric rank.`);
    }

    const name = item.name.trim().replace(/\s+/g, " ");
    const rank = item.rank;

    if (name.length < 2 || name.length > 200 || !Number.isInteger(rank) || rank < 1 || rank > 10000) {
      throw new Error(`Roster entry ${index + 1} is outside the accepted name or rank range.`);
    }

    const dedupeKey = name.toLocaleLowerCase("en-US");
    if (seenNames.has(dedupeKey)) {
      throw new Error(`Roster contains a duplicate institution: ${name}.`);
    }

    seenNames.add(dedupeKey);
    return { name, rank };
  });

  return entries;
}

function getRequiredEnvironmentValue(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required. Keep it in .env.local and never commit it.`);
  }
  return value;
}

async function main(): Promise<void> {
  const inputPath = getInputPath();
  const inputContent = await readFile(path.resolve(process.cwd(), inputPath), "utf8");
  const roster = parseRoster(JSON.parse(inputContent) as unknown);

  if (isValidationOnly()) {
    console.log(`Validated ${roster.length} institution candidates from ${inputPath}.`);
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

  const rows: IntakeRow[] = roster.map((entry) => ({
    collection_key: collectionKey,
    source_publisher: sourcePublisher,
    source_edition: sourceEdition,
    source_url: sourceUrl,
    source_rank: entry.rank,
    institution_name: entry.name,
  }));

  const { data, error } = await client
    .from("institution_intake_queue")
    .upsert(rows, { onConflict: "collection_key,institution_name" })
    .select("id");

  if (error) {
    throw new Error(`Roster import failed: ${error.message}`);
  }

  const { count, error: countError } = await client
    .from("institution_intake_queue")
    .select("*", { count: "exact", head: true })
    .eq("collection_key", collectionKey);

  if (countError) {
    throw new Error(`Roster import completed, but the collection count could not be verified: ${countError.message}`);
  }

  console.log(`Imported ${data.length} institution candidates; ${count ?? 0} rows now exist in ${collectionKey}.`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown roster import failure.";
  console.error(message);
  process.exitCode = 1;
});
