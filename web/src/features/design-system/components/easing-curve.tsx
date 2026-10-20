import type { EasingToken } from '@/styles/tokens';

/** An easing token drawn as its cubic-bezier curve (time across, progress up). */
export function EasingCurve({ easing }: { easing: EasingToken }) {
  const [x1, y1, x2, y2] = easing.points;
  const path = `M0 100 C${x1 * 100} ${100 - y1 * 100} ${x2 * 100} ${100 - y2 * 100} 100 0`;

  return (
    <figure className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-5 shadow-raise">
      <svg viewBox="-6 -6 112 112" className="aspect-square w-full max-w-36" aria-hidden="true">
        <rect x="0" y="0" width="100" height="100" className="fill-none stroke-line" />
        <path d="M0 100 L100 0" className="fill-none stroke-line" strokeDasharray="2 4" />
        <path
          d={path}
          className="fill-none stroke-mind-a"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx="0" cy="100" r="3" className="fill-mind-a" />
        <circle cx="100" cy="0" r="3" className="fill-mind-a" />
      </svg>
      <figcaption>
        <code className="text-caption text-fg">{easing.name}</code>
        <p className="font-code text-caption text-muted">
          cubic-bezier({easing.points.join(', ')})
        </p>
        <p className="mt-1 text-ui-sm text-fg-soft">{easing.use}</p>
      </figcaption>
    </figure>
  );
}
