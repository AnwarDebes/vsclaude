import { describe, expect, it } from 'vitest';
import { JSON_SCHEMAS } from '../lib/json-schemas';

describe('JSON_SCHEMAS', () => {
  it('has a package.json schema with scripts and dependencies', () => {
    const pkg = JSON_SCHEMAS.find((s) => s.fileMatch.includes('package.json'));
    expect(pkg).toBeDefined();
    const properties = (pkg!.schema as { properties: Record<string, unknown> }).properties;
    expect(properties).toHaveProperty('scripts');
    expect(properties).toHaveProperty('dependencies');
  });

  it('has a tsconfig.json schema with compilerOptions', () => {
    const tsconfig = JSON_SCHEMAS.find((s) => s.fileMatch.includes('tsconfig.json'));
    expect(tsconfig).toBeDefined();
    const properties = (tsconfig!.schema as { properties: Record<string, unknown> }).properties;
    expect(properties).toHaveProperty('compilerOptions');
  });

  it('gives every schema a unique uri', () => {
    const uris = JSON_SCHEMAS.map((s) => s.uri);
    expect(new Set(uris).size).toBe(uris.length);
  });
});
