import process from "node:process";
import { inflateRawSync } from "node:zlib";
import { createClient } from "@supabase/supabase-js";

type RawRecord = Record<string, unknown>;

type ResolvedQueueRow = {
  institutionId: string;
  institutionName: string;
};

type QsRankingEntry = {
  rankDisplay: string;
  rankValue: number;
  sourceName: string;
};

type RankingUpsert = {
  edition: string;
  institution_id: string;
  is_published: boolean;
  rank_display: string;
  rank_value: number;
  ranking_key: "qs_world_university_rankings";
  source_id: string;
};

type WorksheetRow = Map<number, string | number | null>;

const collectionKey = "usnews-national-universities-2026";
const sourceTitle = "QS World University Rankings 2027";
const sourceUrl = "https://www.topuniversities.com/qs-top-uni-wur";
const sourceDownloadUrl = "https://insights.qs.com/hubfs/Rankings%20Excel%20Reports/2027%20QS%20World%20University%20Rankings%201.1%20%28For%20qs.com%29.xlsx";
const sourceYear = "2027";
const sourcePublishedAt = "2026-06-18";
const edition = "QS World University Rankings 2027";
const maximumWorkbookBytes = 4 * 1024 * 1024;
const maximumEntryBytes = 20 * 1024 * 1024;

const knownRosterAliases = new Map<string, string>([
  ["Pennsylvania State University", "The Pennsylvania State University--University Park"],
  ["Purdue University", "Purdue University--Main Campus"],
  ["Stony Brook University, State University of New York", "Stony Brook University--SUNY"],
  ["University of Texas at Austin", "The University of Texas--Austin"],
  ["Tulane University", "Tulane University of Louisiana"],
  ["University at Buffalo SUNY", "University at Buffalo--SUNY"],
  ["University of North Carolina at Chapel Hill", "University of North Carolina--Chapel Hill"],
  ["Virginia Polytechnic Institute and State University", "Virginia Tech"],
]);

function isRecord(value: unknown): value is RawRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getRequiredEnvironmentValue(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required. Keep it in .env.local and never commit it.`);
  }
  return value;
}

function isValidateOnly(): boolean {
  return process.argv.includes("--validate-only");
}

function getWorkbookUrl(): string {
  const inputArgument = process.argv.find((argument) => argument.startsWith("--source-url="));
  return inputArgument ? inputArgument.slice("--source-url=".length).trim() : sourceDownloadUrl;
}

function normalizeInstitutionName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-US")
    .replace(/\([^)]*\)/g, " ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\bthe\b/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function readText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readRank(value: unknown): number | null {
  const rank = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isInteger(rank) && rank > 0 && rank <= 10000 ? rank : null;
}

function parseResolvedQueueRows(value: unknown): ResolvedQueueRow[] {
  if (!Array.isArray(value)) {
    throw new Error("The resolved coverage queue response has an invalid shape.");
  }

  return value.map((item, index) => {
    if (!isRecord(item) || typeof item.institution_name !== "string" || typeof item.resolved_institution_id !== "string") {
      throw new Error(`Resolved queue row ${index + 1} is incomplete.`);
    }
    return { institutionId: item.resolved_institution_id, institutionName: item.institution_name };
  });
}

function parseSourceId(value: unknown): string {
  if (!isRecord(value) || typeof value.id !== "string") {
    throw new Error("The ranking source write did not return an ID.");
  }
  return value.id;
}

function parseOptionalSourceId(value: unknown): string | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  return parseSourceId(value[0]);
}

function assertRange(buffer: Buffer, offset: number, length: number, label: string): void {
  if (!Number.isInteger(offset) || !Number.isInteger(length) || offset < 0 || length < 0 || offset + length > buffer.length) {
    throw new Error(`QS workbook contains an invalid ${label} range.`);
  }
}

function findEndOfCentralDirectory(buffer: Buffer): number {
  const minimumOffset = Math.max(0, buffer.length - 65_557);
  for (let offset = buffer.length - 22; offset >= minimumOffset; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) return offset;
  }
  throw new Error("QS workbook is missing the ZIP central directory.");
}

function readZipEntry(buffer: Buffer, targetPath: string): Buffer {
  const endOffset = findEndOfCentralDirectory(buffer);
  assertRange(buffer, endOffset, 22, "central directory");
  const directorySize = buffer.readUInt32LE(endOffset + 12);
  let directoryOffset = buffer.readUInt32LE(endOffset + 16);
  const directoryEnd = directoryOffset + directorySize;
  assertRange(buffer, directoryOffset, directorySize, "central directory");

  while (directoryOffset < directoryEnd) {
    assertRange(buffer, directoryOffset, 46, "central directory entry");
    if (buffer.readUInt32LE(directoryOffset) !== 0x02014b50) {
      throw new Error("QS workbook contains an unsupported ZIP directory entry.");
    }
    const compressionMethod = buffer.readUInt16LE(directoryOffset + 10);
    const compressedSize = buffer.readUInt32LE(directoryOffset + 20);
    const uncompressedSize = buffer.readUInt32LE(directoryOffset + 24);
    const nameLength = buffer.readUInt16LE(directoryOffset + 28);
    const extraLength = buffer.readUInt16LE(directoryOffset + 30);
    const commentLength = buffer.readUInt16LE(directoryOffset + 32);
    const localHeaderOffset = buffer.readUInt32LE(directoryOffset + 42);
    const entryLength = 46 + nameLength + extraLength + commentLength;
    assertRange(buffer, directoryOffset, entryLength, "central directory entry");
    const entryPath = buffer.toString("utf8", directoryOffset + 46, directoryOffset + 46 + nameLength);

    if (entryPath === targetPath) {
      if (uncompressedSize > maximumEntryBytes || compressedSize > maximumEntryBytes) {
        throw new Error(`QS workbook entry ${targetPath} exceeds the 20 MB safety limit.`);
      }
      assertRange(buffer, localHeaderOffset, 30, "local file header");
      if (buffer.readUInt32LE(localHeaderOffset) !== 0x04034b50) {
        throw new Error(`QS workbook entry ${targetPath} has an invalid local header.`);
      }
      const localNameLength = buffer.readUInt16LE(localHeaderOffset + 26);
      const localExtraLength = buffer.readUInt16LE(localHeaderOffset + 28);
      const dataOffset = localHeaderOffset + 30 + localNameLength + localExtraLength;
      assertRange(buffer, dataOffset, compressedSize, "compressed entry");
      const compressed = buffer.subarray(dataOffset, dataOffset + compressedSize);
      const output = compressionMethod === 0
        ? Buffer.from(compressed)
        : compressionMethod === 8
          ? inflateRawSync(compressed, { maxOutputLength: maximumEntryBytes })
          : null;
      if (!output || output.length !== uncompressedSize) {
        throw new Error(`QS workbook entry ${targetPath} could not be safely decompressed.`);
      }
      return output;
    }
    directoryOffset += entryLength;
  }

  throw new Error(`QS workbook does not contain ${targetPath}.`);
}

function decodeXmlText(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#x([0-9a-f]+);/gi, (_match, codePoint: string) => String.fromCodePoint(Number.parseInt(codePoint, 16)))
    .replace(/&#(\d+);/g, (_match, codePoint: string) => String.fromCodePoint(Number.parseInt(codePoint, 10)))
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function readXmlCellText(value: string): string {
  return Array.from(value.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g))
    .map((match) => decodeXmlText(match[1]))
    .join("");
}

function getXmlAttribute(openingTag: string, name: string): string | null {
  const match = new RegExp(`\\b${name}="([^"]*)"`).exec(openingTag);
  return match ? decodeXmlText(match[1]) : null;
}

function spreadsheetColumnToIndex(reference: string): number | null {
  const match = /^([A-Z]+)\d+$/i.exec(reference);
  if (!match) return null;
  return match[1].toUpperCase().split("").reduce((value, character) => value * 26 + character.charCodeAt(0) - 64, 0) - 1;
}

function parseSharedStrings(workbookBuffer: Buffer): string[] {
  let xml: string;
  try {
    xml = readZipEntry(workbookBuffer, "xl/sharedStrings.xml").toString("utf8");
  } catch {
    return [];
  }
  return Array.from(xml.matchAll(/<si>([\s\S]*?)<\/si>/g)).map((match) => readXmlCellText(match[1]));
}

function parseWorksheetRows(workbookBuffer: Buffer, sharedStrings: string[]): WorksheetRow[] {
  const xml = readZipEntry(workbookBuffer, "xl/worksheets/sheet1.xml").toString("utf8");
  const rows: WorksheetRow[] = [];
  for (const rowMatch of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const row = new Map<number, string | number | null>();
    for (const cellMatch of rowMatch[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const reference = getXmlAttribute(cellMatch[1], "r");
      const columnIndex = reference ? spreadsheetColumnToIndex(reference) : null;
      if (columnIndex === null) continue;
      const cellType = getXmlAttribute(cellMatch[1], "t");
      const rawValue = /<v>([\s\S]*?)<\/v>/.exec(cellMatch[2])?.[1] ?? null;
      if (cellType === "s" && rawValue !== null) {
        const sharedString = sharedStrings[Number(rawValue)];
        row.set(columnIndex, sharedString ?? null);
      } else if (cellType === "inlineStr") {
        row.set(columnIndex, readXmlCellText(cellMatch[2]));
      } else if (rawValue !== null) {
        const numericValue = Number(rawValue);
        row.set(columnIndex, Number.isFinite(numericValue) ? numericValue : decodeXmlText(rawValue));
      } else {
        row.set(columnIndex, null);
      }
    }
    rows.push(row);
  }
  return rows;
}

function findHeaderRow(rows: WorksheetRow[]): { columns: Map<string, number>; rowIndex: number } {
  const headerRowIndex = rows.findIndex((row) => {
    const headers = Array.from(row.values());
    return headers.includes("Rank") && headers.includes("Name") && headers.includes("Country/Territory");
  });
  if (headerRowIndex < 0) {
    throw new Error("The QS workbook does not include the expected Rank, Name and Country/Territory headers.");
  }

  const columns = new Map<string, number>();
  rows[headerRowIndex].forEach((cell, index) => {
    const header = readText(cell);
    if (header) columns.set(header, index);
  });

  if (!columns.has("Rank") || !columns.has("Name") || !columns.has("Country/Territory")) {
    throw new Error("The QS workbook has incomplete required headers.");
  }
  return { columns, rowIndex: headerRowIndex };
}

function parseQsRankingEntries(workbookBuffer: Buffer): QsRankingEntry[] {
  const rows = parseWorksheetRows(workbookBuffer, parseSharedStrings(workbookBuffer));
  const { columns, rowIndex } = findHeaderRow(rows);
  const rankColumn = columns.get("Rank");
  const nameColumn = columns.get("Name");
  const countryColumn = columns.get("Country/Territory");
  if (rankColumn === undefined || nameColumn === undefined || countryColumn === undefined) {
    throw new Error("The QS workbook column map is invalid.");
  }

  const rawEntries = rows.slice(rowIndex + 1).flatMap((row): Array<{ rankValue: number; sourceName: string }> => {
    const country = readText(row.get(countryColumn));
    const sourceName = readText(row.get(nameColumn));
    const rankValue = readRank(row.get(rankColumn));
    return country === "United States of America" && sourceName && rankValue ? [{ rankValue, sourceName }] : [];
  });
  const countByRank = new Map<number, number>();
  rawEntries.forEach(({ rankValue }) => countByRank.set(rankValue, (countByRank.get(rankValue) ?? 0) + 1));

  return rawEntries.map(({ rankValue, sourceName }) => ({
    rankDisplay: countByRank.get(rankValue) === 1 ? `#${rankValue}` : `#=${rankValue}`,
    rankValue,
    sourceName,
  }));
}

function resolveEntries(entries: QsRankingEntry[], queueRows: ResolvedQueueRow[]) {
  const queueByName = new Map<string, ResolvedQueueRow>();
  queueRows.forEach((row) => queueByName.set(normalizeInstitutionName(row.institutionName), row));
  const unresolved: string[] = [];
  const resolved: Array<QsRankingEntry & { institutionId: string }> = [];

  entries.forEach((entry) => {
    const aliasTarget = knownRosterAliases.get(entry.sourceName) ?? entry.sourceName;
    const queueRow = queueByName.get(normalizeInstitutionName(aliasTarget));
    if (!queueRow) {
      unresolved.push(entry.sourceName);
      return;
    }
    resolved.push({ ...entry, institutionId: queueRow.institutionId });
  });

  return { resolved, unresolved };
}

async function loadQsWorkbook(): Promise<Buffer> {
  const response = await fetch(getWorkbookUrl(), { headers: { Accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" } });
  if (!response.ok) {
    throw new Error(`QS workbook download failed with HTTP ${response.status}.`);
  }
  const declaredSize = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredSize) && declaredSize > maximumWorkbookBytes) {
    throw new Error("QS workbook exceeds the 4 MB download safety limit.");
  }
  const workbook = Buffer.from(await response.arrayBuffer());
  if (workbook.length > maximumWorkbookBytes) {
    throw new Error("QS workbook exceeds the 4 MB download safety limit.");
  }
  return workbook;
}

async function main(): Promise<void> {
  const [workbookBuffer, supabaseUrl, secretKey] = await Promise.all([
    loadQsWorkbook(),
    Promise.resolve(getRequiredEnvironmentValue("NEXT_PUBLIC_SUPABASE_URL")),
    Promise.resolve(getRequiredEnvironmentValue("SUPABASE_SECRET_KEY")),
  ]);
  const client = createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  });
  const { data: queueData, error: queueError } = await client
    .from("institution_intake_queue")
    .select("institution_name, resolved_institution_id")
    .eq("collection_key", collectionKey)
    .in("review_status", ["resolved", "verified"]);
  if (queueError) {
    throw new Error(`Could not read the resolved U.S. coverage queue: ${queueError.message}`);
  }

  const entries = parseQsRankingEntries(workbookBuffer);
  const { resolved, unresolved } = resolveEntries(entries, parseResolvedQueueRows(queueData as unknown));
  const uniqueInstitutionIds = new Set(resolved.map((entry) => entry.institutionId));

  console.log(`QS parsed ${entries.length} U.S. rows; matched ${resolved.length} rows across ${uniqueInstitutionIds.size} resolved catalog institutions.`);
  if (unresolved.length > 0) {
    console.log(`Skipped ${unresolved.length} U.S. rows outside the current 101-school roster: ${unresolved.join("; ")}`);
  }
  if (isValidateOnly()) return;

  const { data: existingSourceData, error: existingSourceError } = await client
    .from("data_sources")
    .select("id")
    .eq("source_kind", "ranking")
    .eq("title", sourceTitle)
    .eq("source_url", sourceUrl)
    .eq("source_year", sourceYear)
    .limit(1);
  if (existingSourceError) {
    throw new Error(`Could not check the QS source. Run the institution rankings migration first: ${existingSourceError.message}`);
  }

  let sourceId = parseOptionalSourceId(existingSourceData as unknown);
  if (!sourceId) {
    const { data: sourceData, error: sourceError } = await client
      .from("data_sources")
      .insert({
        published_at: sourcePublishedAt,
        source_kind: "ranking",
        source_url: sourceUrl,
        source_year: sourceYear,
        title: sourceTitle,
        verification_status: "verified",
      })
      .select("id")
      .single();
    if (sourceError) throw new Error(`Could not create the QS source: ${sourceError.message}`);
    sourceId = parseSourceId(sourceData as unknown);
  }

  const rows: RankingUpsert[] = resolved.map((entry) => ({
    edition,
    institution_id: entry.institutionId,
    is_published: true,
    rank_display: entry.rankDisplay,
    rank_value: entry.rankValue,
    ranking_key: "qs_world_university_rankings",
    source_id: sourceId,
  }));
  const { error: rankingError } = await client
    .from("institution_rankings")
    .upsert(rows, { onConflict: "institution_id,source_id,ranking_key" });
  if (rankingError) {
    throw new Error(`Could not publish QS ranking rows: ${rankingError.message}`);
  }

  console.log(`Published ${rows.length} QS World University Rankings 2027 rows from the official QS workbook.`);
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown QS ranking import failure.";
  console.error(message);
  process.exitCode = 1;
});
