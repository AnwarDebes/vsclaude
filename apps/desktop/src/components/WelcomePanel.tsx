import { WELCOME_TIPS, type WelcomeAction, type WelcomeActionId } from '../lib/welcome';

export interface WelcomeRecent {
  name: string;
  path: string;
}

export interface WelcomePanelProps {
  actions: readonly WelcomeAction[];
  onAction: (id: WelcomeActionId) => void;
  recents: readonly WelcomeRecent[];
  onOpenRecent: (path: string) => void;
  onClose: () => void;
}

/**
 * The Welcome page: a quick start with the common actions, the recent projects,
 * and the shortcuts worth knowing. Opened by the Help: Welcome command.
 */
export function WelcomePanel({ actions, onAction, recents, onOpenRecent, onClose }: WelcomePanelProps) {
  return (
    <div className="welcome-overlay" role="dialog" aria-label="Welcome" onClick={onClose}>
      <div className="welcome" onClick={(e) => e.stopPropagation()}>
        <header className="welcome__header">
          <h2 className="welcome__title">Welcome to vsclaude</h2>
          <button type="button" className="btn btn--ghost welcome__close" aria-label="Close Welcome" onClick={onClose}>
            Close
          </button>
        </header>
        <p className="welcome__tagline">Claude Code, in motion. A native IDE you can watch think.</p>

        <div className="welcome__cols">
          <section className="welcome__section" aria-label="Start">
            <h3 className="welcome__heading">Start</h3>
            <ul className="welcome__list">
              {actions.map((action) => (
                <li key={action.id}>
                  <button type="button" className="welcome__action" onClick={() => onAction(action.id)}>
                    {action.label}
                  </button>
                </li>
              ))}
            </ul>

            <h3 className="welcome__heading">Recent</h3>
            {recents.length === 0 ? (
              <p className="welcome__muted">No recent projects yet.</p>
            ) : (
              <ul className="welcome__list">
                {recents.slice(0, 5).map((recent) => (
                  <li key={recent.path}>
                    <button
                      type="button"
                      className="welcome__action welcome__recent"
                      title={recent.path}
                      onClick={() => onOpenRecent(recent.path)}
                    >
                      {recent.name}
                      <span className="welcome__recentpath">{recent.path}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="welcome__section" aria-label="Tips">
            <h3 className="welcome__heading">Learn the keys</h3>
            <ul className="welcome__tips">
              {WELCOME_TIPS.map((tip) => (
                <li key={tip.keys} className="welcome__tip">
                  <kbd>{tip.keys}</kbd>
                  <span>{tip.text}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
