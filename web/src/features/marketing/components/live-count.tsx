import { lazy, Suspense } from 'react';

import type { CountUpProps } from '@/components/vendor/reactbits/count-up';

// The counting animation pulls in Motion's animate(); the numbers only appear after the live
// request answers (after hydration), so that code loads then, not with the page. Until it is
// there the final value shows as plain text, the same text CountUp renders without motion.
const CountUp = lazy(() =>
  import('@/components/vendor/reactbits/count-up').then(module => ({ default: module.CountUp })),
);

function plain({ to, separator = '', decimals = 0 }: CountUpProps): string {
  const fixed = Math.abs(to).toFixed(decimals);
  const [whole = '0', fraction] = fixed.split('.');
  const grouped = separator ? whole.replace(/\B(?=(\d{3})+(?!\d))/g, separator) : whole;
  return `${grouped}${fraction ? `.${fraction}` : ''}`;
}

/** CountUp, loaded on demand. */
export function LiveCount(props: CountUpProps) {
  return (
    <Suspense fallback={<span className={props.className}>{plain(props)}</span>}>
      <CountUp {...props} />
    </Suspense>
  );
}
