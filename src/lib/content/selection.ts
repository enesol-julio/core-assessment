import type { Question, SectionFile } from "@/lib/types/section";

export type SelectionRule = { field: string; value: string; min: number };

function fieldValue(q: Question, field: string): string | undefined {
  const raw = (q as unknown as Record<string, unknown>)[field];
  return typeof raw === "string" ? raw : undefined;
}

function shuffle<T>(arr: readonly T[], rng: () => number = Math.random): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function satisfiesRules(picks: readonly Question[], rules: readonly SelectionRule[]): boolean {
  for (const rule of rules) {
    const count = picks.filter((q) => fieldValue(q, rule.field) === rule.value).length;
    if (count < rule.min) return false;
  }
  return true;
}

const MAX_REJECTION_ATTEMPTS = 200;

export function selectQuestions(section: SectionFile, rng: () => number = Math.random): Question[] {
  const constraints = section.selection_constraints;
  const { count } = constraints;
  const pool = section.questions;
  if (pool.length < count) {
    throw new Error(
      `section ${section.section_id}: pool has ${pool.length} but needs to serve ${count}`,
    );
  }

  if (constraints.method === "random_without_replacement") {
    return shuffle(pool, rng).slice(0, count);
  }

  const rules: SelectionRule[] = constraints.rules ?? [];

  for (const rule of rules) {
    const available = pool.filter((q) => fieldValue(q, rule.field) === rule.value).length;
    if (available < rule.min) {
      throw new Error(
        `section ${section.section_id}: rule ${rule.field}=${rule.value} needs ${rule.min}, pool has ${available}`,
      );
    }
  }

  for (let attempt = 0; attempt < MAX_REJECTION_ATTEMPTS; attempt++) {
    const picks = shuffle(pool, rng).slice(0, count);
    if (satisfiesRules(picks, rules)) return picks;
  }

  return constructiveSelection(section, rules, count, rng);
}

function constructiveSelection(
  section: SectionFile,
  rules: readonly SelectionRule[],
  count: number,
  rng: () => number,
): Question[] {
  const pool = section.questions;
  const chosen: Question[] = [];
  const used = new Set<string>();

  const sortedRules = [...rules].sort((a, b) => b.min - a.min);
  for (const rule of sortedRules) {
    const current = chosen.filter((q) => fieldValue(q, rule.field) === rule.value).length;
    const need = Math.max(0, rule.min - current);
    if (need === 0) continue;
    const candidates = shuffle(
      pool.filter((q) => !used.has(q.question_id) && fieldValue(q, rule.field) === rule.value),
      rng,
    );
    if (candidates.length < need) {
      throw new Error(
        `section ${section.section_id}: cannot satisfy ${rule.field}=${rule.value} >= ${rule.min}`,
      );
    }
    for (const q of candidates.slice(0, need)) {
      chosen.push(q);
      used.add(q.question_id);
    }
  }

  if (chosen.length > count) {
    throw new Error(
      `section ${section.section_id}: rules impose ${chosen.length} picks but count is ${count}`,
    );
  }

  const remainder = count - chosen.length;
  if (remainder > 0) {
    const leftover = shuffle(
      pool.filter((q) => !used.has(q.question_id)),
      rng,
    );
    for (const q of leftover.slice(0, remainder)) {
      chosen.push(q);
      used.add(q.question_id);
    }
  }

  if (!satisfiesRules(chosen, rules)) {
    throw new Error(`section ${section.section_id}: constraints unsatisfiable with count ${count}`);
  }

  return shuffle(chosen, rng);
}
