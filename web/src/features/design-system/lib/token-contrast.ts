import { type ContrastGrade, contrastRatio, gradeContrast } from '@/lib/utils/contrast';
import {
  backgrounds,
  type ColorToken,
  colorTokens,
  contrastTarget,
  type ThemeName,
  tokenValue,
} from '@/styles/tokens';

export interface ContrastReading {
  /** What the token was measured against, e.g. "background" or "Mind A". */
  against: string;
  ratio: number;
  grade: ContrastGrade;
  /** The ratio this token needs, or null for surfaces and decoration. */
  target: number | null;
  passes: boolean;
}

function labelOf(name: string): string {
  return colorTokens.find(token => token.name === name)?.label ?? name;
}

/** Contrast of a token in one theme, measured the way design-direction.md section 3 does. */
export function contrastReadings(token: ColorToken, theme: ThemeName): ContrastReading[] {
  const target = contrastTarget[token.kind];
  const pairs: Array<[string, string]> = token.against
    ? token.against.map(name => [labelOf(name), tokenValue(name, theme) ?? backgrounds[theme]])
    : [['background', backgrounds[theme]]];

  return pairs.map(([against, other]) => {
    const ratio = contrastRatio(token[theme], other);
    return {
      against,
      ratio,
      grade: gradeContrast(ratio),
      target,
      passes: target === null || ratio >= target,
    };
  });
}
