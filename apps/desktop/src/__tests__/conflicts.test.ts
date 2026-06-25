import { describe, expect, it } from 'vitest';
import { findConflicts, resolveConflict } from '../lib/conflicts';

const SAMPLE = [
  'line a',
  '<<<<<<< HEAD',
  'ours 1',
  'ours 2',
  '=======',
  'theirs 1',
  '>>>>>>> branch',
  'line z',
].join('\n');

describe('findConflicts', () => {
  it('parses a conflict block with current and incoming sides', () => {
    const conflicts = findConflicts(SAMPLE);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toMatchObject({
      start: 2,
      separator: 5,
      end: 7,
      current: ['ours 1', 'ours 2'],
      incoming: ['theirs 1'],
    });
  });

  it('returns nothing for text without conflicts', () => {
    expect(findConflicts('just\nsome\ntext')).toEqual([]);
    // A markdown setext underline of equals must not be mistaken for a separator.
    expect(findConflicts('Title\n=======\nbody')).toEqual([]);
  });

  it('finds multiple conflicts in order', () => {
    const text = [
      '<<<<<<<',
      'a',
      '=======',
      'b',
      '>>>>>>>',
      'mid',
      '<<<<<<<',
      'c',
      '=======',
      'd',
      '>>>>>>>',
    ].join('\n');
    expect(findConflicts(text)).toHaveLength(2);
  });
});

describe('resolveConflict', () => {
  const conflict = findConflicts(SAMPLE)[0]!;

  it('keeps the current side', () => {
    expect(resolveConflict(SAMPLE, conflict, 'current')).toBe(
      ['line a', 'ours 1', 'ours 2', 'line z'].join('\n'),
    );
  });

  it('keeps the incoming side', () => {
    expect(resolveConflict(SAMPLE, conflict, 'incoming')).toBe(
      ['line a', 'theirs 1', 'line z'].join('\n'),
    );
  });

  it('keeps both sides, dropping the markers', () => {
    expect(resolveConflict(SAMPLE, conflict, 'both')).toBe(
      ['line a', 'ours 1', 'ours 2', 'theirs 1', 'line z'].join('\n'),
    );
  });

  it('leaves no conflict markers behind after resolving', () => {
    expect(findConflicts(resolveConflict(SAMPLE, conflict, 'current'))).toEqual([]);
  });

  it('preserves a side that is a single blank line', () => {
    const text = ['x', '<<<<<<<', '', '=======', 'incoming', '>>>>>>>', 'y'].join('\n');
    const c = findConflicts(text)[0]!;
    expect(resolveConflict(text, c, 'current')).toBe(['x', '', 'y'].join('\n'));
    expect(resolveConflict(text, c, 'both')).toBe(['x', '', 'incoming', 'y'].join('\n'));
  });

  it('handles an empty side (pure add) without a stray blank line', () => {
    const text = ['<<<<<<<', '=======', 'added', '>>>>>>>', 'tail'].join('\n');
    const c = findConflicts(text)[0]!;
    expect(resolveConflict(text, c, 'current')).toBe('tail');
    expect(resolveConflict(text, c, 'both')).toBe(['added', 'tail'].join('\n'));
  });
});
