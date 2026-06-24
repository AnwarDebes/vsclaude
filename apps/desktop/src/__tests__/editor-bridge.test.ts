import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearActiveEditor,
  getActiveEditor,
  getEditorStatus,
  gotoLine,
  setActiveEditor,
  setEditorStatus,
  subscribeEditorStatus,
  type BridgeEditor,
  type EditorStatus,
} from '../lib/editor-bridge';

function fakeEditor(lineCount = 100) {
  const calls = {
    reveal: [] as number[],
    position: [] as { lineNumber: number; column: number }[],
    focused: 0,
  };
  const editor: BridgeEditor = {
    revealLineInCenter: (n) => calls.reveal.push(n),
    setPosition: (p) => calls.position.push(p),
    getModel: () => ({ getLineCount: () => lineCount }),
    focus: () => {
      calls.focused += 1;
    },
  };
  return { editor, calls };
}

describe('editor bridge', () => {
  beforeEach(() => {
    // Force the singleton back to empty between tests.
    const { editor } = fakeEditor();
    setActiveEditor(editor);
    clearActiveEditor(editor);
  });

  it('reports no active editor and refuses to jump when none is set', () => {
    expect(getActiveEditor()).toBeNull();
    expect(gotoLine(10)).toBe(false);
  });

  it('reveals, positions, and focuses the active editor', () => {
    const { editor, calls } = fakeEditor();
    setActiveEditor(editor);
    expect(getActiveEditor()).toBe(editor);
    expect(gotoLine(40)).toBe(true);
    expect(calls.reveal).toEqual([40]);
    expect(calls.position).toEqual([{ lineNumber: 40, column: 1 }]);
    expect(calls.focused).toBe(1);
  });

  it('passes the column through', () => {
    const { editor, calls } = fakeEditor();
    setActiveEditor(editor);
    gotoLine(12, 5);
    expect(calls.position).toEqual([{ lineNumber: 12, column: 5 }]);
  });

  it('clamps the target line to the document bounds', () => {
    const { editor, calls } = fakeEditor(80);
    setActiveEditor(editor);
    gotoLine(9999);
    expect(calls.reveal).toEqual([80]);
    expect(calls.position).toEqual([{ lineNumber: 80, column: 1 }]);
  });

  it('only clears the active editor when it is still the active one', () => {
    const first = fakeEditor().editor;
    const second = fakeEditor().editor;
    setActiveEditor(first);
    setActiveEditor(second);
    // Clearing the stale first editor must not unset the current one.
    clearActiveEditor(first);
    expect(getActiveEditor()).toBe(second);
    clearActiveEditor(second);
    expect(getActiveEditor()).toBeNull();
  });
});

describe('editor status store', () => {
  const sample: EditorStatus = {
    line: 12,
    column: 4,
    selectionCount: 0,
    language: 'typescript',
    eol: 'LF',
    indent: { insertSpaces: true, tabSize: 2 },
  };

  beforeEach(() => {
    setEditorStatus(null);
  });

  it('publishes and reads the latest snapshot', () => {
    expect(getEditorStatus()).toBeNull();
    setEditorStatus(sample);
    expect(getEditorStatus()).toEqual(sample);
  });

  it('notifies subscribers on change and stops after unsubscribe', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeEditorStatus(listener);
    setEditorStatus(sample);
    setEditorStatus(null);
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    setEditorStatus(sample);
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
