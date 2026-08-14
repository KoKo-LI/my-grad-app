import type { SchoolMatchInput } from "@/types";

function getString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getNumber(value: unknown) {
  const numericValue = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(numericValue) ? numericValue : null;
}

function getStringArray(value: unknown) {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
    ? value.map((item) => item.trim()).filter(Boolean)
    : null;
}

function toSchoolMatchInput(value: unknown): SchoolMatchInput | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const id = getString(record.id);
  const name = getString(record.name);
  const shortName = getString(record.short_name);
  const program = getString(record.program);
  const region = getString(record.region);
  const deadline = getString(record.deadline);
  const majorCategories = getStringArray(record.major_categories);
  const medianGpa = getNumber(record.median_gpa);
  const minimumToefl = record.minimum_toefl === null ? null : getNumber(record.minimum_toefl);
  const minimumIelts = record.minimum_ielts === null ? null : getNumber(record.minimum_ielts);

  if (!id || !name || !shortName || !program || !region || !deadline || !majorCategories || medianGpa === null) {
    return null;
  }

  if (record.minimum_toefl !== null && record.minimum_toefl !== undefined && minimumToefl === null) {
    return null;
  }

  if (record.minimum_ielts !== null && record.minimum_ielts !== undefined && minimumIelts === null) {
    return null;
  }

  return {
    id,
    name,
    shortName,
    program,
    region,
    deadline,
    majorCategories,
    medianGpa,
    ...(minimumToefl === null ? {} : { minimumToefl }),
    ...(minimumIelts === null ? {} : { minimumIelts }),
  };
}

/** Safely converts the public API response into catalog entries used by the matching engine. */
export function parseUndergraduateCatalog(value: unknown) {
  if (!value || typeof value !== "object" || !("data" in value)) {
    return [];
  }

  const data = (value as Record<string, unknown>).data;
  return Array.isArray(data)
    ? data.map(toSchoolMatchInput).filter((item): item is SchoolMatchInput => item !== null)
    : [];
}
