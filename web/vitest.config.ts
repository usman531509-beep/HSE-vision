import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/* Unit tests run in Node against lib/ only; `@/` mirrors the tsconfig path alias. */
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
  test: { environment: 'node', include: ['lib/**/*.test.ts'] },
});
