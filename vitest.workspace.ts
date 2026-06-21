import { defineWorkspace } from 'vitest/config';

// Each package owns its own vitest config. This workspace file lets a single
// `pnpm test` run discover and execute them all from the repository root.
export default defineWorkspace(['packages/*', 'apps/*']);
