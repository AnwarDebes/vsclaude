import { useEffect, useRef } from 'react';

/**
 * The most recently focused element that is NOT inside a dialog. A module-level
 * focusin listener keeps it current, so when a modal closes we can return focus to
 * wherever the user was, regardless of how each modal focuses its own content on open.
 */
let lastNonDialogFocus: HTMLElement | null = null;

if (typeof document !== 'undefined') {
  document.addEventListener('focusin', (event) => {
    const target = event.target;
    if (target instanceof HTMLElement && !target.closest('[role="dialog"]')) {
      lastNonDialogFocus = target;
    }
  });
}

/**
 * Restore focus to the pre-modal element when a modal closes (VS Code returns focus to
 * the editor / trigger after a dialog is dismissed). Pass the modal's open state.
 */
export function useFocusRestore(open: boolean): void {
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open) {
      wasOpen.current = true;
    } else if (wasOpen.current) {
      wasOpen.current = false;
      const target = lastNonDialogFocus;
      if (target && document.contains(target)) target.focus();
    }
  }, [open]);
}
