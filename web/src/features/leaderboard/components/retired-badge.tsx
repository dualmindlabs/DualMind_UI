import { Badge } from '@/components/ui/badge';

/**
 * Marks a model that the Arena no longer serves: it stays on the board with its record, but a
 * visitor will not meet it in a battle.
 */
export function RetiredBadge({ className }: { className?: string }) {
  return (
    <Badge variant="outline" className={className} data-retired="">
      Retired
      <span className="sr-only">, no longer available in battles</span>
    </Badge>
  );
}
