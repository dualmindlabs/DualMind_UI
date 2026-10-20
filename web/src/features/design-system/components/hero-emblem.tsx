import { cn } from '@/lib/utils/cn';

/**
 * Two minds and the verdict between them: Mind A and Mind B as two circles of equal size, the
 * human's terra point where they overlap. Decorative. The circles draw in once on load; with
 * reduced motion they are simply there.
 */
export function HeroEmblem({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 440 340"
      className={cn('h-auto', className)}
      aria-hidden="true"
      focusable="false"
    >
      <g className="fill-none stroke-line" strokeWidth="1">
        <line x1="8" x2="432" y1="170" y2="170" strokeDasharray="2 6" />
        <line x1="220" x2="220" y1="20" y2="320" strokeDasharray="2 6" />
        <circle cx="160" cy="170" r="84" />
        <circle cx="280" cy="170" r="84" />
      </g>
      <path
        d="M220 56.93 A128 128 0 0 1 220 283.07 A128 128 0 0 1 220 56.93 Z"
        className="fill-human-tint"
      />
      <g className="fill-none" strokeWidth="1.5" strokeLinecap="round">
        <circle
          cx="160"
          cy="170"
          r="128"
          strokeDasharray="805"
          className="animate-draw stroke-mind-a [--dash:805]"
        />
        <circle
          cx="280"
          cy="170"
          r="128"
          strokeDasharray="805"
          className="animate-draw stroke-mind-b [--dash:805] [animation-delay:160ms]"
        />
        <circle cx="220" cy="170" r="15" className="stroke-human" strokeOpacity="0.5" />
      </g>
      <circle cx="160" cy="170" r="2.5" className="fill-mind-a" />
      <circle cx="280" cy="170" r="2.5" className="fill-mind-b" />
      <circle cx="220" cy="170" r="5" className="fill-human" />
      <g className="font-mono" fontSize="11" letterSpacing="2.8">
        <text x="52" y="44" className="fill-mind-a">
          MIND A
        </text>
        <text x="388" y="44" className="fill-mind-b-text" textAnchor="end">
          MIND B
        </text>
        <text x="220" y="212" className="fill-human" textAnchor="middle">
          VERDICT
        </text>
      </g>
    </svg>
  );
}
