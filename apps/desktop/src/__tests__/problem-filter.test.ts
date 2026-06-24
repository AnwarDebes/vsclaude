import { describe, expect, it } from 'vitest';
import type { Diagnostic, DiagnosticSeverity } from '@vsclaude/core-shell';
import { filterDiagnostics } from '../lib/problem-filter';

const ALL = new Set<DiagnosticSeverity>(['error', 'warning', 'info', 'hint']);

const items: Diagnostic[] = [
  { resource: 'a.ts', message: 'Cannot find module react', severity: 'error', line: 1, column: 1 },
  { resource: 'b.ts', message: 'Unused variable foo', severity: 'warning', line: 2, column: 3 },
  { resource: 'c.ts', message: 'Prefer const', severity: 'info', line: 4, column: 1 },
];

describe('filterDiagnostics', () => {
  it('returns everything with an empty query and all severities', () => {
    expect(filterDiagnostics(items, { text: '', severities: ALL })).toHaveLength(3);
  });

  it('filters by message or file text', () => {
    expect(filterDiagnostics(items, { text: 'module', severities: ALL })).toHaveLength(1);
    expect(filterDiagnostics(items, { text: 'b.ts', severities: ALL }).map((d) => d.resource)).toEqual(['b.ts']);
  });

  it('filters by severity', () => {
    const errorsOnly = new Set<DiagnosticSeverity>(['error']);
    expect(filterDiagnostics(items, { text: '', severities: errorsOnly })).toHaveLength(1);
  });

  it('returns nothing when the query matches no diagnostic', () => {
    expect(filterDiagnostics(items, { text: 'zzzznope', severities: ALL })).toHaveLength(0);
  });
});
