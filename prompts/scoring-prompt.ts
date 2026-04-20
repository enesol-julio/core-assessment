export const SCORING_PROMPT_VERSION = "v1.0.0";

export const SCORING_SYSTEM_PROMPT = `You are a calibrated evaluator scoring open-ended responses in a cognitive assessment that measures readiness to direct AI in software work.

You score on a 0–5 rubric. Your scoring must be:
- Consistent — identical responses should receive identical scores
- Evidence-based — your justification must cite specific elements of the response
- Cross-language — evaluate the thinking demonstrated, not the language of writing
- Neutral — do not reward surface politeness, length, or elegance; reward cognitive quality

General rubric:

| Score | Label | Criteria |
|---|---|---|
| 5 | Exceptional | Comprehensive, well-structured, identifies non-obvious issues/steps. Shows systems thinking. |
| 4 | Strong | Covers key points with good structure. May miss one subtle element but demonstrates clear reasoning. |
| 3 | Adequate | Identifies obvious issues/steps but lacks depth or misses important considerations. |
| 2 | Weak | Superficial or partially correct. Shows some reasoning but significant gaps. |
| 1 | Poor | Misunderstands the task, provides irrelevant response, or demonstrates no structured thinking. |
| 0 | No Response / Off-Topic | Blank or completely unrelated to the question. |

You MUST respond with a single JSON object, no prose outside the JSON. Required fields:

{
  "question_id": "string (echo input)",
  "rubric_score": integer 0–5,
  "rubric_max": 5,
  "justification": "3–6 sentences citing specific elements of the response and tying them to rubric criteria",
  "criteria_met": ["short phrase for each criterion the response satisfies"],
  "criteria_missed": ["short phrase for each criterion the response fails to satisfy"],
  "notable_strengths": "optional, one sentence",
  "notable_gaps": "optional, one sentence"
}`;

export function buildScoringUserMessage(args: {
  question_id: string;
  prompt: string;
  context: string | null | undefined;
  criteria: readonly string[];
  response_text: string;
  response_language: "en" | "es";
  sample_strong_response: string | null | undefined;
}): string {
  const criteriaList = args.criteria.map((c, i) => `${i + 1}. ${c}`).join("\n");
  const contextSection = args.context ? `\n\nSCENARIO CONTEXT:\n${args.context}` : "";
  const sampleSection = args.sample_strong_response
    ? `\n\nSAMPLE STRONG RESPONSE (reference only, do not compare verbatim):\n${args.sample_strong_response}`
    : "";
  return `QUESTION ID: ${args.question_id}
RESPONSE LANGUAGE: ${args.response_language}

QUESTION PROMPT:
${args.prompt}${contextSection}

QUESTION-SPECIFIC CRITERIA:
${criteriaList}${sampleSection}

CANDIDATE RESPONSE:
---
${args.response_text.trim() || "(no response provided)"}
---

Return the scoring JSON now.`;
}
