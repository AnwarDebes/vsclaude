import { describe, expect, it } from 'vitest';
import {
  classifyTaskGroup,
  detectNpmTasks,
  parseTasksJson,
  resolveTaskChain,
  type NpmTask,
} from '../lib/tasks';

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

  it('reads dependsOn as a string or an array of labels', () => {
    const json = JSON.stringify({
      tasks: [
        { label: 'one', command: 'a', dependsOn: 'build' },
        { label: 'two', command: 'b', dependsOn: ['build', 'lint'] },
        { label: 'three', command: 'c' },
      ],
    });
    const tasks = parseTasksJson(json);
    expect(tasks[0]!.dependsOn).toEqual(['build']);
    expect(tasks[1]!.dependsOn).toEqual(['build', 'lint']);
    expect(tasks[2]!.dependsOn).toBeUndefined();
  });

  it('ignores an empty or non-string dependsOn', () => {
    const json = JSON.stringify({
      tasks: [
        { label: 'a', command: 'x', dependsOn: '' },
        { label: 'b', command: 'y', dependsOn: [''] },
        { label: 'c', command: 'z', dependsOn: 42 },
      ],
    });
    expect(parseTasksJson(json).every((t) => t.dependsOn === undefined)).toBe(true);
  });
});

describe('resolveTaskChain', () => {
  const task = (label: string, dependsOn?: string[]): NpmTask => ({
    id: label,
    label,
    command: label,
    ...(dependsOn ? { dependsOn } : {}),
  });

  it('returns just the task when it has no dependencies', () => {
    const tasks = [task('a')];
    expect(resolveTaskChain(tasks, 'a').map((t) => t.label)).toEqual(['a']);
  });

  it('places transitive dependencies before the task, in order', () => {
    const tasks = [task('a'), task('b', ['a']), task('c', ['b'])];
    expect(resolveTaskChain(tasks, 'c').map((t) => t.label)).toEqual(['a', 'b', 'c']);
  });

  it('preserves declared order and de-duplicates a diamond', () => {
    const tasks = [task('a'), task('b', ['a']), task('c', ['a']), task('d', ['b', 'c'])];
    expect(resolveTaskChain(tasks, 'd').map((t) => t.label)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('breaks dependency cycles without looping forever', () => {
    const tasks = [task('a', ['b']), task('b', ['a'])];
    expect(resolveTaskChain(tasks, 'a').map((t) => t.label)).toEqual(['b', 'a']);
  });

  it('skips unknown dependency and root labels', () => {
    expect(resolveTaskChain([task('a', ['nope'])], 'a').map((t) => t.label)).toEqual(['a']);
    expect(resolveTaskChain([task('a')], 'missing')).toEqual([]);
  });
});
