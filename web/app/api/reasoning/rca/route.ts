import { LlmError, LocalLlmClient, llmConfigFromEnv, loadMockCase, RcaAnalysisError, RcaInputError, runRca } from '@/lib/reasoning/rca';

/** Runs RCA on one incident with the on-prem LLM.
    Body: an RcaInput ({ incident, sensors }), or { "mock": "<case name>" } to run a bundled mock case.
    POST only: with Cache Components a GET handler could be prerendered at build time. */
export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Body must be JSON' }, { status: 400 });
  }
  try {
    const mock = typeof body === 'object' && body !== null && 'mock' in body ? (body as { mock: unknown }).mock : undefined;
    const input = typeof mock === 'string' ? await loadMockCase(mock) : body;
    const llm = new LocalLlmClient(llmConfigFromEnv());
    return Response.json(await runRca(input, { llm, signal: request.signal }));
  } catch (err) {
    if (err instanceof RcaInputError) return Response.json({ error: err.message }, { status: 400 });
    if (err instanceof RcaAnalysisError) return Response.json({ error: err.message, issues: err.issues }, { status: 422 });
    if (err instanceof LlmError) return Response.json({ error: err.message }, { status: 503 });
    console.error('[reasoning/rca]', err);
    return Response.json({ error: 'RCA failed' }, { status: 500 });
  }
}
