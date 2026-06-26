import { useRef, useSyncExternalStore } from 'react';
import {
  clearNotifications,
  dismissNotification,
  getNotifications,
  subscribeNotifications,
} from '../lib/notifications';
import { useFocusRestore, useFocusTrap } from '../lib/focus-restore';

export interface NotificationCenterProps {
  open: boolean;
  onClose: () => void;
}

/** The notification center: the message history, newest first, each dismissable. */
export function NotificationCenter({ open, onClose }: NotificationCenterProps) {
  const items = useSyncExternalStore(subscribeNotifications, getNotifications, getNotifications);
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusRestore(open);
  useFocusTrap(panelRef, open);

  if (!open) return null;

  return (
    <div className="notif-overlay" role="dialog" aria-label="Notifications" onClick={onClose}>
      <div className="notif-panel" ref={panelRef} onClick={(e) => e.stopPropagation()}>
        <header className="notif-panel__header">
          <h2 className="notif-panel__title">Notifications</h2>
          <button type="button" className="notif-panel__action" onClick={() => clearNotifications()}>
            Clear all
          </button>
          <button type="button" className="btn btn--ghost notif-panel__close" aria-label="Close notifications" onClick={onClose}>
            Close
          </button>
        </header>
        <div className="notif-panel__body">
          {items.length === 0 ? (
            <p className="notif-panel__empty">No notifications.</p>
          ) : (
            items.map((notification) => (
              <div key={notification.id} className={`notif notif--${notification.kind}`}>
                <span className="notif__message">{notification.message}</span>
                <button
                  type="button"
                  className="notif__dismiss"
                  aria-label="Dismiss notification"
                  onClick={() => dismissNotification(notification.id)}
                >
                  Dismiss
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
