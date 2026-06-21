#!/usr/bin/env node
/**
 * Extract the 200 action symbols from assets/banner.svg into a reusable SVG
 * sprite so the IDE can render any action as "Pixie performing it".
 *
 * Each banner frame is a <g translate><rect 80x80/><use #pixie/>SYMBOL</g>
 * followed by a <text>LABEL</text>. We drop the frame background rect, keep the
 * Pixie and the symbol, and emit <symbol id="act-LABEL" viewBox="0 0 80 80">.
 * The shared <g id="pixie"> definition is included once.
 *
 *   node scripts/gen-action-icons.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const banner = readFileSync(join(root, 'assets', 'banner.svg'), 'utf8');

/** Return the content between an opening <g ...> and its matching </g>. */
function matchGroup(text, openIndex) {
  const contentStart = text.indexOf('>', openIndex) + 1;
  const re = /<g[\s>]|<\/g>/g;
  re.lastIndex = contentStart;
  let depth = 1;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m[0] === '</g>') {
      depth -= 1;
      if (depth === 0) {
        return { content: text.slice(contentStart, m.index), end: re.lastIndex };
      }
    } else {
      depth += 1;
    }
  }
  throw new Error('unbalanced <g> starting at ' + openIndex);
}

// The shared Pixie definition.
const pixieStart = banner.indexOf('<g id="pixie">');
const pixie = banner.slice(pixieStart, banner.indexOf('</g>', pixieStart) + 5);

const FRAME_RECT = '<rect width="80" height="80" rx="8" fill="#15140f" stroke="#34322a"/>';
const openRe = /<g transform="translate\(\d+ \d+\)">/g;
const symbols = [];
const labels = [];

let m;
while ((m = openRe.exec(banner)) !== null) {
  const after = banner.slice(m.index + m[0].length, m.index + m[0].length + 40);
  if (!after.startsWith('<rect width="80" height="80"')) {
    continue; // not an action frame (a pill, the providers strip, etc.)
  }
  const { content, end } = matchGroup(banner, m.index);
  const labelMatch = /<text[^>]*>([^<]+)<\/text>/.exec(banner.slice(end, end + 220));
  if (!labelMatch) {
    throw new Error('no label after frame at ' + m.index);
  }
  const label = labelMatch[1].trim();
  const inner = content.replace(FRAME_RECT, '').trim();
  symbols.push(
    `  <symbol id="act-${label}" viewBox="0 0 80 80">\n    ${inner}\n  </symbol>`,
  );
  labels.push(label);
  openRe.lastIndex = end;
}

const unique = new Set(labels);
if (labels.length !== 200 || unique.size !== 200) {
  throw new Error(`expected 200 unique action icons, got ${labels.length} (${unique.size} unique)`);
}

const sprite = `<svg xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" style="display:none" aria-hidden="true">
  <defs>
    ${pixie}
  </defs>
${symbols.join('\n')}
</svg>
`;

const out = join(root, 'apps', 'desktop', 'src', 'assets', 'pixie-actions.svg');
writeFileSync(out, sprite);
writeFileSync(
  join(root, 'apps', 'desktop', 'src', 'assets', 'action-ids.json'),
  JSON.stringify(labels, null, 2) + '\n',
);
console.log(`wrote ${labels.length} action icons to ${out}`);
