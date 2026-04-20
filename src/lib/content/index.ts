import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { AssessmentMetaSchema, type AssessmentMeta } from "@/lib/types/assessment-meta";
import { SectionFileSchema, type SectionFile, type Question } from "@/lib/types/section";
import type { Language } from "@/lib/types/assessment-response";

type RawJson = Record<string, unknown>;

function contentRoot(): string {
  return join(process.cwd(), "content");
}

async function loadJson(path: string): Promise<RawJson> {
  const raw = await readFile(path, "utf8");
  return JSON.parse(raw) as RawJson;
}

type MetaOverrides = {
  name?: string;
  full_name?: string;
  description?: string;
  sections?: Array<{
    section_id: string;
    name?: string;
    short_name?: string;
    description?: string;
  }>;
};

async function tryLoadJson(path: string): Promise<RawJson | null> {
  try {
    return await loadJson(path);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return null;
    throw err;
  }
}

export async function loadAssessmentMeta(language: Language = "en"): Promise<AssessmentMeta> {
  const raw = await loadJson(join(contentRoot(), "assessment-meta.json"));

  if (language !== "en") {
    const overlayPath = join(contentRoot(), "translations", language, "assessment-meta-overrides.json");
    const overlay = (await tryLoadJson(overlayPath)) as MetaOverrides | null;
    if (overlay) {
      if (overlay.name) raw.name = overlay.name;
      if (overlay.full_name) raw.full_name = overlay.full_name;
      if (overlay.description) raw.description = overlay.description;
      if (Array.isArray(overlay.sections) && Array.isArray(raw.sections)) {
        const bySid = new Map(overlay.sections.map((s) => [s.section_id, s]));
        raw.sections = (raw.sections as Array<Record<string, unknown>>).map((s) => {
          const ov = bySid.get(s.section_id as string);
          if (!ov) return s;
          return {
            ...s,
            ...(ov.name ? { name: ov.name } : {}),
            ...(ov.short_name ? { short_name: ov.short_name } : {}),
            ...(ov.description ? { description: ov.description } : {}),
          };
        });
      }
    }
  }

  return AssessmentMetaSchema.parse(raw);
}

type QuestionOverlay = {
  question_id: string;
  prompt?: string;
  context?: string;
  options?: Array<{ option_id: string; text: string }>;
  items?: Array<{ item_id: string; text: string }>;
  constraints?: { placeholder_text?: string };
};

type SectionOverlay = {
  name?: string;
  instructions?: string;
  questions?: QuestionOverlay[];
};

function mergeQuestion(q: Question, ov: QuestionOverlay | undefined): Question {
  if (!ov) return q;
  const merged: Record<string, unknown> = { ...q };
  if (ov.prompt) merged.prompt = ov.prompt;
  if (ov.context !== undefined) merged.context = ov.context;
  if (ov.options && q.type !== "open_ended" && q.type !== "drag_to_order") {
    const byId = new Map(ov.options.map((o) => [o.option_id, o.text]));
    merged.options = (q as { options: Array<{ option_id: string; text: string }> }).options.map((o) => ({
      ...o,
      text: byId.get(o.option_id) ?? o.text,
    }));
  }
  if (ov.items && q.type === "drag_to_order") {
    const byId = new Map(ov.items.map((i) => [i.item_id, i.text]));
    merged.items = q.items.map((i) => ({ ...i, text: byId.get(i.item_id) ?? i.text }));
  }
  if (ov.constraints?.placeholder_text && q.type === "open_ended") {
    merged.constraints = { ...q.constraints, placeholder_text: ov.constraints.placeholder_text };
  }
  return merged as Question;
}

export async function loadSection(
  metaSection: AssessmentMeta["sections"][number],
  language: Language = "en",
): Promise<SectionFile> {
  const filePath = join(contentRoot(), metaSection.file);
  const raw = await loadJson(filePath);
  const section = SectionFileSchema.parse(raw);

  if (language === "en") return section;

  const overlayPath = join(
    contentRoot(),
    "translations",
    language,
    metaSection.file.replace(/^sections\//, ""),
  );
  const overlay = (await tryLoadJson(overlayPath)) as SectionOverlay | null;
  if (!overlay) return section;

  const questionOverlayById = new Map<string, QuestionOverlay>(
    (overlay.questions ?? []).map((q) => [q.question_id, q]),
  );

  return {
    ...section,
    name: overlay.name ?? section.name,
    instructions: overlay.instructions ?? section.instructions,
    questions: section.questions.map((q) => mergeQuestion(q, questionOverlayById.get(q.question_id))),
  };
}

export type LoadedAssessment = {
  meta: AssessmentMeta;
  sections: Array<{ meta: AssessmentMeta["sections"][number]; file: SectionFile }>;
};

export async function loadAssessment(language: Language = "en"): Promise<LoadedAssessment> {
  const meta = await loadAssessmentMeta(language);
  const sections = await Promise.all(
    [...meta.sections]
      .sort((a, b) => a.order - b.order)
      .map(async (m) => ({ meta: m, file: await loadSection(m, language) })),
  );
  return { meta, sections };
}

type UiStrings = Record<string, Record<string, string>>;

let uiStringsCache: Partial<Record<Language, UiStrings>> = {};

export async function loadUiStrings(language: Language): Promise<UiStrings> {
  const cached = uiStringsCache[language];
  if (cached) return cached;
  const raw = await loadJson(join(contentRoot(), "ui-strings", `${language}.json`));
  const strings = raw as unknown as UiStrings;
  uiStringsCache[language] = strings;
  return strings;
}

export function uiString(strings: UiStrings, key: string, fallback: UiStrings | null = null): string {
  const [group, field] = key.split(".");
  if (!group || !field) return key;
  const direct = strings[group]?.[field];
  if (typeof direct === "string") return direct;
  if (fallback) {
    const fb = fallback[group]?.[field];
    if (typeof fb === "string") return fb;
  }
  return key;
}

export function interpolate(text: string, tokens: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (_, k) => (k in tokens ? String(tokens[k]) : `{${k}}`));
}

export function __resetUiStringsCache(): void {
  uiStringsCache = {};
}
