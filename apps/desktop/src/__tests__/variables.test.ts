import { describe, expect, it } from 'vitest';
import { substituteVariables } from '../lib/variables';

describe('substituteVariables', () => {
  it('substitutes known variables', () => {
    expect(substituteVariables('build ${workspaceFolder}/src', { workspaceFolder: '/repo' })).toBe(
      'build /repo/src',
    );
    expect(substituteVariables('lint ${file}', { file: 'a.ts' })).toBe('lint a.ts');
  });

  it('substitutes env variables', () => {
    expect(substituteVariables('${env:FOO}', { 'env:FOO': 'bar' })).toBe('bar');
    expect(substituteVariables('${env:MISSING}', {})).toBe('');
  });

  it('leaves an unknown variable as-is', () => {
    expect(substituteVariables('echo ${nope}', { file: 'a.ts' })).toBe('echo ${nope}');
  });

  it('replaces every occurrence', () => {
    expect(substituteVariables('${x} and ${x}', { x: 'y' })).toBe('y and y');
  });
});
