#!/usr/bin/env node
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sql } from "drizzle-orm";
import { allowedDomains, users } from "./schema.ts";

const DEFAULT_ADMIN_EMAIL = "julio@datacracy.co";
const DEFAULT_DOMAINS = ["enesol.ai", "dataforgetechnologies.com", "datacracy.co"];

function parseDomainsEnv(): string[] {
  const raw = process.env.SEED_DOMAINS;
  if (!raw) return DEFAULT_DOMAINS;
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0);
}

function domainOfEmail(email: string): string {
  const at = email.lastIndexOf("@");
  if (at === -1) throw new Error(`invalid email: ${email}`);
  return email.slice(at + 1).toLowerCase();
}

export async function seed(): Promise<{ adminEmail: string; domains: string[] }> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Configure it in .env.local (see .env.example) before seeding.",
    );
  }

  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? DEFAULT_ADMIN_EMAIL).trim().toLowerCase();
  const domains = parseDomainsEnv();

  const pool = new Pool({ connectionString: url, max: 1 });
  const db = drizzle(pool);

  try {
    for (const domain of domains) {
      await db
        .insert(allowedDomains)
        .values({ domain, addedBy: "seed" })
        .onConflictDoNothing({ target: allowedDomains.domain });
    }

    const organization = domainOfEmail(adminEmail);
    await db
      .insert(users)
      .values({
        email: adminEmail,
        name: "Julio Martinez",
        organization,
        role: "admin",
      })
      .onConflictDoUpdate({
        target: users.email,
        set: { role: sql`EXCLUDED.role` },
      });

    return { adminEmail, domains };
  } finally {
    await pool.end();
  }
}

async function main() {
  const result = await seed();
  console.log("seed complete");
  console.log(`  admin:   ${result.adminEmail}`);
  console.log(`  domains: ${result.domains.join(", ")}`);
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  main().catch((err) => {
    console.error("seed failed:", err);
    process.exit(1);
  });
}
