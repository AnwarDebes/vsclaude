import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'core-shell',
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
