import { describe, expect, it } from 'vitest';

import { parseCssColor, readCssColor } from '@/lib/utils/css-color';

describe('parseCssColor', () => {
  it('reads hex colours, short and long, with or without alpha', () => {
    expect(parseCssColor('#00d9ff')).toEqual([0, 217 / 255, 1]);
    expect(parseCssColor('#fff')).toEqual([1, 1, 1]);
    expect(parseCssColor(' #0A0B0E ')).toEqual([10 / 255, 11 / 255, 14 / 255]);
    expect(parseCssColor('#ffffff80')).toEqual([1, 1, 1]);
  });

  it('reads rgb() and rgba() in both syntaxes', () => {
    expect(parseCssColor('rgb(255, 0, 51)')).toEqual([1, 0, 0.2]);
    expect(parseCssColor('rgba(255 255 255 / 0.5)')).toEqual([1, 1, 1]);
  });

  it('returns null for empty values and for colours it cannot resolve without a canvas', () => {
    expect(parseCssColor('')).toBeNull();
    expect(parseCssColor('color-mix(in oklab, red 10%, blue)')).toBeNull();
  });
});

describe('readCssColor', () => {
  it('reads a token from the element', () => {
    document.documentElement.style.setProperty('--test-colour', '#8b5cf6');
    expect(readCssColor(document.documentElement, '--test-colour')).toEqual([
      139 / 255,
      92 / 255,
      246 / 255,
    ]);
    document.documentElement.style.removeProperty('--test-colour');
  });
});
