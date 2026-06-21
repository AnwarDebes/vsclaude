#!/usr/bin/env node
/**
 * Generate docs/agent-actions.md from the frozen action catalog so the document
 * never drifts from the code.
 *
 *   pnpm --filter @vsclaude/contracts build && node scripts/gen-actions-doc.mjs
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const contracts = await import(
  pathToFileURL(join(root, 'packages', 'contracts', 'dist', 'index.js')).href
);
const { AGENT_ACTIONS, ACTION_CATEGORIES } = contracts;

const title = (id) =>
  id.replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

let md = `# Agent actions

vsclaude recognizes **${AGENT_ACTIONS.length} distinct agent behaviors**, the full
range of what a coding agent does. Each one is a first-class part of the IDE.

## How it is wired

- **Catalog** (\`@vsclaude/contracts\`): the canonical \`AgentAction\` catalog. Every
  action maps to a normalized \`AgentEventType\`, the \`PixieState\` it drives, a
  thematic category, and a plain-language caption.
- **Classification** (\`@vsclaude/motion\`): \`classifyAction(event)\` resolves any
  real event to its most specific action (the git kind, command keywords, or the
  tool name), and the mapper stamps the resolved \`actionId\` onto every
  \`MotionDirective\`.
- **Icons** (\`apps/desktop\`): one pixel symbol per action, extracted from the
  brand banner into a sprite. \`ActionIcon\` renders Pixie performing the action.
  The Pixie stage and the activity feed both use it.

Adding or changing an action is a single edit to the catalog; the motion layer,
the icons, and this document all follow.

`;

for (const category of ACTION_CATEGORIES) {
  const rows = AGENT_ACTIONS.filter((a) => a.category === category);
  md += `## ${title(category)}\n\n`;
  md += `| Action | Event | Pixie state | Caption |\n`;
  md += `| --- | --- | --- | --- |\n`;
  for (const a of rows) {
    md += `| \`${a.id}\` | \`${a.event}\` | \`${a.state}\` | ${a.caption} |\n`;
  }
  md += `\n`;
}

writeFileSync(join(root, 'docs', 'agent-actions.md'), md);
console.log(`wrote docs/agent-actions.md with ${AGENT_ACTIONS.length} actions`);
