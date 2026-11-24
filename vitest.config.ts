import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './apps/web/src'),
    },
  },
  test: {
    testTimeout: 30000,
    hookTimeout: 30000,
    globalSetup: ['./tests/integration/global-setup.ts'],
    fileParallelism: false,
  },
});
