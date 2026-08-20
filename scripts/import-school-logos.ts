import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const outputDirectory = path.join(process.cwd(), "public", "school-logos");
const manifestPath = path.join(outputDirectory, "manifest.json");
const userAgent = "MyGradPath/1.0 (+https://github.com/KoKo-LI/my-grad-app)";
const fetchTimeoutMs = 3_500;
const maximumAssetBytes = 2 * 1024 * 1024;
const workerCount = 6;

type AssetSource = "official-favicon" | "generated-fallback";

interface InstitutionRow {
  ipedsUnitId: string;
  name: string;
  officialWebsite: string;
  shortName: string;
}

interface LogoManifestEntry {
  asset: string;
  id: string;
  name: string;
  source: AssetSource;
}

function getRequiredEnvironmentValue(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseInstitution(value: unknown): InstitutionRow | null {
  if (!isRecord(value)) return null;

  const ipedsUnitId = readText(value.ipeds_unitid);
  const name = readText(value.name);
  const shortName = readText(value.short_name);
  const officialWebsite = readText(value.official_website);
  if (!ipedsUnitId || !name || !shortName || !officialWebsite) return null;

  try {
    const url = new URL(officialWebsite);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  } catch {
    return null;
  }

  return { ipedsUnitId, name, officialWebsite, shortName };
}

function safeAssetId(value: string) {
  if (!/^[A-Za-z0-9-]{1,80}$/.test(value)) {
    throw new Error(`Unsafe institution asset ID: ${value}`);
  }

  return value;
}

async function fetchWithTimeout(url: URL, accept: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), fetchTimeoutMs);

  try {
    const response = await fetch(url, {
      headers: { Accept: accept, "User-Agent": userAgent },
      redirect: "follow",
      signal: controller.signal,
    });
    const contentLength = Number(response.headers.get("content-length"));
    if (!response.ok || (Number.isFinite(contentLength) && contentLength > maximumAssetBytes)) return null;

    const payload = new Uint8Array(await response.arrayBuffer());
    if (payload.byteLength === 0 || payload.byteLength > maximumAssetBytes) return null;

    return { contentType: response.headers.get("content-type")?.toLowerCase() ?? "", payload };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function readAttribute(tag: string, name: string) {
  const match = new RegExp(`\\b${name}\\s*=\\s*[\"']([^\"']+)[\"']`, "i").exec(tag);
  return match?.[1]?.trim() ?? null;
}

async function writeAsWebp(payload: Uint8Array, assetPath: string) {
  try {
    await sharp(payload, { animated: false, failOn: "none" })
      .resize(128, 128, { background: { alpha: 0, b: 255, g: 255, r: 255 }, fit: "contain" })
      .webp({ quality: 90 })
      .toFile(assetPath);
    return true;
  } catch {
    return false;
  }
}

async function writeOfficialIcon(officialWebsite: string, assetPath: string) {
  const homeUrl = new URL(officialWebsite);
  const rootFaviconUrl = new URL("/favicon.ico", homeUrl);
  const rootIcon = await fetchWithTimeout(rootFaviconUrl, "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8");
  if (rootIcon && rootIcon.contentType.startsWith("image/") && await writeAsWebp(rootIcon.payload, assetPath)) {
    return true;
  }

  const homepage = await fetchWithTimeout(homeUrl, "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1");
  if (!homepage || !homepage.contentType.includes("html")) return false;

  const html = new TextDecoder().decode(homepage.payload);
  const tags = html.match(/<link\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const relationship = readAttribute(tag, "rel")?.toLocaleLowerCase() ?? "";
    const href = readAttribute(tag, "href");
    if (!href || !relationship.includes("icon")) continue;

    try {
      const icon = await fetchWithTimeout(new URL(href, homeUrl), "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8");
      if (icon && icon.contentType.startsWith("image/") && await writeAsWebp(icon.payload, assetPath)) return true;
    } catch {
      // Try the remaining page-declared icons.
    }
  }

  return false;
}

function createFallbackSvg(institution: InstitutionRow) {
  const label = institution.shortName.slice(0, 4).replace(/[<&>\"']/g, "");
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="28" fill="#18181b"/><path d="M64 18 104 36v26c0 25-16 40-40 50C40 102 24 87 24 62V36z" fill="#8b5cf6" opacity=".3"/><text x="64" y="72" fill="#fff" font-family="Arial,sans-serif" font-size="29" font-weight="700" text-anchor="middle">${label}</text></svg>`);
}

async function writeLogo(institution: InstitutionRow) {
  const assetId = safeAssetId(institution.ipedsUnitId);
  const assetPath = path.join(outputDirectory, `${assetId}.webp`);
  const importedOfficialIcon = await writeOfficialIcon(institution.officialWebsite, assetPath);
  const source: AssetSource = importedOfficialIcon ? "official-favicon" : "generated-fallback";
  if (!importedOfficialIcon && !await writeAsWebp(createFallbackSvg(institution), assetPath)) {
    throw new Error(`Could not generate fallback identity for ${institution.ipedsUnitId}.`);
  }

  return { asset: `/school-logos/${assetId}.webp`, id: assetId, name: institution.name, source } satisfies LogoManifestEntry;
}

async function withWorkerPool<T, R>(items: readonly T[], worker: (item: T) => Promise<R>) {
  const results: R[] = [];
  let cursor = 0;

  async function next() {
    while (cursor < items.length) {
      const currentIndex = cursor;
      cursor += 1;
      results[currentIndex] = await worker(items[currentIndex]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(workerCount, items.length) }, () => next()));
  return results;
}

async function main() {
  const client = createClient(
    getRequiredEnvironmentValue("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnvironmentValue("SUPABASE_SECRET_KEY"),
    { auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false } },
  );
  const { data, error } = await client
    .from("institutions")
    .select("ipeds_unitid, name, official_website, short_name")
    .eq("is_published", true)
    .order("ipeds_unitid");

  if (error) throw new Error(`Could not load published institutions: ${error.message}`);

  const institutions = (data ?? []).map(parseInstitution).filter((institution): institution is InstitutionRow => institution !== null);
  if (institutions.length === 0) throw new Error("No published institutions are available for logo import.");

  await mkdir(outputDirectory, { recursive: true });
  const oldEntries = await readdir(outputDirectory, { withFileTypes: true });
  await Promise.all(oldEntries.filter((entry) => entry.isFile()).map((entry) => rm(path.join(outputDirectory, entry.name))));

  const manifest = await withWorkerPool(institutions, (institution) => writeLogo(institution));
  await writeFile(manifestPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), logos: manifest }, null, 2)}\n`, "utf8");

  const officialCount = manifest.filter((entry) => entry.source === "official-favicon").length;
  console.log(`Imported ${manifest.length} local school logos (${officialCount} official site icons, ${manifest.length - officialCount} generated fallbacks).`);
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "School logo import failed.");
  process.exitCode = 1;
});
