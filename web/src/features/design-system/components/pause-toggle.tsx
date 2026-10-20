import { Pause, Play } from 'lucide-react';

/** The visible control every looping animation needs (WCAG 2.2.2 Pause, Stop, Hide). */
export function PauseToggle({
  paused,
  onToggle,
  label,
}: {
  paused: boolean;
  onToggle: () => void;
  /** What moves, for the accessible name: "Pause prompts". */
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line px-3 text-caption font-medium text-fg-soft transition-colors duration-(--dur-fast) hover:border-line-strong hover:text-fg"
    >
      {paused ? (
        <Play aria-hidden="true" className="size-3.5" strokeWidth={2} />
      ) : (
        <Pause aria-hidden="true" className="size-3.5" strokeWidth={2} />
      )}
      {paused ? `Play ${label}` : `Pause ${label}`}
    </button>
  );
}
