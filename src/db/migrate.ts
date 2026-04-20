#!/usr/bin/env node
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

export async function runMigrations(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Configure it in .env.local (see .env.example) before running migrations.",
    );
  }

  const here = dirname(fileURLToPath(import.meta.url));
  const migrationsFolder = resolve(here, "..", "..", "drizzle");

  const pool = new Pool({ connectionString: url, max: 1 });
  const dbInstance = drizzle(pool);

  try {
    await migrate(dbInstance, { migrationsFolder });
  } finally {
    await pool.end();
  }
}

async function main() {
  const start = Date.now();
  console.log("running migrations...");
  await runMigrations();
  console.log(`migrations complete in ${Date.now() - start}ms`);
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  main().catch((err) => {
    console.error("migration failed:", err);
    process.exit(1);
  });
}
