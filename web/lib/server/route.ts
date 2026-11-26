/* Wraps every camera API handler: refuses writes in the read-only preview and turns unexpected
   crashes into a readable JSON message instead of a bare 500 page. */
import { unstable_rethrow } from 'next/navigation';
import { PREVIEW_MESSAGE } from '../camera/constants';
import { isReadOnly } from './camera-db';
import { problem } from './validate';

const CRASH_MESSAGE = 'Something went wrong on the server. Try again in a moment.';

export function handler<A extends unknown[]>(fn: (...args: A) => Promise<Response>, opts: { write?: boolean } = {}) {
  return async (...args: A): Promise<Response> => {
    try {
      if (opts.write && isReadOnly()) return problem(503, PREVIEW_MESSAGE);
      return await fn(...args);
    } catch (err) {
      // Next.js signals (e.g. connection() during prerendering) are thrown on purpose; let them through.
      unstable_rethrow(err);
      console.error('[camera api] unexpected error:', err);
      return problem(500, CRASH_MESSAGE);
    }
  };
}
