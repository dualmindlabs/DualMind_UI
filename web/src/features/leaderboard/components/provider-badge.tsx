import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';

export interface ProviderBadgeProps {
  /** The provider's name for people (`Cloudflare`). */
  label: string;
  className?: string;
}

/**
 * The provider that serves a model, in the label voice. Monochrome on purpose: providers are not
 * ranked against each other, so they get no colour of their own (and no brand logos).
 */
export function ProviderBadge({ label, className }: ProviderBadgeProps) {
  return (
    <Badge variant="outline" className={cn('tracking-[0.14em]', className)}>
      <span className="sr-only">Provider: </span>
      {label}
    </Badge>
  );
}
