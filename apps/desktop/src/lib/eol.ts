/**
 * Resolve the configured default line ending for newly created files into a concrete
 * 'LF' or 'CRLF'. 'auto' follows the OS (CRLF on Windows, LF elsewhere). Pure, so the
 * mapping is unit tested; the caller supplies the platform flag.
 */
export function resolveDefaultEol(
  setting: 'auto' | 'LF' | 'CRLF',
  isWindows: boolean,
): 'LF' | 'CRLF' {
  if (setting === 'auto') return isWindows ? 'CRLF' : 'LF';
  return setting;
}

/** Whether the current platform is Windows (used to resolve the 'auto' EOL). */
export function isWindowsPlatform(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /win/i.test(navigator.userAgent);
}
