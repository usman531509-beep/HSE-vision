import { describe, expect, it, vi } from 'vitest';
import { FakeLlmClient, isLocalHost, llmConfigFromEnv, LlmError, LocalLlmClient } from './llm';

describe('isLocalHost', () => {
  it.each(['localhost', '127.0.0.1', '10.2.3.4', '192.168.18.46', '172.20.0.5', '::1', '[::1]', 'fd12:3456::1', 'llm-box', 'gpu01.plant.internal', 'ai.local'])(
    'allows %s', (h) => expect(isLocalHost(h)).toBe(true),
  );
  it.each(['api.openai.com', 'example.com', '8.8.8.8', '172.32.0.1', '2001:4860::8888'])('refuses %s', (h) => expect(isLocalHost(h)).toBe(false));
});

describe('llmConfigFromEnv', () => {
  it('requires a model', () => expect(() => llmConfigFromEnv({})).toThrow(/RCA_LLM_MODEL/));
  it('defaults to local Ollama', () => {
    expect(llmConfigFromEnv({ RCA_LLM_MODEL: 'm' })).toEqual({ baseUrl: 'http://127.0.0.1:11434/v1', model: 'm', timeoutMs: 120000 });
  });
  it('rejects a bad timeout', () => expect(() => llmConfigFromEnv({ RCA_LLM_MODEL: 'm', RCA_LLM_TIMEOUT_MS: 'soon' })).toThrow(/TIMEOUT/));
});

describe('LocalLlmClient', () => {
  const cfg = { baseUrl: 'http://127.0.0.1:11434/v1/', model: 'qwen', timeoutMs: 5000 };
  const ok = (content: unknown) => new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });

  it('refuses a remote host before sending anything', () => {
    const fetchFn = vi.fn();
    expect(() => new LocalLlmClient({ ...cfg, baseUrl: 'https://api.openai.com/v1' }, fetchFn)).toThrow(/non-local/);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('posts an OpenAI-style chat request with JSON mode and temperature 0', async () => {
    const fetchFn = vi.fn(async () => ok('{"a":1}'));
    const out = await new LocalLlmClient(cfg, fetchFn).complete([{ role: 'user', content: 'hi' }], { json: true });
    expect(out).toBe('{"a":1}');
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://127.0.0.1:11434/v1/chat/completions');
    expect(JSON.parse(init.body as string)).toMatchObject({ model: 'qwen', temperature: 0, stream: false, response_format: { type: 'json_object' } });
  });

  it('turns HTTP errors, empty replies and network failures into LlmError', async () => {
    await expect(new LocalLlmClient(cfg, async () => new Response('model not found', { status: 404 })).complete([])).rejects.toThrow(/HTTP 404/);
    await expect(new LocalLlmClient(cfg, async () => ok('')).complete([])).rejects.toThrow(LlmError);
    await expect(new LocalLlmClient(cfg, async () => { throw new TypeError('fetch failed'); }).complete([])).rejects.toThrow(/unreachable/);
  });
});

describe('FakeLlmClient', () => {
  it('replies in order and records calls', async () => {
    const llm = new FakeLlmClient(['a', 'b']);
    expect(await llm.complete([])).toBe('a');
    expect(await llm.complete([])).toBe('b');
    await expect(llm.complete([])).rejects.toThrow(LlmError);
    expect(llm.calls).toHaveLength(3);
  });
});

describe('LocalLlmClient: timeouts and cancellation', () => {
  const cfg = { baseUrl: 'http://127.0.0.1:11434/v1', model: 'qwen', timeoutMs: 5000 };
  /** A server that never answers; it only gives up when the request is aborted. */
  const hang = (async (_url: string | URL | Request, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(init.signal!.reason)))) as typeof fetch;

  it('rejects a base URL that is not a URL', () => {
    expect(() => new LocalLlmClient({ ...cfg, baseUrl: 'not a url' })).toThrow(/not a URL/);
  });

  it('gives up after the configured timeout with a clear message', async () => {
    await expect(new LocalLlmClient({ ...cfg, timeoutMs: 20 }, hang).complete([])).rejects.toThrow(/did not answer within 20 ms/);
  });

  it('stops when the caller cancels', async () => {
    const ctl = new AbortController();
    const pending = new LocalLlmClient(cfg, hang).complete([], { signal: ctl.signal });
    ctl.abort();
    await expect(pending).rejects.toThrow(/cancelled/);
  });

  it('omits JSON mode when not asked for', async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: 'x' } }] })));
    await new LocalLlmClient(cfg, fetchFn).complete([]);
    const [, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(init.body as string)).not.toHaveProperty('response_format');
  });
});

describe('FakeLlmClient with a reply function', () => {
  it('passes the messages and call number', async () => {
    const llm = new FakeLlmClient((m, n) => `${m[0].content}#${n}`);
    expect(await llm.complete([{ role: 'user', content: 'q' }])).toBe('q#0');
  });
});
