/**
 * Pure rules for the Source Control commit button. Amending rewrites the last commit,
 * so it is gated behind a typed confirmation: the user must type "amend" before the
 * Amend button enables. Kept pure so the gating is unit tested without rendering.
 */

/** Whether the typed text confirms a history-rewriting amend. */
export function amendConfirmed(typed: string): boolean {
  return typed.trim().toLowerCase() === 'amend';
}

export interface CommitGate {
  busy: boolean;
  message: string;
  amend: boolean;
  stagedCount: number;
  /** The text typed into the amend confirmation field. */
  amendConfirm: string;
}

/** Whether the commit/amend button should be disabled. */
export function commitDisabled({ busy, message, amend, stagedCount, amendConfirm }: CommitGate): boolean {
  if (busy) return true;
  if (message.trim().length === 0) return true;
  if (!amend && stagedCount === 0) return true;
  if (amend && !amendConfirmed(amendConfirm)) return true;
  return false;
}
