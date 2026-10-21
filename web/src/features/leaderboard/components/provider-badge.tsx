import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';

export interface ProviderBadgeProps {
  /** The model's maker for people ("Meta"). */
  label: string;
  /** Where it is served, as secondary text next to the badge ("via Cloudflare Workers AI"). */
  via?: string | null | undefined;
  className?: string;
}

/**
 * The company behind a model, in the label voice, with the serving platform as quiet text beside
 * it. Monochrome on purpose: makers are not ranked against each other, so they get no colour of
 * their own (and no brand logos).
 */
export function ProviderBadge({ label, via, className }: ProviderBadgeProps) {
  const badge = (
    <Badge variant="outline" className={cn('tracking-[0.14em]', className)}>
      <span className="sr-only">Maker: </span>
      {label}
    </Badge>
  );
  if (!via) return badge;
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      {badge}
      <span className="text-caption text-muted">{via}</span>
    </span>
  );
}
