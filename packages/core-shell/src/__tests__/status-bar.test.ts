import { describe, expect, it } from 'vitest';
import { orderStatusItems, type StatusBarItem } from '../index.js';

const items: StatusBarItem[] = [
  { id: 'editor.language', text: 'TypeScript', side: 'right', priority: 20 },
  { id: 'editor.position', text: 'Ln 1, Col 1', side: 'right', priority: 50 },
  { id: 'git.branch', text: 'main', side: 'left', priority: 100 },
  { id: 'workspace.name', text: 'aurora', side: 'left', priority: 50 },
  { id: 'editor.eol', text: 'LF', side: 'right', priority: 30 },
];

describe('orderStatusItems', () => {
  it('returns only items on the requested side', () => {
    expect(orderStatusItems(items, 'left').map((i) => i.id)).toEqual(['git.branch', 'workspace.name']);
    expect(orderStatusItems(items, 'right').every((i) => i.side === 'right')).toBe(true);
  });

  it('sorts by priority descending', () => {
    expect(orderStatusItems(items, 'right').map((i) => i.id)).toEqual([
      'editor.position',
      'editor.eol',
      'editor.language',
    ]);
  });

  it('breaks ties by id for a stable order', () => {
    const tied: StatusBarItem[] = [
      { id: 'b', text: 'B', side: 'right', priority: 10 },
      { id: 'a', text: 'A', side: 'right', priority: 10 },
    ];
    expect(orderStatusItems(tied, 'right').map((i) => i.id)).toEqual(['a', 'b']);
  });

  it('treats a missing priority as zero', () => {
    const mixed: StatusBarItem[] = [
      { id: 'has', text: 'H', side: 'left', priority: 5 },
      { id: 'none', text: 'N', side: 'left' },
    ];
    expect(orderStatusItems(mixed, 'left').map((i) => i.id)).toEqual(['has', 'none']);
  });

  it('does not mutate the input array', () => {
    const input = [...items];
    orderStatusItems(input, 'right');
    expect(input.map((i) => i.id)).toEqual(items.map((i) => i.id));
  });
});
