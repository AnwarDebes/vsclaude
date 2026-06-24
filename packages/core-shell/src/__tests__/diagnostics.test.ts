import { describe, expect, it } from 'vitest';
import {
  compareDiagnostics,
  groupDiagnosticsByResource,
  severityRank,
  summarizeDiagnostics,
  type Diagnostic,
} from '../index.js';

const diag = (over: Partial<Diagnostic>): Diagnostic => ({
  resource: 'a.ts',
  message: 'msg',
  severity: 'error',
  line: 1,
  column: 1,
  ...over,
});

describe('summarizeDiagnostics', () => {
  it('counts each severity', () => {
    const counts = summarizeDiagnostics([
      diag({ severity: 'error' }),
      diag({ severity: 'error' }),
      diag({ severity: 'warning' }),
      diag({ severity: 'info' }),
      diag({ severity: 'hint' }),
    ]);
    expect(counts).toEqual({ error: 2, warning: 1, info: 1, hint: 1 });
  });

  it('is all zero for an empty list', () => {
    expect(summarizeDiagnostics([])).toEqual({ error: 0, warning: 0, info: 0, hint: 0 });
  });
});

describe('severityRank and compareDiagnostics', () => {
  it('ranks errors before warnings before info before hints', () => {
    expect(severityRank('error')).toBeLessThan(severityRank('warning'));
    expect(severityRank('warning')).toBeLessThan(severityRank('info'));
    expect(severityRank('info')).toBeLessThan(severityRank('hint'));
  });

  it('orders by severity, then line, then column', () => {
    const items = [
      diag({ severity: 'warning', line: 1, column: 1 }),
      diag({ severity: 'error', line: 9, column: 2 }),
      diag({ severity: 'error', line: 9, column: 1 }),
      diag({ severity: 'error', line: 2, column: 1 }),
    ];
    const sorted = [...items].sort(compareDiagnostics);
    expect(sorted.map((d) => `${d.severity}:${d.line}:${d.column}`)).toEqual([
      'error:2:1',
      'error:9:1',
      'error:9:2',
      'warning:1:1',
    ]);
  });
});

describe('groupDiagnosticsByResource', () => {
  it('groups by resource, sorts groups by path, and sorts items within a group', () => {
    const groups = groupDiagnosticsByResource([
      diag({ resource: 'src/b.ts', severity: 'warning', line: 5 }),
      diag({ resource: 'src/a.ts', severity: 'warning', line: 3 }),
      diag({ resource: 'src/a.ts', severity: 'error', line: 8 }),
    ]);
    expect(groups.map((g) => g.resource)).toEqual(['src/a.ts', 'src/b.ts']);
    const first = groups[0]!;
    expect(first.diagnostics.map((d) => `${d.severity}:${d.line}`)).toEqual(['error:8', 'warning:3']);
  });

  it('does not mutate the input', () => {
    const input = [diag({ line: 2 }), diag({ line: 1 })];
    const snapshot = input.map((d) => d.line);
    groupDiagnosticsByResource(input);
    expect(input.map((d) => d.line)).toEqual(snapshot);
  });

  it('returns no groups for an empty list', () => {
    expect(groupDiagnosticsByResource([])).toEqual([]);
  });
});
