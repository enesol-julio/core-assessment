import { loadAssessment } from "@/lib/content/index.ts";
import { selectQuestions } from "@/lib/content/selection.ts";
import type { Language } from "@/lib/types/assessment-response.ts";
import type { Question } from "@/lib/types/section.ts";

export type StartedSection = {
  section_id: string;
  order: number;
  name: string;
  short_name: string;
  instructions: string;
  weight: number;
  timer_mode: string;
  question_count: number;
  questions: PublicQuestion[];
};

export type PublicQuestion = Omit<
  Question,
  "correct_answer" | "correct_answers" | "correct_order" | "explanation" | "rubric" | "sample_strong_response"
> & {
  correct_answer?: undefined;
  correct_answers?: undefined;
  correct_order?: undefined;
  explanation?: undefined;
  rubric?: undefined;
  sample_strong_response?: undefined;
};

function sanitizeQuestion(q: Question): PublicQuestion {
  const clone = { ...q } as Record<string, unknown>;
  delete clone.correct_answer;
  delete clone.correct_answers;
  delete clone.correct_order;
  delete clone.explanation;
  delete clone.rubric;
  delete clone.sample_strong_response;
  return clone as PublicQuestion;
}

export type StartedAssessment = {
  assessment_id: string;
  assessment_version: string;
  language: Language;
  sections: StartedSection[];
};

export async function startAssessment(language: Language): Promise<StartedAssessment> {
  const assessment = await loadAssessment(language);
  const sections = assessment.sections.map((s) => {
    const served = selectQuestions(s.file);
    return {
      section_id: s.meta.section_id,
      order: s.meta.order,
      name: s.meta.name,
      short_name: s.meta.short_name,
      instructions: s.file.instructions,
      weight: s.meta.weight,
      timer_mode: s.meta.timer_mode,
      question_count: served.length,
      questions: served.map(sanitizeQuestion),
    };
  });
  return {
    assessment_id: assessment.meta.assessment_id,
    assessment_version: assessment.meta.version,
    language,
    sections,
  };
}
