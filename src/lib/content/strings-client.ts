"use client";

export type StringsMap = Record<string, Record<string, string>>;

export function lookupString(
  strings: StringsMap,
  key: string,
  fallback: StringsMap | null = null,
): string {
  const [group, field] = key.split(".");
  if (!group || !field) return key;
  const direct = strings[group]?.[field];
  if (typeof direct === "string") return direct;
  if (fallback) {
    const fb = fallback[group]?.[field];
    if (typeof fb === "string") return fb;
  }
  return key;
}

export function interpolateString(text: string, tokens: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (_, k) => (k in tokens ? String(tokens[k]) : `{${k}}`));
}
