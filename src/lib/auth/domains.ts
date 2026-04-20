import { count, eq } from "drizzle-orm";
import { db } from "@/db/index.ts";
import { allowedDomains, type AllowedDomain } from "@/db/schema.ts";

const DOMAIN_PATTERN = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;

export function normalizeDomain(value: string): string {
  return value.trim().toLowerCase().replace(/^@+/, "");
}

export function validateDomain(value: string): { ok: true; domain: string } | { ok: false; error: string } {
  if (!value || typeof value !== "string") return { ok: false, error: "Domain is required" };
  const d = normalizeDomain(value);
  if (d.length === 0) return { ok: false, error: "Domain is required" };
  if (/\s/.test(d)) return { ok: false, error: "Domain must not contain whitespace" };
  if (d.includes("@")) return { ok: false, error: "Domain must not contain '@'" };
  if (!DOMAIN_PATTERN.test(d)) return { ok: false, error: "Domain format is invalid" };
  return { ok: true, domain: d };
}

export async function listDomains(): Promise<AllowedDomain[]> {
  return db.select().from(allowedDomains).orderBy(allowedDomains.domain);
}

export async function addDomain(domain: string, addedBy: string): Promise<AllowedDomain> {
  const v = validateDomain(domain);
  if (!v.ok) throw new DomainValidationError(v.error);
  const inserted = await db
    .insert(allowedDomains)
    .values({ domain: v.domain, addedBy })
    .onConflictDoNothing({ target: allowedDomains.domain })
    .returning();
  if (inserted.length > 0) return inserted[0];
  const existing = await db
    .select()
    .from(allowedDomains)
    .where(eq(allowedDomains.domain, v.domain))
    .limit(1);
  return existing[0];
}

export async function removeDomain(domain: string): Promise<{ removed: boolean; reason?: string }> {
  const v = validateDomain(domain);
  if (!v.ok) return { removed: false, reason: v.error };
  const [{ value: total }] = await db.select({ value: count() }).from(allowedDomains);
  if (total <= 1) {
    return {
      removed: false,
      reason: "Cannot remove the last allowed domain — at least one must remain.",
    };
  }
  const deleted = await db
    .delete(allowedDomains)
    .where(eq(allowedDomains.domain, v.domain))
    .returning();
  if (deleted.length === 0) return { removed: false, reason: "Domain not found" };
  return { removed: true };
}

export class DomainValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainValidationError";
  }
}
