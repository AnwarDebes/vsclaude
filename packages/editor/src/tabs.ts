import { baseName } from './tree.js';

/**
 * A single open editor tab. The path is the stable identity; the label is a
 * convenience derived from it.
 */
export interface Tab {
  /** Unique path identifying the document; also the tab identity. */
  readonly path: string;
  /** Display label, defaults to the final path segment. */
  readonly label: string;
}

/**
 * Manages the ordered set of open editor tabs and which one is active.
 *
 * Identity is the document path. Opening an already open tab activates it
 * rather than duplicating it. When the active tab is closed, the manager falls
 * back to a neighbor so the editor is never left without an active document
 * while tabs remain. Order of insertion is preserved.
 *
 * This class is intentionally free of any Monaco or DOM dependency: it is pure
 * model logic that a view layer can render and observe.
 */
export class TabManager {
  private readonly tabs: Tab[] = [];
  private activePath: string | null = null;

  /**
   * Opens the document at `path`, appending a new tab if needed, and makes it
   * active. Returns the (possibly pre-existing) tab. Idempotent for already
   * open paths.
   */
  openTab(path: string): Tab {
    const existing = this.tabs.find((tab) => tab.path === path);
    if (existing !== undefined) {
      this.activePath = path;
      return existing;
    }
    const tab: Tab = { path, label: baseName(path) };
    this.tabs.push(tab);
    this.activePath = path;
    return tab;
  }

  /**
   * Closes the tab at `path` if open. When the closed tab was active, the
   * neighbor that took its slot becomes active; if it was the last tab, the new
   * last tab becomes active; if no tabs remain, the active tab is null.
   *
   * Returns true when a tab was actually removed.
   */
  closeTab(path: string): boolean {
    const index = this.tabs.findIndex((tab) => tab.path === path);
    if (index === -1) {
      return false;
    }

    const wasActive = this.activePath === path;
    this.tabs.splice(index, 1);

    if (!wasActive) {
      return true;
    }

    if (this.tabs.length === 0) {
      this.activePath = null;
      return true;
    }

    // Prefer the tab that shifted into the closed slot; if we removed the last
    // tab, fall back to the new final tab.
    const fallbackIndex = Math.min(index, this.tabs.length - 1);
    const fallback = this.tabs[fallbackIndex];
    this.activePath = fallback?.path ?? null;
    return true;
  }

  /**
   * Activates an already open tab. No-op (returns false) when the path is not
   * open, so callers can distinguish a real activation from a stale request.
   */
  activate(path: string): boolean {
    const exists = this.tabs.some((tab) => tab.path === path);
    if (!exists) {
      return false;
    }
    this.activePath = path;
    return true;
  }

  /** Returns the active tab, or null when no tabs are open. */
  getActive(): Tab | null {
    if (this.activePath === null) {
      return null;
    }
    return this.tabs.find((tab) => tab.path === this.activePath) ?? null;
  }

  /** Returns the path of the active tab, or null. */
  getActivePath(): string | null {
    return this.activePath;
  }

  /** Returns a snapshot copy of the open tabs in insertion order. */
  list(): Tab[] {
    return this.tabs.slice();
  }

  /** Number of open tabs. */
  get count(): number {
    return this.tabs.length;
  }

  /** True when a tab for the given path is open. */
  has(path: string): boolean {
    return this.tabs.some((tab) => tab.path === path);
  }
}
