import type { ReactNode } from 'react';
import { formatBadge, type ActivityView } from '../lib/activity-view';

export interface ActivityBarProps {
  activeView: ActivityView;
  /** Count badges, shown when greater than zero. */
  problemsCount?: number;
  changesCount?: number;
  onExplorer: () => void;
  onSearch: () => void;
  onSourceControl: () => void;
  onProblems: () => void;
  onSettings: () => void;
  onShortcuts: () => void;
}

/** Minimal stroked icons so the rail reads clearly without an icon font. */
const Icon = {
  explorer: (
    <svg viewBox="0 0 16 16" aria-hidden focusable="false">
      <path d="M3 2.5h4l1.5 1.5H13v9.5H3z" fill="none" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  ),
  search: (
    <svg viewBox="0 0 16 16" aria-hidden focusable="false">
      <circle cx="7" cy="7" r="4" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <line x1="10" y1="10" x2="14" y2="14" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  ),
  scm: (
    <svg viewBox="0 0 16 16" aria-hidden focusable="false">
      <circle cx="4" cy="3.5" r="1.6" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="4" cy="12.5" r="1.6" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="12" cy="6.5" r="1.6" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d="M4 5v6M4 9h4a3 3 0 0 0 3-3V8" fill="none" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 16 16" aria-hidden focusable="false">
      <line x1="2" y1="5" x2="14" y2="5" stroke="currentColor" strokeWidth="1.2" />
      <line x1="2" y1="11" x2="14" y2="11" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="6" cy="5" r="2" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="10" cy="11" r="2" fill="none" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  ),
  keyboard: (
    <svg viewBox="0 0 16 16" aria-hidden focusable="false">
      <rect x="1.5" y="4" width="13" height="8" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <line x1="4" y1="9.5" x2="12" y2="9.5" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  ),
  problems: (
    <svg viewBox="0 0 16 16" aria-hidden focusable="false">
      <path d="M8 2.5l5.5 10h-11z" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <line x1="8" y1="6.5" x2="8" y2="9.5" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="8" cy="11.2" r="0.7" fill="currentColor" />
    </svg>
  ),
};

/**
 * The activity bar: a vertical icon rail to reach the main views. Clicking an icon
 * opens its view (the Explorer, the Search or Source Control drawer, the Settings
 * or Keyboard Shortcuts dialog); the active view is highlighted.
 */
export function ActivityBar({
  activeView,
  problemsCount = 0,
  changesCount = 0,
  onExplorer,
  onSearch,
  onSourceControl,
  onProblems,
  onSettings,
  onShortcuts,
}: ActivityBarProps) {
  const item = (
    key: ActivityView | 'settings' | 'shortcuts',
    label: string,
    icon: ReactNode,
    onClick: () => void,
    badge?: number,
  ) => {
    const active = key === activeView;
    const badgeText = badge !== undefined ? formatBadge(badge) : undefined;
    return (
      <button
        type="button"
        className={`activity-bar__item${active ? ' is-active' : ''}`}
        aria-label={badgeText ? `${label} (${badge})` : label}
        title={label}
        aria-pressed={active}
        onClick={onClick}
      >
        {icon}
        {badgeText ? <span className="activity-bar__badge">{badgeText}</span> : null}
      </button>
    );
  };

  return (
    <nav className="activity-bar" aria-label="Activity Bar">
      {item('explorer', 'Explorer', Icon.explorer, onExplorer)}
      {item('search', 'Search', Icon.search, onSearch)}
      {item('scm', 'Source Control', Icon.scm, onSourceControl, changesCount)}
      {item('problems', 'Problems', Icon.problems, onProblems, problemsCount)}
      <div className="activity-bar__spacer" />
      {item('settings', 'Settings', Icon.settings, onSettings)}
      {item('shortcuts', 'Keyboard Shortcuts', Icon.keyboard, onShortcuts)}
    </nav>
  );
}
