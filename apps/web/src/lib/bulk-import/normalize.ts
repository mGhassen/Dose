/** Normalize CSV/XLSX header keys to camelCase (snake_case or spaces). */
export function rowKeysToCamel<T extends Record<string, unknown>>(row: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    const key = k.trim();
    if (!key) continue;
    const camel = key
      .replace(/\s+/g, "_")
      .split("_")
      .filter(Boolean)
      .map((part, i) => (i === 0 ? part.toLowerCase() : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()))
      .join("");
    out[camel] = v;
  }
  return out;
}

export function parseBool(v: unknown): boolean | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  if (typeof v === "boolean") return v;
  const s = String(v).trim().toLowerCase();
  if (s === "true" || s === "1" || s === "yes") return true;
  if (s === "false" || s === "0" || s === "no") return false;
  return undefined;
}

export function parseNumber(v: unknown): number | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const s = String(v).trim().replace(/\u00a0/g, " ").replace(/\s+/g, "").replace(",", ".");
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

export function parseString(v: unknown): string | undefined {
  if (v === null || v === undefined) return undefined;
  const s = String(v).trim();
  return s === "" ? undefined : s;
}

export function parseIntMaybe(v: unknown): number | undefined {
  const n = parseNumber(v);
  if (n === undefined) return undefined;
  return Math.round(n);
}
