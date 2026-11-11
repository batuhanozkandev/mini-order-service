import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    // Both tests share one Postgres and one Redis, so run the files one after another.
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
