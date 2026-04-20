import type { LLMProvider, LLMRequest, LLMResponse } from "./interface.ts";
import { AnthropicProvider } from "./anthropic.ts";
import { FixtureProvider } from "./fixture.ts";
import { writeAudit, auditRoot } from "../audit/audit-logger.ts";

export type { LLMProvider, LLMRequest, LLMResponse } from "./interface.ts";

export type ResolvedProvider = "anthropic" | "fixture";

export function detectProvider(): ResolvedProvider {
  const explicit = process.env.PIPELINE_PROVIDER;
  if (explicit === "fixture") return "fixture";
  if (explicit === "anthropic") return "anthropic";
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || key.startsWith("sk-ant-REPLACE")) return "fixture";
  return "anthropic";
}

export function buildProvider(kind: ResolvedProvider = detectProvider()): LLMProvider {
  if (kind === "anthropic") return new AnthropicProvider();
  return new FixtureProvider();
}

export class AuditedProvider implements LLMProvider {
  readonly id: LLMProvider["id"];
  readonly name: string;

  constructor(private readonly inner: LLMProvider) {
    this.id = inner.id;
    this.name = inner.name;
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const maxRetries = 3;
    let attempt = 0;
    let lastError: unknown = null;
    while (attempt < maxRetries) {
      try {
        const res = await this.inner.complete(request);
        let parsed: unknown = null;
        try {
          if (request.response_format !== "text") parsed = JSON.parse(res.content);
        } catch {
          parsed = null;
        }
        await writeAudit(request, res, parsed, {
          root: auditRoot(),
          retry_count: attempt,
        }).catch((err) => {
          console.error("[audit] write failed:", err);
        });
        return res;
      } catch (err) {
        lastError = err;
        attempt += 1;
        if (attempt >= maxRetries) break;
        await new Promise((r) => setTimeout(r, 250 * 2 ** attempt));
      }
    }
    throw lastError ?? new Error("LLM call failed after retries");
  }
}
