/* How the web app reaches the vision service, and how the service reaches the web app back. Server-only. */

export const SERVICE_URL = process.env.VISION_SERVICE_URL ?? 'http://127.0.0.1:8001';
/** Where the vision service can reach this app; defaults to the address the request came in on. */
export const appUrl = (origin: string) => process.env.CAMERA_APP_URL ?? origin;

export const SERVICE_DOWN = 'Video analysis is not available right now. Ask your administrator to start the analysis service, then try again.';

/** Calls the vision service. Throws on a network failure; an HTTP error comes back as the response. */
export function service(path: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<Response> {
  const { timeoutMs = 5000, ...rest } = init;
  return fetch(`${SERVICE_URL}${path}`, { signal: AbortSignal.timeout(timeoutMs), ...rest });
}

/** The service's own error message ({"detail": ...}), or a fallback. */
export async function serviceError(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => null)) as { detail?: unknown } | null;
  return typeof body?.detail === 'string' ? body.detail : fallback;
}
