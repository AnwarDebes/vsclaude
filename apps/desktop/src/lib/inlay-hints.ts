/**
 * Inlay hint options for the TypeScript and JavaScript workers: show parameter
 * names, parameter and variable types, and return types inline. Kept as a plain
 * object so the configuration is unit tested and reused for both languages.
 */
export const TS_INLAY_HINTS = {
  includeInlayParameterNameHints: 'literals',
  includeInlayParameterNameHintsWhenArgumentMatchesName: false,
  includeInlayFunctionParameterTypeHints: true,
  includeInlayVariableTypeHints: true,
  includeInlayPropertyDeclarationTypeHints: true,
  includeInlayFunctionLikeReturnTypeHints: true,
  includeInlayEnumMemberValueHints: true,
} as const;
