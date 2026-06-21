import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'design-system',
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
