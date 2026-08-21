import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

const defaultInputPath = "data/intake/undergraduate-program-intake.json";
const sourceKindValues = ["official_program", "official_institution", "IPEDS", "CDS", "licensed_partner"] as const;

type SourceKind = (typeof sourceKindValues)[number];

type ProgramInput = {
  degreeName: string;
  fieldOfStudy: string;
  majorCategories: string[];
  officialUrl: string;
  programName: string;
};

type SourceInput = {
  rightsNote: string | null;
  sourceExcerpt: string | null;
  sourceKind: SourceKind;
  sourceTitle: string;
  sourceUrl: string;
  sourceYear: string;
};

type CandidateInput = {
  institutionIpedsUnitId: string;
  program: ProgramInput;
  recordKey: string;
  source: SourceInput;
};

type InputDocument = {
  batch: { batchKey: string; label: string };
  records: CandidateInput[];
};

type InstitutionRow = {
  id: string;
  ipeds_unitid: string;
};

type BatchRow = {
  id: string;
};

type CandidateUpsert = {
  batch_id: string;
  degree_name: string;
  field_of_study: string;
  institution_id: string;
  institution_ipeds_unitid: string;
  major_categories: string[];
  official_url: string;
  program_name: string;
  record_key: string;
  rights_note: string | null;
  source_excerpt: string | null;
  source_kind: SourceKind;
  source_title: string;
  source_url: string;
  source_year: string;
};

function getInputPath(): string {
  const argument = process.argv.find((value) => value.startsWith("--input="));
  return argument ? argument.slice("--input=".length) : defaultInputPath;
}

function isValidateOnly(): boolean {
  return process.argv.includes("--validate-only");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === "string" && allowed.includes(value as T);
}

function parseText(value: unknown, label: string, minimumLength = 1, maximumLength = 500): string {
  if (typeof value !== "string") throw new Error(`${label} must be a string.`);
  const normalized = value.trim().replace(/\s+/g, " ");
  if (normalized.length < minimumLength || normalized.length > maximumLength) {
    throw new Error(`${label} must contain ${minimumLength}-${maximumLength} characters.`);
  }
  return normalized;
}

function parseOptionalText(value: unknown, label: string, maximumLength: number): string | null {
  if (value === null || value === undefined || value === "") return null;
  return parseText(value, label, 1, maximumLength);
}

function parseHttpUrl(value: unknown, label: string): string {
  const parsed = new URL(parseText(value, label));
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error(`${label} must use http or https.`);
  }
  return parsed.toString();
}

function parseRecordKey(value: unknown, label: string): string {
  const key = parseText(value, label, 3, 159).toLowerCase();
  if (!/^[a-z0-9][a-z0-9:_-]{2,159}$/.test(key)) {
    throw new Error(`${label} must use lowercase letters, numbers, colons, underscores or hyphens.`);
  }
  return key;
}

function parseInstitutionIdentifier(value: unknown, label: string): string {
  const identifier = parseText(value, label, 3, 80).toUpperCase();
  if (!/^(?:\d{1,10}|[A-Z]{2}-[A-Z0-9-]{2,62})$/.test(identifier)) {
    throw new Error(`${label} must be an IPEDS UNITID or a stable international catalog ID.`);
  }
  return identifier;
}

function parseMajorCategories(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 12) {
    throw new Error(`${label} must contain 1-12 category labels.`);
  }
  const categories = value.map((item, index) => parseText(item, `${label}[${index}]`, 2, 80));
  if (new Set(categories).size !== categories.length) {
    throw new Error(`${label} must not repeat a category.`);
  }
  return categories;
}

function parseProgram(value: unknown, label: string): ProgramInput {
  if (!isRecord(value)) throw new Error(`${label} must be an object.`);
  return {
    programName: parseText(value.programName, `${label}.programName`, 2, 200),
    degreeName: parseText(value.degreeName, `${label}.degreeName`, 2, 100),
    fieldOfStudy: parseText(value.fieldOfStudy, `${label}.fieldOfStudy`, 2, 120),
    majorCategories: parseMajorCategories(value.majorCategories, `${label}.majorCategories`),
    officialUrl: parseHttpUrl(value.officialUrl, `${label}.officialUrl`),
  };
}

function parseSource(value: unknown, label: string): SourceInput {
  if (!isRecord(value) || !isOneOf(value.sourceKind, sourceKindValues)) {
    throw new Error(`${label}.sourceKind must be an official, government, CDS or licensed source type.`);
  }
  return {
    sourceKind: value.sourceKind,
    sourceTitle: parseText(value.sourceTitle, `${label}.sourceTitle`, 3, 240),
    sourceUrl: parseHttpUrl(value.sourceUrl, `${label}.sourceUrl`),
    sourceYear: parseText(value.sourceYear, `${label}.sourceYear`, 4, 40),
    sourceExcerpt: parseOptionalText(value.sourceExcerpt, `${label}.sourceExcerpt`, 600),
    rightsNote: parseOptionalText(value.rightsNote, `${label}.rightsNote`, 300),
  };
}

function parseInputDocument(value: unknown): InputDocument {
  if (!isRecord(value) || !isRecord(value.batch) || !Array.isArray(value.records) || value.records.length === 0) {
    throw new Error("Input must contain a batch object and a non-empty records array.");
  }
  if (value.records.length > 5000) throw new Error("Input exceeds the 5,000-record safety limit.");

  const batch = {
    batchKey: parseRecordKey(value.batch.batchKey, "batch.batchKey"),
    label: parseText(value.batch.label, "batch.label", 3, 200),
  };
  const records = value.records.map((item, index) => {
    const label = `records[${index}]`;
    if (!isRecord(item)) throw new Error(`${label} must be an object.`);
    return {
      recordKey: parseRecordKey(item.recordKey, `${label}.recordKey`),
      institutionIpedsUnitId: parseInstitutionIdentifier(item.institutionIpedsUnitId, `${label}.institutionIpedsUnitId`),
      program: parseProgram(item.program, `${label}.program`),
      source: parseSource(item.source, `${label}.source`),
    };
  });

  if (new Set(records.map((record) => record.recordKey)).size !== records.length) {
    throw new Error("records must not repeat recordKey values within a batch.");
  }
  return { batch, records };
}

function getRequiredEnvironmentValue(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required. Keep it in .env.local and never commit it.`);
  return value;
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

async function main(): Promise<void> {
  const inputPath = getInputPath();
  const input = parseInputDocument(JSON.parse(await readFile(path.resolve(process.cwd(), inputPath), "utf8")) as unknown);

  if (isValidateOnly()) {
    console.log(`Validated ${input.records.length} program candidates in batch ${input.batch.batchKey}.`);
    return;
  }

  const client = createClient(
    getRequiredEnvironmentValue("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnvironmentValue("SUPABASE_SECRET_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } },
  );

  const { data: batchData, error: batchError } = await client
    .from("undergraduate_program_import_batches")
    .upsert(
      { batch_key: input.batch.batchKey, label: input.batch.label, input_record_count: input.records.length },
      { onConflict: "batch_key" },
    )
    .select("id");
  if (batchError) throw new Error(`Could not create import batch: ${batchError.message}`);
  const batch = parseSingleRow(batchData as unknown, "Import batch upsert", (item): BatchRow => {
    if (typeof item.id !== "string") throw new Error("Import batch has an invalid ID.");
    return { id: item.id };
  });

  const identifiers = [...new Set(input.records.map((record) => record.institutionIpedsUnitId))];
  const { data: institutionData, error: institutionError } = await client
    .from("institutions")
    .select("id, ipeds_unitid")
    .in("ipeds_unitid", identifiers);
  if (institutionError) throw new Error(`Could not resolve institutions: ${institutionError.message}`);
  const institutions = parseRows(institutionData as unknown, "Institution lookup", (item): InstitutionRow => {
    if (typeof item.id !== "string" || typeof item.ipeds_unitid !== "string") {
      throw new Error("Institution lookup row has an invalid shape.");
    }
    return { id: item.id, ipeds_unitid: item.ipeds_unitid };
  });
  const institutionIdByIdentifier = new Map(institutions.map((institution) => [institution.ipeds_unitid, institution.id]));
  const missingIdentifiers = identifiers.filter((identifier) => !institutionIdByIdentifier.has(identifier));
  if (missingIdentifiers.length > 0) {
    throw new Error(`No resolved institution exists for: ${missingIdentifiers.join(", ")}.`);
  }

  const candidates: CandidateUpsert[] = input.records.map((record) => {
    const institutionId = institutionIdByIdentifier.get(record.institutionIpedsUnitId);
    if (!institutionId) throw new Error(`Missing institution mapping for ${record.institutionIpedsUnitId}.`);
    return {
      batch_id: batch.id,
      record_key: record.recordKey,
      institution_id: institutionId,
      institution_ipeds_unitid: record.institutionIpedsUnitId,
      program_name: record.program.programName,
      degree_name: record.program.degreeName,
      field_of_study: record.program.fieldOfStudy,
      major_categories: record.program.majorCategories,
      official_url: record.program.officialUrl,
      source_kind: record.source.sourceKind,
      source_title: record.source.sourceTitle,
      source_url: record.source.sourceUrl,
      source_year: record.source.sourceYear,
      source_excerpt: record.source.sourceExcerpt,
      rights_note: record.source.rightsNote,
    };
  });
  const { error: candidateError } = await client
    .from("undergraduate_program_import_candidates")
    .upsert(candidates, { onConflict: "batch_id,record_key" });
  if (candidateError) throw new Error(`Could not queue program candidates: ${candidateError.message}`);

  console.log(`Queued ${candidates.length} private program candidates in batch ${input.batch.batchKey}. Review them in Supabase before publication.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Unknown program intake failure.");
  process.exitCode = 1;
});
