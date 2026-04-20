#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { AssessmentMetaSchema, type AssessmentMeta } from "../../src/lib/types/assessment-meta.ts";
import { SectionFileSchema, type SectionFile } from "../../src/lib/types/section.ts";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, "..", "..");
const contentRoot = resolve(projectRoot, "content");
const metaPath = join(contentRoot, "assessment-meta.json");

type Issue = { file: string; path: string; message: string };

function loadJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

function formatZodIssues(file: string, issues: readonly { path: PropertyKey[]; message: string }[]): Issue[] {
  return issues.map((i) => ({
    file,
    path: i.path.length ? i.path.map((p) => String(p)).join(".") : "(root)",
    message: i.message,
  }));
}

function validateMeta(): { meta: AssessmentMeta | null; issues: Issue[] } {
  if (!existsSync(metaPath)) {
    return { meta: null, issues: [{ file: "assessment-meta.json", path: "(file)", message: "file not found" }] };
  }
  const raw = loadJson(metaPath);
  const res = AssessmentMetaSchema.safeParse(raw);
  if (!res.success) {
    return { meta: null, issues: formatZodIssues("assessment-meta.json", res.error.issues) };
  }
  return { meta: res.data, issues: [] };
}

function validateSection(metaSection: AssessmentMeta["sections"][number]): {
  data: SectionFile | null;
  issues: Issue[];
} {
  const absPath = join(contentRoot, metaSection.file);
  const label = metaSection.file;
  if (!existsSync(absPath)) {
    return {
      data: null,
      issues: [{ file: label, path: "(file)", message: `file does not exist at ${absPath}` }],
    };
  }
  const raw = loadJson(absPath);
  const res = SectionFileSchema.safeParse(raw);
  if (!res.success) {
    return { data: null, issues: formatZodIssues(label, res.error.issues) };
  }
  return { data: res.data, issues: [] };
}

function crossValidate(
  meta: AssessmentMeta,
  sections: { meta: AssessmentMeta["sections"][number]; data: SectionFile }[],
): Issue[] {
  const out: Issue[] = [];

  for (const { meta: m, data } of sections) {
    const label = m.file;

    if (data.section_id !== m.section_id) {
      out.push({
        file: label,
        path: "section_id",
        message: `section file section_id "${data.section_id}" does not match meta section_id "${m.section_id}"`,
      });
    }

    if (data.questions.length !== m.questions_in_pool) {
      out.push({
        file: label,
        path: "questions",
        message: `questions.length (${data.questions.length}) does not match meta.questions_in_pool (${m.questions_in_pool})`,
      });
    }

    if (data.question_count !== m.questions_served) {
      out.push({
        file: label,
        path: "question_count",
        message: `section.question_count (${data.question_count}) does not match meta.questions_served (${m.questions_served})`,
      });
    }

    if (data.selection_constraints.count !== m.questions_served) {
      out.push({
        file: label,
        path: "selection_constraints.count",
        message: `selection_constraints.count (${data.selection_constraints.count}) does not match meta.questions_served (${m.questions_served})`,
      });
    }

    const typesInFile = new Set(data.questions.map((q) => q.type));
    const typesInMeta = new Set(m.question_types);
    for (const t of typesInFile) {
      if (!typesInMeta.has(t)) {
        out.push({
          file: label,
          path: "questions",
          message: `question type "${t}" appears in file but not in meta.question_types`,
        });
      }
    }
    for (const t of typesInMeta) {
      if (!typesInFile.has(t)) {
        out.push({
          file: label,
          path: "questions",
          message: `meta.question_types declares "${t}" but no question of that type exists`,
        });
      }
    }

    const prefix = m.section_id.match(/^section-(\d)-/)?.[1];
    if (prefix) {
      for (const q of data.questions) {
        if (!q.question_id.startsWith(`s${prefix}-`)) {
          out.push({
            file: label,
            path: `questions.${q.question_id}`,
            message: `question_id "${q.question_id}" does not start with "s${prefix}-" expected for section ${m.section_id}`,
          });
        }
      }
    }

    const ids = new Set<string>();
    for (const q of data.questions) {
      if (ids.has(q.question_id)) {
        out.push({
          file: label,
          path: `questions`,
          message: `duplicate question_id ${q.question_id}`,
        });
      }
      ids.add(q.question_id);
    }
  }

  const aggregateTypeCounts: Record<string, number> = {
    single_select: 0,
    multi_select: 0,
    drag_to_order: 0,
    open_ended: 0,
  };
  const aggregateDifficulty: Record<string, number> = { easy: 0, medium: 0, hard: 0 };
  let totalQuestions = 0;
  for (const { data } of sections) {
    for (const q of data.questions) {
      aggregateTypeCounts[q.type] = (aggregateTypeCounts[q.type] ?? 0) + 1;
      aggregateDifficulty[q.difficulty] = (aggregateDifficulty[q.difficulty] ?? 0) + 1;
      totalQuestions += 1;
    }
  }

  if (totalQuestions !== meta.global_settings.total_questions_in_bank) {
    out.push({
      file: "assessment-meta.json",
      path: "global_settings.total_questions_in_bank",
      message: `total questions across sections (${totalQuestions}) does not match total_questions_in_bank (${meta.global_settings.total_questions_in_bank})`,
    });
  }

  return out;
}

function sectionSummary(sections: { meta: AssessmentMeta["sections"][number]; data: SectionFile }[]) {
  const typeTotals: Record<string, number> = {
    single_select: 0,
    multi_select: 0,
    drag_to_order: 0,
    open_ended: 0,
  };
  const diffTotals: Record<string, number> = { easy: 0, medium: 0, hard: 0 };
  for (const { data } of sections) {
    for (const q of data.questions) {
      typeTotals[q.type] = (typeTotals[q.type] ?? 0) + 1;
      diffTotals[q.difficulty] = (diffTotals[q.difficulty] ?? 0) + 1;
    }
  }
  return { typeTotals, diffTotals };
}

function main(): number {
  const allIssues: Issue[] = [];

  const { meta, issues: metaIssues } = validateMeta();
  allIssues.push(...metaIssues);

  if (!meta) {
    report(allIssues);
    return 1;
  }

  const sections: { meta: AssessmentMeta["sections"][number]; data: SectionFile }[] = [];
  for (const metaSection of meta.sections) {
    const { data, issues } = validateSection(metaSection);
    allIssues.push(...issues);
    if (data) {
      sections.push({ meta: metaSection, data });
    }
  }

  if (sections.length === meta.sections.length) {
    allIssues.push(...crossValidate(meta, sections));
  }

  if (allIssues.length === 0) {
    const { typeTotals, diffTotals } = sectionSummary(sections);
    console.log("\u2713 content validation passed");
    console.log(`  meta:      ${metaPath.replace(projectRoot + "/", "")}`);
    console.log(`  sections:  ${sections.length} / ${meta.sections.length}`);
    console.log(
      `  questions: ${Object.values(typeTotals).reduce((a, b) => a + b, 0)} total ` +
        `(single_select=${typeTotals.single_select}, multi_select=${typeTotals.multi_select}, drag_to_order=${typeTotals.drag_to_order}, open_ended=${typeTotals.open_ended})`,
    );
    console.log(
      `  difficulty: easy=${diffTotals.easy}, medium=${diffTotals.medium}, hard=${diffTotals.hard}`,
    );
    return 0;
  }

  report(allIssues);
  return 1;
}

function report(issues: Issue[]) {
  console.error(`\u2717 content validation failed: ${issues.length} issue(s)\n`);
  const byFile = new Map<string, Issue[]>();
  for (const i of issues) {
    const list = byFile.get(i.file) ?? [];
    list.push(i);
    byFile.set(i.file, list);
  }
  for (const [file, list] of byFile) {
    console.error(`  ${file}`);
    for (const i of list) {
      console.error(`    - ${i.path}: ${i.message}`);
    }
  }
}

process.exit(main());
