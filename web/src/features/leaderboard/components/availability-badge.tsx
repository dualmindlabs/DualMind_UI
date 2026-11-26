import type { Availability } from '@contract/availability';

import { Badge } from '@/components/ui/badge';

import { RetiredBadge } from './retired-badge';

/**
 * What a visitor can do with a model that is not in blind battles: pick it (Side by side only),
 * or nothing (retired, or not a chat model). Models in blind battles carry no badge.
 */
export function AvailabilityBadge({
  availability,
  className,
}: {
  availability: Availability;
  className?: string | undefined;
}) {
  if (availability === 'blind') return null;
  if (availability === 'retired') return <RetiredBadge {...(className ? { className } : {})} />;
  if (availability === 'pick-only') {
    return (
      <Badge variant="outline" className={className} data-availability="pick-only">
        Pick-only
        <span className="sr-only">
          , you can choose it in Side by side but will not meet it in a blind battle
        </span>
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className={className} data-availability="not-chat">
      Not a chat model
      <span className="sr-only">, a safety classifier or adapter base, not drawn for battles</span>
    </Badge>
  );
}
