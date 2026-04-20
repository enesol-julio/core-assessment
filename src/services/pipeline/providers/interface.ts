export type ProviderId = "anthropic" | "openai" | "fixture";

export type LLMMessage = {
  role: "user" | "assistant";
  content: string;
};

export type LLMRequest = {
  model: string;
  system_prompt: string;
  messages: LLMMessage[];
  temperature: number;
  max_tokens: number;
  response_format?: "json" | "text";
  metadata?: {
    step: "scoring" | "synthesis" | "golden_test";
    response_id?: string;
    question_id?: string;
    trigger?: "submission" | "re-evaluation" | "golden_test" | "batch_rescore";
    prompt_template_version?: string;
  };
};

export type LLMUsage = {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
};

export type LLMResponse = {
  content: string;
  model_requested: string;
  model_served: string;
  provider: ProviderId;
  usage: LLMUsage;
  latency_ms: number;
  cost_usd: number;
};

export interface LLMProvider {
  readonly id: ProviderId;
  readonly name: string;
  complete(request: LLMRequest): Promise<LLMResponse>;
}
