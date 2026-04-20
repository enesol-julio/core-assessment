import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db/index.ts";
import { profiles, responses } from "@/db/schema.ts";
import { runPipeline } from "../pipeline.ts";

export type BatchRescoreOptions = {
  scope?: "all" | { response_ids: string[] };
  concurrency?: number;
};

export type BatchRescoreResult = {
  total: number;
  succeeded: number;
  failed: Array<{ response_id: string; error: string }>;
};

async function allScoredResponseIds(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ id: profiles.responseId })
    .from(profiles)
    .innerJoin(responses, eq(responses.id, profiles.responseId));
  return rows.map((r) => r.id);
}

export async function runBatchRescore(options: BatchRescoreOptions = {}): Promise<BatchRescoreResult> {
  const scope = options.scope ?? "all";
  const targets = scope === "all" ? await allScoredResponseIds() : scope.response_ids;
  const concurrency = Math.max(1, options.concurrency ?? 2);

  const result: BatchRescoreResult = { total: targets.length, succeeded: 0, failed: [] };
  let cursor = 0;
  async function worker() {
    while (cursor < targets.length) {
      const idx = cursor;
      cursor += 1;
      const id = targets[idx];
      try {
        await runPipeline(id, "batch_rescore");
        result.succeeded += 1;
      } catch (err) {
        result.failed.push({ response_id: id, error: err instanceof Error ? err.message : String(err) });
      }
    }
  }
  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);
  return result;
}
