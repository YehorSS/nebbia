import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: '/nebbia/',
  test: { environment: 'jsdom', include: ['tests/**/*.test.ts'] },
});
