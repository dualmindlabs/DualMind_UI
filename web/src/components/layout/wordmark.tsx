import { cn } from '@/lib/utils/cn';

/**
 * Text wordmark: DUALMIND in Bricolage 800 caps with the product suffix in Mind A cyan. The
 * SVG-path version without a font dependency arrives with the shell in slice S2.
 */
export function Wordmark({ suffix = 'Arena', className }: { suffix?: string; className?: string }) {
  return (
    <span className={cn('wordmark inline-flex items-baseline gap-[0.45em]', className)}>
      <span className="text-fg">DualMind</span>
      <span className="text-mind-a">{suffix}</span>
    </span>
  );
}
