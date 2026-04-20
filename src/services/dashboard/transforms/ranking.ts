import type { ProfileSummary } from "../interfaces/data-provider.ts";

export const FITNESS_TIER: Record<string, number> = {
  "Strong Fit": 1,
  "Good Fit": 2,
  "Conditional Fit": 3,
  "Developing Fit": 4,
  "Not Yet Ready": 5,
};

export type RankedProfile = {
  rank: number;
  responseId: string;
  profileId: string;
  name: string;
  email: string;
  organization: string;
  role: string;
  completedAt: string;
  fitnessRating: string;
  fitnessRatingTier: number;
  compositeScore: number;
  classification: string;
  percentileRank: number | null;
  relativeFitnessTier: string | null;
  sectionScores: ProfileSummary["sectionScores"];
};

export function computeRanking(profiles: readonly ProfileSummary[]): RankedProfile[] {
  const withTier = profiles.map((p) => ({
    ...p,
    fitnessRatingTier: FITNESS_TIER[p.fitnessRating] ?? 99,
  }));
  withTier.sort((a, b) => {
    if (a.fitnessRatingTier !== b.fitnessRatingTier) return a.fitnessRatingTier - b.fitnessRatingTier;
    if (a.compositeScore !== b.compositeScore) return b.compositeScore - a.compositeScore;
    return a.name.localeCompare(b.name);
  });
  return withTier.map((p, idx) => ({
    rank: idx + 1,
    responseId: p.responseId,
    profileId: p.profileId,
    name: p.name,
    email: p.email,
    organization: p.organization,
    role: p.role,
    completedAt: p.completedAt,
    fitnessRating: p.fitnessRating,
    fitnessRatingTier: p.fitnessRatingTier,
    compositeScore: p.compositeScore,
    classification: p.classification,
    percentileRank: p.percentileRank,
    relativeFitnessTier: p.relativeFitnessTier,
    sectionScores: p.sectionScores,
  }));
}
