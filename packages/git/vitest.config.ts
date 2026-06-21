import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'git',
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
