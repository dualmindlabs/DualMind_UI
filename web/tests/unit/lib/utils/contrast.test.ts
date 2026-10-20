import { describe, expect, it } from 'vitest';

import {
  contrastRatio,
  formatRatio,
  gradeContrast,
  relativeLuminance,
} from '@/lib/utils/contrast';

describe('contrast', () => {
  it('computes WCAG relative luminance', () => {
    expect(relativeLuminance('#000000')).toBe(0);
    expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1, 10);
    expect(relativeLuminance('ffffff')).toBeCloseTo(1, 10);
  });

  it('computes contrast ratios in either order', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 10);
    expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 10);
    expect(contrastRatio('#777777', '#FFFFFF')).toBeCloseTo(4.48, 2);
    // Values quoted in docs/redesign/design-direction.md section 3.
    expect(contrastRatio('#E6E8EB', '#0F1115')).toBeCloseTo(15.4, 1);
    expect(contrastRatio('#09738F', '#FFFFFF')).toBeCloseTo(5.4, 1);
  });

  it('rejects anything but #RRGGBB', () => {
    expect(() => relativeLuminance('#fff')).toThrow();
    expect(() => relativeLuminance('red')).toThrow();
  });

  it('floors ratios so a value just under a target never reads as passing', () => {
    expect(formatRatio(4.4999)).toBe('4.4:1');
    expect(formatRatio(4.5)).toBe('4.5:1');
    expect(formatRatio(21)).toBe('21.0:1');
  });

  it('grades ratios', () => {
    expect(gradeContrast(7)).toBe('AAA');
    expect(gradeContrast(4.5)).toBe('AA');
    expect(gradeContrast(3)).toBe('AA large / UI');
    expect(gradeContrast(2.9)).toBe('Below AA');
  });
});
