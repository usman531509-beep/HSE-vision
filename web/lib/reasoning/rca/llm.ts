/* LLM boundary for RCA. The repo has no shared LLM wrapper yet, so this defines the smallest interface RCA needs.
   If the team adds a shared wrapper (e.g. lib/llm), replace LocalLlmClient with an adapter to it; nothing else changes.

   Sovereign / on-prem only: LocalLlmClient talks to an OpenAI-compatible chat endpoint (Ollama, vLLM, llama.cpp
   server, LM Studio all provide one) and refuses any host that is not loopback, a private network address or an
   internal host name. Configuration, server side only:
     RCA_LLM_BASE_URL    default http://127.0.0.1:11434/v1 (Ollama)
     RCA_LLM_MODEL       required, e.g. "qwen2.5:14b-instruct"
     RCA_LLM_TIMEOUT_MS  default 120000 */

export interface LlmMessage { role: 'system' | 'user' | 'assistant'; content: string }
export interface LlmRequestOptions { json?: boolean; signal?: AbortSignal }

export interface LlmClient {
  /** Model name, recorded in every RCA output. */
  readonly model: string;
  /** Returns the assistant's reply text. */
  complete(messages: LlmMessage[], opts?: LlmRequestOptions): Promise<string>;
}

export class LlmError extends Error {}

const PRIVATE_V4 = [/^127\./, /^10\./, /^192\.168\./, /^172\.(1[6-9]|2\d|3[01])\./, /^169\.254\./];
const INTERNAL_SUFFIX = /\.(local|internal|lan|corp|home\.arpa)$/i;

/** True for loopback, RFC 1918 / link-local IPv4, IPv6 loopback / ULA, single-label hosts and internal suffixes. */
export function isLocalHost(hostname: string): boolean {
  const h = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (h === 'localhost') return true;
  if (h.includes(':')) return h === '::1' || /^f[cd][0-9a-f]{2}:/.test(h); // IPv6: loopback or unique-local only
  if (/^\d+\.\d+\.\d+\.\d+$/.test(h)) return PRIVATE_V4.some((r) => r.test(h));
  return !h.includes('.') || INTERNAL_SUFFIX.test(h);
}

export interface LocalLlmConfig { baseUrl: string; model: string; timeoutMs: number }

export function llmConfigFromEnv(env: Record<string, string | undefined> = process.env): LocalLlmConfig {
  const model = env.RCA_LLM_MODEL?.trim();
  if (!model) throw new LlmError('RCA_LLM_MODEL is not set. Point it at a model served by the local LLM runtime.');
  const timeoutMs = Number(env.RCA_LLM_TIMEOUT_MS ?? 120_000);
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new LlmError('RCA_LLM_TIMEOUT_MS must be a positive number');
  return { baseUrl: env.RCA_LLM_BASE_URL?.trim() || 'http://127.0.0.1:11434/v1', model, timeoutMs };
}

type FetchFn = typeof fetch;

export class LocalLlmClient implements LlmClient {
  readonly model: string;
  private readonly url: string;

  constructor(private readonly cfg: LocalLlmConfig, private readonly fetchFn: FetchFn = fetch) {
    let base: URL;
    try {
      base = new URL(cfg.baseUrl);
    } catch {
      throw new LlmError(`RCA_LLM_BASE_URL "${cfg.baseUrl}" is not a URL`);
    }
    if (!isLocalHost(base.hostname)) throw new LlmError(`Refusing non-local LLM host "${base.hostname}": RCA runs on the on-prem model only.`);
    this.model = cfg.model;
    this.url = `${base.href.replace(/\/$/, '')}/chat/completions`;
  }

  async complete(messages: LlmMessage[], opts: LlmRequestOptions = {}): Promise<string> {
    const timeout = AbortSignal.timeout(this.cfg.timeoutMs);
    const signal = opts.signal ? AbortSignal.any([opts.signal, timeout]) : timeout;
    let res: Response;
    try {
      res = await this.fetchFn(this.url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model: this.model, messages, temperature: 0, stream: false,
          ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
        }),
        signal,
      });
    } catch (err) {
      if (timeout.aborted) throw new LlmError(`Local LLM at ${this.url} did not answer within ${this.cfg.timeoutMs} ms`);
      if (opts.signal?.aborted) throw new LlmError('RCA request was cancelled before the local LLM answered');
      throw new LlmError(`Local LLM at ${this.url} is unreachable: ${err instanceof Error ? err.message : String(err)}`);
    }
    if (!res.ok) throw new LlmError(`Local LLM returned HTTP ${res.status}: ${(await res.text().catch(() => '')).slice(0, 300)}`);
    const body = (await res.json().catch(() => null)) as { choices?: { message?: { content?: unknown } }[] } | null;
    const content = body?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) throw new LlmError('Local LLM reply has no message content');
    return content;
  }
}

/** Test double: answers from a list (in order) or a function, and records every request. */
export class FakeLlmClient implements LlmClient {
  readonly model = 'fake-llm';
  readonly calls: LlmMessage[][] = [];
  constructor(private readonly reply: string[] | ((messages: LlmMessage[], call: number) => string)) {}

  async complete(messages: LlmMessage[]): Promise<string> {
    this.calls.push(messages);
    const n = this.calls.length - 1;
    if (typeof this.reply === 'function') return this.reply(messages, n);
    if (n >= this.reply.length) throw new LlmError(`FakeLlmClient has no reply for call ${n + 1}`);
    return this.reply[n];
  }
}
