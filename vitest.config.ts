import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    testTimeout: 30000,
    hookTimeout: 30000,
    globalSetup: ['./tests/integration/global-setup.ts'],
    fileParallelism: false,
  },
});
