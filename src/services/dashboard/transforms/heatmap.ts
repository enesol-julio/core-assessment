import type { ProfileSummary } from "../interfaces/data-provider.ts";
import { computeRanking } from "./ranking.ts";

export type HeatmapBand = {
  min: number;
  max: number;
  label: string;
  color: string;
};

const BANDS: HeatmapBand[] = [
  { min: 85, max: 100, label: "Exceptional", color: "#16A34A" },
  { min: 70, max: 84, label: "Proficient", color: "#2563EB" },
  { min: 55, max: 69, label: "Developing", color: "#D97706" },
  { min: 40, max: 54, label: "Foundational", color: "#EA580C" },
  { min: 0, max: 39, label: "Needs Development", color: "#DC2626" },
];

function bandFor(rawScore: number): HeatmapBand {
  const floor = Math.floor(rawScore);
  for (const band of BANDS) {
    if (floor >= band.min && floor <= band.max) return band;
  }
  return BANDS[BANDS.length - 1];
}

export type HeatmapCell = {
  responseId: string;
  name: string;
  organization: string;
  sectionId: string;
  sectionName: string;
  rawScore: number;
  band: string;
  color: string;
};

export type HeatmapMatrix = {
  individuals: Array<{
    responseId: string;
    rank: number;
    name: string;
    organization: string;
    compositeScore: number;
    fitnessRating: string;
  }>;
  sections: Array<{ sectionId: string; sectionName: string }>;
  cells: HeatmapCell[];
};

export function computeSectionHeatmap(profiles: readonly ProfileSummary[]): HeatmapMatrix {
  const ranked = computeRanking(profiles);
  const sectionMap = new Map<string, string>();
  for (const p of profiles) {
    for (const s of p.sectionScores) sectionMap.set(s.sectionId, s.sectionName);
  }
  const sections = Array.from(sectionMap.entries()).map(([sectionId, sectionName]) => ({
    sectionId,
    sectionName,
  }));
  const cells: HeatmapCell[] = [];
  for (const p of ranked) {
    for (const s of p.sectionScores) {
      const band = bandFor(s.rawScore);
      cells.push({
        responseId: p.responseId,
        name: p.name,
        organization: p.organization,
        sectionId: s.sectionId,
        sectionName: s.sectionName,
        rawScore: s.rawScore,
        band: band.label,
        color: band.color,
      });
    }
  }
  return {
    individuals: ranked.map((r) => ({
      responseId: r.responseId,
      rank: r.rank,
      name: r.name,
      organization: r.organization,
      compositeScore: r.compositeScore,
      fitnessRating: r.fitnessRating,
    })),
    sections,
    cells,
  };
}
