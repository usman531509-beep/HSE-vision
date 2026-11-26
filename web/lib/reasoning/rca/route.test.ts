/* Tests for POST /api/reasoning/rca. The route builds a real LocalLlmClient from env, so the LLM server is
   stood in for by stubbing global fetch; nothing leaves the process. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/reasoning/rca/route';
import { loadMockCase } from './load';
import { RcaOutputSchema } from './schema';

const fishbone = { Man: [], Machine: ['Seal worn'], Method: [], Material: [], Measurement: [], Environment: [] };
const common = { fishbone, root_cause: 'No seal inspection schedule', confidence: 0.8, secondary_risks: [{ risk: 'Fire', likelihood: 'high' }], next_checks: ['Pressure-test the line'] };
const SMALL = { ...common, why_chain: ['a', 'b', 'c'] };
const DANGEROUS = { ...common, board: { incident_occurred: 'Leak', why_it_happened: 'Seal failed', circumstances: ['Gas builds up'] } };

/** A local LLM server that answers the method the prompt asks for. */
function llmServer(reply?: (method: 'small' | 'dangerous') => unknown) {
  return vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
    const { messages } = JSON.parse(String(init?.body)) as { messages: { content: string }[] };
    const method = messages[1].content.startsWith('Method: 5 Whys') ? 'small' : 'dangerous';
    const content = reply ? reply(method) : method === 'small' ? SMALL : DANGEROUS;
    return Response.json({ choices: [{ message: { content: typeof content === 'string' ? content : JSON.stringify(content) } }] });
  });
}

const post = (body: unknown) =>
  POST(new Request('http://localhost/api/reasoning/rca', { method: 'POST', headers: { 'content-type': 'application/json' }, body: typeof body === 'string' ? body : JSON.stringify(body) }));

beforeEach(() => {
  vi.stubEnv('RCA_LLM_MODEL', 'test-model');
  vi.stubEnv('RCA_LLM_BASE_URL', 'http://127.0.0.1:11434/v1');
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('POST /api/reasoning/rca: success', () => {
  it.each([
    ['gas-leak-confirmed', 'dangerous'],
    ['gas-leak-false-alarm', 'small'],
    ['heat-stress', 'small'],
    ['boiler-overpressure', 'dangerous'],
  ])('runs mock %s and returns a valid %s RCA', async (mock, severity) => {
    const server = llmServer();
    vi.stubGlobal('fetch', server);
    const res = await post({ mock });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(RcaOutputSchema.safeParse(body).success).toBe(true);
    expect(body).toMatchObject({ severity, model: 'test-model' });
    expect(String(server.mock.calls[0][0])).toBe('http://127.0.0.1:11434/v1/chat/completions');
  });

  it('accepts an RcaInput body directly', async () => {
    vi.stubGlobal('fetch', llmServer());
    const res = await post(await loadMockCase('heat-stress'));
    expect(res.status).toBe(200);
    expect((await res.json()).incident_id).toBe('HEAT-001');
  });
});

describe('POST /api/reasoning/rca: errors', () => {
  it('400 when the body is not JSON', async () => {
    const res = await post('nope');
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Body must be JSON' });
  });

  it('400 with the bad fields listed when the input is invalid, without calling the LLM', async () => {
    const server = llmServer();
    vi.stubGlobal('fetch', server);
    const res = await post({ incident: { id: 'X' } });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/incident\.kind/);
    expect(server).not.toHaveBeenCalled();
  });

  it('400 for a path-like mock name', async () => {
    expect((await post({ mock: '../../etc/passwd' })).status).toBe(400);
  });

  it('400 for an unknown mock case', async () => {
    const res = await post({ mock: 'no-such-case' });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Could not read/);
  });

  it('503 when no model is configured', async () => {
    vi.stubEnv('RCA_LLM_MODEL', '');
    const res = await post({ mock: 'heat-stress' });
    expect(res.status).toBe(503);
    expect((await res.json()).error).toMatch(/RCA_LLM_MODEL/);
  });

  it('503 and no request sent when the LLM host is not local', async () => {
    const server = llmServer();
    vi.stubGlobal('fetch', server);
    vi.stubEnv('RCA_LLM_BASE_URL', 'https://api.openai.com/v1');
    const res = await post({ mock: 'heat-stress' });
    expect(res.status).toBe(503);
    expect((await res.json()).error).toMatch(/non-local/);
    expect(server).not.toHaveBeenCalled();
  });

  it('503 when the local LLM is down', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('fetch failed'); }));
    const res = await post({ mock: 'heat-stress' });
    expect(res.status).toBe(503);
    expect((await res.json()).error).toMatch(/unreachable/);
  });

  it('422 with the validation issues when the LLM answer is invalid twice', async () => {
    const server = llmServer(() => ({ why_chain: ['only one'] }));
    vi.stubGlobal('fetch', server);
    const res = await post({ mock: 'heat-stress' });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.issues.join('\n')).toMatch(/why_chain/);
    expect(server).toHaveBeenCalledTimes(2);
  });

  it('503 when the LLM server answers with something that is not a chat reply', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>proxy error</html>', { status: 200 })));
    const res = await post({ mock: 'heat-stress' });
    expect(res.status).toBe(503);
    expect((await res.json()).error).toMatch(/no message content/);
  });
});

describe('POST /api/reasoning/rca: unexpected failures', () => {
  afterEach(() => {
    vi.doUnmock('./run');
    vi.resetModules();
  });

  it('500 with a generic message, logging the detail server-side only', async () => {
    vi.resetModules();
    vi.doMock('./run', () => ({ runRca: async () => { throw new RangeError('internal detail'); } }));
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { POST: freshPost } = await import('@/app/api/reasoning/rca/route');
    const res = await freshPost(new Request('http://localhost/api/reasoning/rca', { method: 'POST', body: JSON.stringify({ mock: 'heat-stress' }) }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'RCA failed' });
    expect(log).toHaveBeenCalledWith('[reasoning/rca]', expect.any(RangeError));
  });
});
