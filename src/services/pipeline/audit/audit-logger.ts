import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { LLMRequest, LLMResponse } from "../providers/interface.ts";

export type AuditRecord = {
  audit_id: string;
  timestamp: string;
  response_id: string | null;
  question_id: string | null;
  step: "scoring" | "synthesis" | "golden_test";
  trigger: "submission" | "re-evaluation" | "golden_test" | "batch_rescore";
  provider: string;
  model_requested: string;
  model_served: string;
  temperature: number;
  prompt_template_version: string;
  prompt_hash: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  latency_ms: number;
  cost_usd: number;
  raw_response: string;
  parsed_result: unknown;
  validation_warnings: string[];
  retry_info: { retry_count: number; original_error?: string };
};

function hashPrompt(req: LLMRequest): string {
  const payload = JSON.stringify({
    model: req.model,
    system_prompt: req.system_prompt,
    messages: req.messages,
    temperature: req.temperature,
    max_tokens: req.max_tokens,
    response_format: req.response_format ?? "text",
  });
  return createHash("sha256").update(payload).digest("hex");
}

function dateFolder(iso: string): string {
  return iso.slice(0, 10);
}

export async function writeAudit(
  req: LLMRequest,
  res: LLMResponse,
  parsed: unknown,
  opts: {
    validation_warnings?: string[];
    retry_count?: number;
    original_error?: string;
    root: string;
  },
): Promise<AuditRecord> {
  const meta = req.metadata ?? { step: "scoring" };
  const timestamp = new Date().toISOString();
  const record: AuditRecord = {
    audit_id: randomUUID(),
    timestamp,
    response_id: meta.response_id ?? null,
    question_id: meta.question_id ?? null,
    step: meta.step,
    trigger: meta.trigger ?? "submission",
    provider: res.provider,
    model_requested: res.model_requested,
    model_served: res.model_served,
    temperature: req.temperature,
    prompt_template_version: meta.prompt_template_version ?? "unversioned",
    prompt_hash: hashPrompt(req),
    input_tokens: res.usage.input_tokens,
    output_tokens: res.usage.output_tokens,
    total_tokens: res.usage.total_tokens,
    latency_ms: res.latency_ms,
    cost_usd: res.cost_usd,
    raw_response: res.content,
    parsed_result: parsed,
    validation_warnings: opts.validation_warnings ?? [],
    retry_info: { retry_count: opts.retry_count ?? 0, original_error: opts.original_error },
  };

  const dir = join(opts.root, "audit", dateFolder(timestamp));
  await mkdir(dir, { recursive: true });
  const file = join(dir, `${record.audit_id}.json`);
  await writeFile(file, JSON.stringify(record, null, 2) + "\n");
  return record;
}

export function auditRoot(): string {
  return join(process.cwd(), process.env.DATA_DIRECTORY ?? "./data");
}
