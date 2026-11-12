import { Badge } from '@/components/ui/badge';
import { ModelMark } from '@/components/ui/model-mark';
import { cn } from '@/lib/utils/cn';

export interface ProviderBadgeProps {
  /** The model's maker for people ("Meta"). */
  label: string;
  /** Where it is served, as secondary text next to the badge ("via Cloudflare Workers AI"). */
  via?: string | null | undefined;
  /** Put the maker's monogram mark in front of the label. */
  mark?: boolean;
  className?: string;
}

/**
 * The company behind a model, in the label voice, with the serving platform as quiet text beside
 * it. Makers are not ranked against each other, so they get a stable tone from a hash of their
 * name (the same maker looks the same everywhere) and no brand logos.
 */
export function ProviderBadge({ label, via, mark = false, className }: ProviderBadgeProps) {
  const badge = (
    <Badge variant="outline" className={cn('tracking-[0.14em]', className)}>
      <span className="sr-only">Maker: </span>
      {label}
    </Badge>
  );
  if (!via && !mark) return badge;
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      {mark ? <ModelMark name={label} size="sm" /> : null}
      {badge}
      {via ? <span className="text-caption text-muted">{via}</span> : null}
    </span>
  );
}
