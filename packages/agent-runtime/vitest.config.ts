import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'agent-runtime',
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
