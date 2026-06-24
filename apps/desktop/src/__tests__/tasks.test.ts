import { describe, expect, it } from 'vitest';
import { classifyTaskGroup, detectNpmTasks, parseTasksJson } from '../lib/tasks';

describe('classifyTaskGroup', () => {
  it('classifies build and test names', () => {
    expect(classifyTaskGroup('build')).toBe('build');
    expect(classifyTaskGroup('build:web')).toBe('build');
    expect(classifyTaskGroup('test')).toBe('test');
    expect(classifyTaskGroup('test:unit')).toBe('test');
    expect(classifyTaskGroup('lint')).toBeUndefined();
  });
});

describe('detectNpmTasks', () => {
  it('turns each npm script into a task that runs npm run <name>', () => {
    const json = JSON.stringify({ scripts: { build: 'tsc -b', dev: 'vite' } });
    expect(detectNpmTasks(json)).toEqual([
      { id: 'build', label: 'build', command: 'npm run build', group: 'build' },
      { id: 'dev', label: 'dev', command: 'npm run dev', group: undefined },
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

describe('parseTasksJson', () => {
  it('turns each tasks.json task into a runnable task, appending args', () => {
    const json = JSON.stringify({
      version: '2.0.0',
      tasks: [
        { label: 'build', type: 'shell', command: 'npm run build' },
        { label: 'test', type: 'shell', command: 'vitest', args: ['--run', '--silent'] },
      ],
    });
    expect(parseTasksJson(json)).toEqual([
      { id: 'tasksjson-build', label: 'build', command: 'npm run build' },
      { id: 'tasksjson-test', label: 'test', command: 'vitest --run --silent' },
    ]);
  });

  it('skips tasks without a label or command', () => {
    const json = JSON.stringify({ tasks: [{ label: 'x' }, { command: 'y' }, {}] });
    expect(parseTasksJson(json)).toEqual([]);
  });

  it('returns nothing for invalid JSON or no tasks array', () => {
    expect(parseTasksJson('{ not json')).toEqual([]);
    expect(parseTasksJson(JSON.stringify({ version: '2.0.0' }))).toEqual([]);
  });

  it('reads the task group as a string or an object', () => {
    const json = JSON.stringify({
      tasks: [
        { label: 'b', command: 'make', group: 'build' },
        { label: 't', command: 'ctest', group: { kind: 'test', isDefault: true } },
        { label: 'x', command: 'echo' },
      ],
    });
    expect(parseTasksJson(json).map((t) => t.group)).toEqual(['build', 'test', undefined]);
  });
});
