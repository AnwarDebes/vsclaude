import { describe, expect, it } from 'vitest';
import { EDITOR_COMMANDS } from '../lib/editor-commands';

describe('EDITOR_COMMANDS', () => {
  it('has a unique palette id for every command', () => {
    const ids = EDITOR_COMMANDS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('maps every command to a Monaco action id and a non-empty title', () => {
    for (const cmd of EDITOR_COMMANDS) {
      expect(cmd.actionId.length).toBeGreaterThan(0);
      expect(cmd.title.length).toBeGreaterThan(0);
    }
  });

  it('namespaces every palette id under editor.', () => {
    expect(EDITOR_COMMANDS.every((c) => c.id.startsWith('editor.'))).toBe(true);
  });

  it('exposes the code-intelligence actions backed by the language workers', () => {
    const actionIds = EDITOR_COMMANDS.map((c) => c.actionId);
    expect(actionIds).toContain('editor.action.revealDefinition');
    expect(actionIds).toContain('editor.action.goToReferences');
    expect(actionIds).toContain('editor.action.rename');
    expect(actionIds).toContain('editor.action.quickFix');
  });
});
