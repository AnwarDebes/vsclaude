import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'motion',
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
