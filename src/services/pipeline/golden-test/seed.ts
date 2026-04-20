import { db } from "@/db/index.ts";
import { goldenTestResponses } from "@/db/schema.ts";
import { loadAssessment } from "@/lib/content/index.ts";
import { eq } from "drizzle-orm";

type QualityLevel = "5" | "4" | "3" | "2" | "1" | "0";

const QUALITY_TO_CONSENSUS: Record<QualityLevel, number> = {
  "5": 5,
  "4": 4,
  "3": 3,
  "2": 2,
  "1": 1,
  "0": 0,
};

const QUALITY_RANGE: Record<QualityLevel, [number, number]> = {
  "5": [4, 5],
  "4": [3, 5],
  "3": [2, 4],
  "2": [1, 3],
  "1": [0, 2],
  "0": [0, 1],
};

function lowerQualityVariant(strong: string, target: QualityLevel): string {
  const trimmed = strong.trim();
  if (target === "5") return trimmed;
  if (target === "4") {
    const sentences = trimmed.split(/(?<=[.!?])\s+/);
    return sentences.slice(0, Math.max(1, Math.floor(sentences.length * 0.7))).join(" ");
  }
  if (target === "3") {
    const sentences = trimmed.split(/(?<=[.!?])\s+/);
    return sentences.slice(0, Math.max(1, Math.floor(sentences.length * 0.45))).join(" ");
  }
  if (target === "2") {
    return trimmed.split(/(?<=[.!?])\s+/).slice(0, 2).join(" ");
  }
  if (target === "1") {
    return "I would do it step by step and check at the end.";
  }
  return "";
}

export async function seedGoldenTestResponses(count = 10): Promise<number> {
  const existing = await db.select().from(goldenTestResponses).limit(1);
  if (existing.length > 0) return 0;

  const assessment = await loadAssessment("en");
  const openQuestions = assessment.sections
    .flatMap((s) => s.file.questions)
    .filter((q) => q.type === "open_ended" && q.sample_strong_response);

  const quality: QualityLevel[] = ["5", "4", "3", "2", "1"];
  const rows: typeof goldenTestResponses.$inferInsert[] = [];
  let idx = 0;
  for (let i = 0; i < count && idx < openQuestions.length * quality.length; i++) {
    const qIdx = idx % openQuestions.length;
    const qualityLevel = quality[Math.floor(idx / openQuestions.length) % quality.length];
    idx += 1;
    const q = openQuestions[qIdx];
    if (q.type !== "open_ended") continue;
    const strong = q.sample_strong_response ?? "";
    const text = lowerQualityVariant(strong, qualityLevel);
    if (!text) continue;
    const consensus = QUALITY_TO_CONSENSUS[qualityLevel];
    const range = QUALITY_RANGE[qualityLevel];
    rows.push({
      questionId: q.question_id,
      qualityLevel,
      responseText: text,
      consensusScore: consensus.toFixed(1),
      acceptableMin: range[0].toFixed(1),
      acceptableMax: range[1].toFixed(1),
      responseData: {
        quality: qualityLevel,
        question_prompt: q.prompt,
        question_context: q.context ?? null,
        criteria: q.rubric.criteria,
        sample_strong_response: q.sample_strong_response,
        agreement_level: "bootstrap",
        model_scores: [consensus],
        notes: "Bootstrap golden response generated from sample_strong_response with synthetic degradation.",
      },
    });
  }

  if (rows.length > 0) await db.insert(goldenTestResponses).values(rows);
  return rows.length;
}

export async function clearGoldenTestResponses(): Promise<number> {
  const r = await db.delete(goldenTestResponses).returning();
  return r.length;
}

export async function goldenSeedCount(): Promise<number> {
  const rows = await db.select().from(goldenTestResponses);
  return rows.length;
}
