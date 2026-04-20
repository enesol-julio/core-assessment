import type { ResponderProfile } from "@/services/pipeline/schemas/responder-profile.ts";
import type { CalibrationParams } from "@/services/pipeline/calibration/params.ts";

export type IndividualDrillDown = {
  identity: {
    responseId: string;
    profileId: string;
    profileVersion: number;
    name: string;
    email: string;
    organization: string;
    role: string;
    compositeScore: number;
    classification: string;
    fitnessRating: string;
    percentileRank: number | null;
    relativeFitnessTier: string | null;
    generatedAt: string;
  };
  sections: Array<{
    sectionId: string;
    sectionName: string;
    rawScore: number;
    weightedScore: number;
    percentile: number | null;
    populationMean: number | null;
    narrative: string;
    strengths: string[];
    concerns: string[];
  }>;
  cognitiveProfile: ResponderProfile["cognitive_profile"];
  fitness: ResponderProfile["vibe_coding_fitness"];
  developmentRecommendations: ResponderProfile["development_recommendations"];
  speedProfile: ResponderProfile["speed_profile_interpretation"];
  redFlags: ResponderProfile["red_flags"];
};

export function shapeIndividualDrillDown(
  profile: ResponderProfile,
  calibration: CalibrationParams | null,
): IndividualDrillDown {
  const narrativeBySection = new Map(
    profile.section_analysis.map((sa) => [sa.section_id, sa]),
  );
  return {
    identity: {
      responseId: profile.response_id,
      profileId: profile.profile_id,
      profileVersion: profile.profile_version,
      name: profile.user.name,
      email: profile.user.email,
      organization: profile.user.organization,
      role: profile.user.role,
      compositeScore: profile.scores.composite_score,
      classification: profile.scores.classification,
      fitnessRating: profile.vibe_coding_fitness.rating,
      percentileRank: profile.scores.percentile_rank,
      relativeFitnessTier: profile.scores.relative_fitness_tier,
      generatedAt: profile.generated_at,
    },
    sections: profile.scores.section_scores.map((s) => {
      const narrative = narrativeBySection.get(s.section_id);
      return {
        sectionId: s.section_id,
        sectionName: s.section_name,
        rawScore: s.raw_score,
        weightedScore: s.weighted_score,
        percentile: s.percentile ?? null,
        populationMean: calibration?.sections[s.section_id]?.mean ?? null,
        narrative: narrative?.narrative ?? "",
        strengths: narrative?.strengths ?? [],
        concerns: narrative?.concerns ?? [],
      };
    }),
    cognitiveProfile: profile.cognitive_profile,
    fitness: profile.vibe_coding_fitness,
    developmentRecommendations: profile.development_recommendations,
    speedProfile: profile.speed_profile_interpretation,
    redFlags: profile.red_flags,
  };
}
