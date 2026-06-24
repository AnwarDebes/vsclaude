/// <reference types="vite/client" />

// The json language contribution exports jsonDefaults at runtime but ships no type
// declarations for this deep path; declare the small slice we use.
declare module 'monaco-editor/esm/vs/language/json/monaco.contribution' {
  export const jsonDefaults: {
    setDiagnosticsOptions(options: {
      validate?: boolean;
      enableSchemaRequest?: boolean;
      schemas?: Array<{ uri: string; fileMatch?: string[]; schema?: unknown }>;
    }): void;
  };
}
