import Anthropic from "@anthropic-ai/sdk";
import type { LLMProvider, LLMRequest, LLMResponse } from "./interface.ts";

const INPUT_COST_PER_MILLION: Record<string, number> = {
  "claude-sonnet-4-5-20250514": 3.0,
  "claude-opus-4-5-20250514": 15.0,
  "claude-opus-4-7": 15.0,
  "claude-sonnet-4-6": 3.0,
};

const OUTPUT_COST_PER_MILLION: Record<string, number> = {
  "claude-sonnet-4-5-20250514": 15.0,
  "claude-opus-4-5-20250514": 75.0,
  "claude-opus-4-7": 75.0,
  "claude-sonnet-4-6": 15.0,
};

function computeCost(model: string, input_tokens: number, output_tokens: number): number {
  const inRate = INPUT_COST_PER_MILLION[model] ?? 0;
  const outRate = OUTPUT_COST_PER_MILLION[model] ?? 0;
  return (input_tokens / 1_000_000) * inRate + (output_tokens / 1_000_000) * outRate;
}

export class AnthropicProvider implements LLMProvider {
  readonly id = "anthropic" as const;
  readonly name = "Anthropic";
  private client: Anthropic;

  constructor(apiKey?: string) {
    const key = apiKey ?? process.env.ANTHROPIC_API_KEY;
    if (!key || key.startsWith("sk-ant-REPLACE")) {
      throw new Error("ANTHROPIC_API_KEY is not set");
    }
    this.client = new Anthropic({ apiKey: key });
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const started = Date.now();
    const resp = await this.client.messages.create({
      model: request.model,
      system: request.system_prompt,
      messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
      max_tokens: request.max_tokens,
      temperature: request.temperature,
    });

    const text = resp.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    const usage = {
      input_tokens: resp.usage.input_tokens,
      output_tokens: resp.usage.output_tokens,
      total_tokens: resp.usage.input_tokens + resp.usage.output_tokens,
    };

    return {
      content: text,
      model_requested: request.model,
      model_served: resp.model,
      provider: "anthropic",
      usage,
      latency_ms: Date.now() - started,
      cost_usd: computeCost(resp.model, usage.input_tokens, usage.output_tokens),
    };
  }
}
