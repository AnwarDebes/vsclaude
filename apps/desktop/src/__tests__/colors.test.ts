import { describe, expect, it } from 'vitest';
import { findColors, toHex } from '../lib/colors';

describe('findColors', () => {
  it('parses a 6-digit hex color', () => {
    const c = findColors('color: #ff0000;');
    expect(c).toHaveLength(1);
    expect(c[0]!.color).toEqual({ red: 1, green: 0, blue: 0, alpha: 1 });
  });

  it('expands a 3-digit hex color', () => {
    expect(findColors('#fff')[0]!.color).toEqual({ red: 1, green: 1, blue: 1, alpha: 1 });
  });

  it('parses an 8-digit hex with alpha', () => {
    const c = findColors('#ff000080')[0]!.color;
    expect(c.red).toBe(1);
    expect(c.alpha).toBeCloseTo(0.5, 1);
  });

  it('parses rgb and rgba', () => {
    expect(findColors('rgb(0, 128, 255)')[0]!.color).toEqual({
      red: 0,
      green: 128 / 255,
      blue: 1,
      alpha: 1,
    });
    expect(findColors('rgba(0,0,0,0.5)')[0]!.color.alpha).toBe(0.5);
  });

  it('finds several colors in order with offsets', () => {
    const c = findColors('a #000 b #fff');
    expect(c.map((m) => m.start)).toEqual([2, 9]);
  });

  it('parses hsl and hsla', () => {
    expect(findColors('hsl(0, 100%, 50%)')[0]!.color).toEqual({ red: 1, green: 0, blue: 0, alpha: 1 });
    const green = findColors('hsla(120, 100%, 50%, 0.5)')[0]!.color;
    expect(green).toEqual({ red: 0, green: 1, blue: 0, alpha: 0.5 });
  });

  it('matches named colors only when enabled, on word boundaries', () => {
    // Off by default, so a bare word is never a color.
    expect(findColors('color: red')).toEqual([]);
    const red = findColors('color: red', { includeNamed: true });
    expect(red).toHaveLength(1);
    expect(red[0]!.color).toEqual({ red: 1, green: 0, blue: 0, alpha: 1 });
    expect(red[0]!.start).toBe(7);
    // A name embedded in a longer identifier is not matched.
    expect(findColors('colored', { includeNamed: true })).toEqual([]);
    // Sigil-prefixed identifiers (CSS class, variable) are not decorated.
    expect(findColors('.red { color: blue }', { includeNamed: true }).map((m) => m.start)).toEqual([14]);
    expect(findColors('--red: 1; $blue: 2; color: green', { includeNamed: true }).map((m) => m.start)).toEqual([27]);
    // Multi-word names and transparent work.
    expect(findColors('cornflowerblue', { includeNamed: true })).toHaveLength(1);
    expect(findColors('transparent', { includeNamed: true })[0]!.color.alpha).toBe(0);
  });

  it('ignores non-colors', () => {
    expect(findColors('hello world')).toEqual([]);
    expect(findColors('#xyz')).toEqual([]);
  });
});

describe('toHex', () => {
  it('round-trips a hex color', () => {
    const color = findColors('#ff8800')[0]!.color;
    expect(toHex(color)).toBe('#ff8800');
  });

  it('adds an alpha byte when not fully opaque', () => {
    expect(toHex({ red: 0, green: 0, blue: 0, alpha: 0.5 })).toBe('#00000080');
  });
});
