import type { ProfileSummary } from "../interfaces/data-provider.ts";

const FITNESS_COLORS: Record<string, string> = {
  "Strong Fit": "#16A34A",
  "Good Fit": "#2563EB",
  "Conditional Fit": "#D97706",
  "Developing Fit": "#EA580C",
  "Not Yet Ready": "#DC2626",
};

const CLASSIFICATION_COLORS: Record<string, string> = {
  Exceptional: "#16A34A",
  Proficient: "#2563EB",
  Developing: "#D97706",
  Foundational: "#EA580C",
  "Needs Significant Development": "#DC2626",
};

const CLASSIFICATION_ORDER = [
  "Exceptional",
  "Proficient",
  "Developing",
  "Foundational",
  "Needs Significant Development",
];

const FITNESS_ORDER = [
  "Strong Fit",
  "Good Fit",
  "Conditional Fit",
  "Developing Fit",
  "Not Yet Ready",
];

export type DistributionBucket = {
  label: string;
  count: number;
  percentage: number;
  color?: string;
};

function countsToBuckets(
  totals: Record<string, number>,
  order: readonly string[],
  colors: Record<string, string>,
): DistributionBucket[] {
  const total = Object.values(totals).reduce((a, b) => a + b, 0);
  return order.map((label) => {
    const count = totals[label] ?? 0;
    return {
      label,
      count,
      percentage: total === 0 ? 0 : (count / total) * 100,
      color: colors[label],
    };
  });
}

export function computeFitnessDistribution(profiles: readonly ProfileSummary[]): DistributionBucket[] {
  const totals: Record<string, number> = {};
  for (const p of profiles) totals[p.fitnessRating] = (totals[p.fitnessRating] ?? 0) + 1;
  return countsToBuckets(totals, FITNESS_ORDER, FITNESS_COLORS);
}

export function computeClassificationDistribution(profiles: readonly ProfileSummary[]): DistributionBucket[] {
  const totals: Record<string, number> = {};
  for (const p of profiles) totals[p.classification] = (totals[p.classification] ?? 0) + 1;
  return countsToBuckets(totals, CLASSIFICATION_ORDER, CLASSIFICATION_COLORS);
}

export type ScoreHistogramBucket = { label: string; count: number; min: number; max: number };

export function computeScoreHistogram(
  profiles: readonly ProfileSummary[],
  bucketSize = 5,
): ScoreHistogramBucket[] {
  if (bucketSize <= 0) throw new Error("bucketSize must be positive");
  const numBuckets = Math.ceil(100 / bucketSize);
  const buckets: ScoreHistogramBucket[] = Array.from({ length: numBuckets }, (_, i) => {
    const min = i * bucketSize;
    const max = Math.min(100, (i + 1) * bucketSize - 1);
    return { label: `${min}-${max}`, count: 0, min, max };
  });
  for (const p of profiles) {
    const score = Math.max(0, Math.min(100, p.compositeScore));
    const idx = Math.min(numBuckets - 1, Math.floor(score / bucketSize));
    buckets[idx].count += 1;
  }
  return buckets;
}

export type SectionStats = {
  sectionId: string;
  sectionName: string;
  mean: number;
  median: number;
  min: number;
  max: number;
  stdDev: number;
};

export function computeSectionDistributions(profiles: readonly ProfileSummary[]): SectionStats[] {
  const perSection = new Map<string, { name: string; scores: number[] }>();
  for (const p of profiles) {
    for (const s of p.sectionScores) {
      const entry = perSection.get(s.sectionId) ?? { name: s.sectionName, scores: [] };
      entry.scores.push(s.rawScore);
      perSection.set(s.sectionId, entry);
    }
  }
  const out: SectionStats[] = [];
  for (const [sectionId, { name, scores }] of perSection) {
    if (scores.length === 0) {
      out.push({ sectionId, sectionName: name, mean: 0, median: 0, min: 0, max: 0, stdDev: 0 });
      continue;
    }
    const sorted = [...scores].sort((a, b) => a - b);
    const mean = sorted.reduce((a, b) => a + b, 0) / sorted.length;
    const mid = Math.floor(sorted.length / 2);
    const median =
      sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    const variance = sorted.reduce((acc, v) => acc + (v - mean) ** 2, 0) / sorted.length;
    out.push({
      sectionId,
      sectionName: name,
      mean,
      median,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      stdDev: Math.sqrt(variance),
    });
  }
  return out;
}
