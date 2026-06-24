/**
 * JSON schemas wired into Monaco's JSON language service so editing package.json
 * and tsconfig.json gives schema-driven validation and completion. Kept minimal
 * and offline (no remote $schema fetch). Pure data, so the shape is unit tested;
 * monaco-setup registers them.
 */
export interface JsonSchemaEntry {
  uri: string;
  fileMatch: string[];
  schema: Record<string, unknown>;
}

const PACKAGE_JSON: JsonSchemaEntry = {
  uri: 'https://vsclaude.local/schemas/package.json',
  fileMatch: ['package.json'],
  schema: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'The package name.' },
      version: { type: 'string', description: 'The package version.' },
      description: { type: 'string' },
      private: { type: 'boolean' },
      type: { type: 'string', enum: ['module', 'commonjs'] },
      scripts: { type: 'object', additionalProperties: { type: 'string' } },
      dependencies: { type: 'object', additionalProperties: { type: 'string' } },
      devDependencies: { type: 'object', additionalProperties: { type: 'string' } },
    },
  },
};

const TSCONFIG_JSON: JsonSchemaEntry = {
  uri: 'https://vsclaude.local/schemas/tsconfig.json',
  fileMatch: ['tsconfig.json'],
  schema: {
    type: 'object',
    properties: {
      extends: { type: 'string' },
      compilerOptions: { type: 'object' },
      include: { type: 'array', items: { type: 'string' } },
      exclude: { type: 'array', items: { type: 'string' } },
      files: { type: 'array', items: { type: 'string' } },
    },
  },
};

export const JSON_SCHEMAS: JsonSchemaEntry[] = [PACKAGE_JSON, TSCONFIG_JSON];
