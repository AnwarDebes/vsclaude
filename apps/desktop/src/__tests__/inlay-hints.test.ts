import { describe, expect, it } from 'vitest';
import { TS_INLAY_HINTS } from '../lib/inlay-hints';

describe('TS_INLAY_HINTS', () => {
  it('enables the main inline hints', () => {
    expect(TS_INLAY_HINTS.includeInlayParameterNameHints).toBe('literals');
    expect(TS_INLAY_HINTS.includeInlayFunctionParameterTypeHints).toBe(true);
    expect(TS_INLAY_HINTS.includeInlayVariableTypeHints).toBe(true);
    expect(TS_INLAY_HINTS.includeInlayFunctionLikeReturnTypeHints).toBe(true);
  });

  it('does not repeat a hint when the argument already matches the name', () => {
    expect(TS_INLAY_HINTS.includeInlayParameterNameHintsWhenArgumentMatchesName).toBe(false);
  });
});
