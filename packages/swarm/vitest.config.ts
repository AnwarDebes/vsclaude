import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'swarm',
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
