import type { VsclaudePlugin } from '@vsclaude/contracts';

/**
 * Identity helper for plugin authors. It returns its argument unchanged but
 * gives editors a precise type to check the object against the
 * {@link VsclaudePlugin} contract at the definition site, so mistakes such
 * as a missing `activate` or a misspelled manifest field are caught early.
 *
 * @example
 * export default definePlugin({
 *   manifest: { id: 'acme.theme', name: 'Acme Theme', version: '1.0.0', apiVersion: 1 },
 *   activate(ctx) {
 *     ctx.registerTheme(myTheme);
 *   },
 * });
 */
export function definePlugin(plugin: VsclaudePlugin): VsclaudePlugin {
  return plugin;
}
