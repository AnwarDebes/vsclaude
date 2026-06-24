import { describe, expect, it } from 'vitest';
import type { Diagnostic } from '@vsclaude/core-shell';
import { filesWithProblems } from '../lib/problem-decorations';

const diag = (resource: string, severity: Diagnostic['severity']): Diagnostic => ({
  resource,
  message: 'x',
  severity,
  line: 1,
  column: 1,
});

describe('filesWithProblems', () => {
  it('marks files with errors and warnings', () => {
    const result = filesWithProblems([diag('a.ts', 'warning'), diag('b.ts', 'error')]);
    expect(result).toEqual({ 'a.ts': 'warning', 'b.ts': 'error' });
  });

  it('lets an error win over a warning on the same file', () => {
    expect(filesWithProblems([diag('a.ts', 'warning'), diag('a.ts', 'error')])).toEqual({
      'a.ts': 'error',
    });
    expect(filesWithProblems([diag('a.ts', 'error'), diag('a.ts', 'warning')])).toEqual({
      'a.ts': 'error',
    });
  });

  it('ignores info and hint diagnostics', () => {
    expect(filesWithProblems([diag('a.ts', 'info'), diag('b.ts', 'hint')])).toEqual({});
  });
});
