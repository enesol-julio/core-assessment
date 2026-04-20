import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema.ts";

const globalForDb = globalThis as unknown as {
  __corePgPool?: Pool;
};

function makePool(): Pool {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Configure it in .env.local (see .env.example) before using the database client.",
    );
  }
  return new Pool({ connectionString: url, max: 10 });
}

export function getPool(): Pool {
  if (!globalForDb.__corePgPool) {
    globalForDb.__corePgPool = makePool();
  }
  return globalForDb.__corePgPool;
}

export const db: NodePgDatabase<typeof schema> = drizzle(getPool(), { schema });

export { schema };
