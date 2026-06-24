import { useEffect, useState, useSyncExternalStore } from 'react';
import { getNotifications, subscribeNotifications } from '../lib/notifications';

const TOAST_MS = 5000;

/**
 * A transient toast for the newest notification. It appears when a notification is
 * posted and auto-dismisses after a few seconds; the full history stays in the
 * notification center.
 */
export function NotificationToast() {
  const items = useSyncExternalStore(subscribeNotifications, getNotifications, getNotifications);
  const latest = items[0];
  const [shownId, setShownId] = useState<number | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!latest || latest.id === shownId) return;
    setShownId(latest.id);
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), TOAST_MS);
    return () => clearTimeout(timer);
  }, [latest, shownId]);

  if (!visible || !latest) return null;

  return (
    <div className={`toast toast--${latest.kind}`} role="status">
      <span className="toast__message">{latest.message}</span>
      <button type="button" className="toast__dismiss" aria-label="Dismiss toast" onClick={() => setVisible(false)}>
        Dismiss
      </button>
    </div>
  );
}
