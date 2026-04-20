export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NODE_ENV !== "development") return;
  if (!process.env.DATABASE_URL) {
    console.warn(
      "[instrumentation] DATABASE_URL not set — skipping auto-migration. Configure .env.local to enable.",
    );
    return;
  }

  const { runMigrations } = await import("./db/migrate.ts");
  try {
    await runMigrations();
    console.log("[instrumentation] database migrations applied");
  } catch (err) {
    console.error("[instrumentation] migration failed:", err);
    throw err;
  }
}
