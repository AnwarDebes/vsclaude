import { useRef } from 'react';
import { basePathName } from '@vsclaude/editor';
import type { WorkspaceApi } from '../workspace/useWorkspace';
import { EditorPanel } from '../panels/EditorPanel';

interface WorkspaceEditorProps {
  ws: WorkspaceApi;
}

/**
 * The editing surface for an open workspace: a WAI-ARIA tab bar over the open
 * documents (one tab stop, arrow-key roving, Delete to close), Monaco bound to the
 * active document with real save-to-disk, and a banner when a file changes or
 * disappears on disk underneath an edit.
 */
export function WorkspaceEditor({ ws }: WorkspaceEditorProps) {
  const tabs = Array.from(ws.docs.values());
  const active = ws.activeDoc;
  const activeIndex = tabs.findIndex((doc) => doc.path === ws.activePath);
  const tablistRef = useRef<HTMLDivElement>(null);

  const onTabsKeyDown = (event: React.KeyboardEvent) => {
    const buttons = Array.from(
      tablistRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? [],
    );
    if (buttons.length === 0) return;
    const idx = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      buttons[(idx + 1) % buttons.length]?.focus();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      buttons[(idx - 1 + buttons.length) % buttons.length]?.focus();
    } else if (event.key === 'Home') {
      event.preventDefault();
      buttons[0]?.focus();
    } else if (event.key === 'End') {
      event.preventDefault();
      buttons[buttons.length - 1]?.focus();
    } else if ((event.key === 'Delete' || event.key === 'Backspace') && idx >= 0) {
      event.preventDefault();
      const doc = tabs[idx];
      if (doc) ws.closeDoc(doc.path);
    }
  };

  return (
    <div className="workspace-editor">
      <div
        className="editor-tabs"
        role="tablist"
        aria-label="Open files"
        ref={tablistRef}
        onKeyDown={onTabsKeyDown}
      >
        {tabs.map((doc, index) => {
          const isActive = doc.path === ws.activePath;
          return (
            <div key={doc.path} className={`editor-tab${isActive ? ' editor-tab--active' : ''}`}>
              <button
                type="button"
                role="tab"
                id={`workspace-tab-${index}`}
                aria-selected={isActive}
                aria-controls="workspace-tabpanel"
                tabIndex={isActive ? 0 : -1}
                className="editor-tab__label"
                title={doc.path}
                onClick={() => ws.setActivePath(doc.path)}
              >
                {doc.dirty ? <span className="editor-tab__dirty" aria-hidden /> : null}
                {basePathName(doc.path)}
                {doc.dirty ? <span className="sr-only">, unsaved changes</span> : null}
              </button>
              <button
                type="button"
                className="editor-tab__close"
                tabIndex={-1}
                aria-label={`Close ${basePathName(doc.path)}`}
                onClick={() => ws.closeDoc(doc.path)}
              >
                {'×'}
              </button>
            </div>
          );
        })}
      </div>

      <div
        className="workspace-editor__body"
        role="tabpanel"
        id="workspace-tabpanel"
        aria-labelledby={activeIndex >= 0 ? `workspace-tab-${activeIndex}` : undefined}
      >
        {active ? (
          <>
            {active.external === 'changed' ? (
              <div className="editor-banner" role="status" aria-live="polite">
                <span>This file changed on disk.</span>
                <div className="editor-banner__actions">
                  <button type="button" className="chip" onClick={() => void ws.reload(active.path)}>
                    Reload
                  </button>
                  <button type="button" className="chip" onClick={() => ws.keepMine(active.path)}>
                    Keep Mine
                  </button>
                </div>
              </div>
            ) : null}
            {active.external === 'deleted' ? (
              <div className="editor-banner editor-banner--danger" role="status" aria-live="polite">
                <span>This file was deleted on disk.</span>
                <div className="editor-banner__actions">
                  <button type="button" className="chip" onClick={() => void ws.save(active.path)}>
                    Save to restore
                  </button>
                  <button type="button" className="chip" onClick={() => ws.closeDoc(active.path)}>
                    Close
                  </button>
                </div>
              </div>
            ) : null}
            <EditorPanel
              path={active.path}
              value={active.draft}
              onChange={(v) => ws.setDraft(active.path, v)}
              onSave={() => void ws.save(active.path)}
            />
          </>
        ) : (
          <div className="workspace-editor__placeholder">
            <p>Select a file to start editing.</p>
          </div>
        )}
      </div>
    </div>
  );
}
