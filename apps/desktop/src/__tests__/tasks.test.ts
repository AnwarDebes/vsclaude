import { describe, expect, it } from 'vitest';
import { detectNpmTasks } from '../lib/tasks';

describe('detectNpmTasks', () => {
  it('turns each npm script into a task that runs npm run <name>', () => {
    const json = JSON.stringify({ scripts: { build: 'tsc -b', test: 'vitest' } });
    expect(detectNpmTasks(json)).toEqual([
      { id: 'build', label: 'build', command: 'npm run build' },
      { id: 'test', label: 'test', command: 'npm run test' },
    ]);
  });

  it('ignores non-string script values', () => {
    const json = JSON.stringify({ scripts: { ok: 'echo ok', bad: 123 } });
    expect(detectNpmTasks(json).map((t) => t.id)).toEqual(['ok']);
  });

  it('returns nothing when there is no scripts block', () => {
    expect(detectNpmTasks(JSON.stringify({ name: 'x' }))).toEqual([]);
  });

  it('returns nothing for invalid JSON', () => {
    expect(detectNpmTasks('{ not json')).toEqual([]);
    expect(detectNpmTasks('')).toEqual([]);
  });
});
