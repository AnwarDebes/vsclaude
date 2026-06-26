import { useEffect, useRef, type RefObject } from 'react';

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

const FOCUSABLE =
  'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Trap Tab focus within an open modal: Tab past the last focusable wraps to the first,
 * Shift+Tab past the first wraps to the last, and Tab while focus has escaped pulls it
 * back in. A window capture listener keeps the trap effective even if focus leaves the
 * container. Pass the container ref and the modal's open state.
 */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, active: boolean): void {
  useEffect(() => {
    if (!active) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const container = ref.current;
      if (!container) return;
      const focusables = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusables.length === 0) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      const current = document.activeElement;
      if (!(current instanceof HTMLElement) || !container.contains(current)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && current === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [ref, active]);
}
