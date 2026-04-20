export const MULTI_SELECT_PENALTY_FACTOR = 0.25;
export const DRAG_ORDER_PARTIAL_CREDIT_TOLERANCE = 1;
export const DRAG_ORDER_PARTIAL_CREDIT_MULTIPLIER = 0.5;

export type ClassificationTier = {
  min: number;
  max: number;
  label: string;
};

export function scoreSingleSelect(answer: string | null, correctAnswer: string, maxScore: number): number {
  if (!answer) return 0;
  return answer === correctAnswer ? maxScore : 0;
}

export function scoreMultiSelect(
  answer: readonly string[],
  correctAnswers: readonly string[],
  maxScore: number,
  penaltyFactor: number = MULTI_SELECT_PENALTY_FACTOR,
): number {
  const correctSet = new Set(correctAnswers);
  const answerSet = new Set(answer);
  let correctCount = 0;
  let incorrectCount = 0;
  for (const a of answerSet) {
    if (correctSet.has(a)) correctCount += 1;
    else incorrectCount += 1;
  }
  const totalCorrect = correctSet.size;
  if (totalCorrect === 0) return 0;
  const ratio = correctCount / totalCorrect - incorrectCount * penaltyFactor;
  return Math.max(0, ratio) * maxScore;
}

export function scoreDragToOrder(
  answer: readonly string[],
  correctOrder: readonly string[],
  maxScore: number,
  tolerance: number = DRAG_ORDER_PARTIAL_CREDIT_TOLERANCE,
  partialMultiplier: number = DRAG_ORDER_PARTIAL_CREDIT_MULTIPLIER,
): number {
  if (correctOrder.length === 0) return 0;
  const perItem = maxScore / correctOrder.length;
  let total = 0;
  for (let i = 0; i < correctOrder.length; i++) {
    const correctPos = i;
    const actualPos = answer.indexOf(correctOrder[i]);
    if (actualPos === -1) continue;
    const dist = Math.abs(actualPos - correctPos);
    if (dist === 0) total += perItem;
    else if (dist <= tolerance) total += perItem * partialMultiplier;
  }
  return total;
}

export function scoreFromRubric(rubricScore: number, rubricMax: number, maxScore: number): number {
  if (rubricMax <= 0) return 0;
  return (Math.max(0, Math.min(rubricScore, rubricMax)) / rubricMax) * maxScore;
}

export function sectionRawScore(questionScores: readonly { score: number; maxScore: number }[]): number {
  const totalMax = questionScores.reduce((acc, q) => acc + q.maxScore, 0);
  if (totalMax <= 0) return 0;
  const totalScore = questionScores.reduce((acc, q) => acc + q.score, 0);
  return (totalScore / totalMax) * 100;
}

export function compositeScore(
  sections: readonly { weight: number; rawScore: number }[],
): number {
  const weightSum = sections.reduce((acc, s) => acc + s.weight, 0);
  if (weightSum === 0) return 0;
  const weighted = sections.reduce((acc, s) => acc + s.weight * s.rawScore, 0);
  return weighted / weightSum;
}

export function classify(composite: number, tiers: readonly ClassificationTier[]): string {
  const floored = Math.floor(composite);
  const tier = tiers.find((t) => floored >= t.min && floored <= t.max);
  if (tier) return tier.label;
  return tiers[tiers.length - 1]?.label ?? "Unclassified";
}
