import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils/cn';

type Width = 'page' | 'reading' | 'fluid';

const widths: Record<Width, string> = {
  // Marketing pages: 1200px with 16px (phones) and 24px gutters.
  page: 'max-w-page px-4 sm:px-6',
  // Long text: 68ch, the prose measure.
  reading: 'max-w-reading px-4 sm:px-6',
  // App screens: the full width with gutters.
  fluid: 'max-w-none px-4 sm:px-6',
};

/** Centres content at one of the layout widths (design-direction.md section 5). */
export function PageContainer({
  width = 'page',
  className,
  ...props
}: ComponentProps<'div'> & { width?: Width }) {
  return <div className={cn('mx-auto w-full', widths[width], className)} {...props} />;
}
