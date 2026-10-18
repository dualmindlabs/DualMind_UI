import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
} as const;

export const ArrowRight = (props: IconProps) => (
  <svg {...base} strokeWidth={2.4} {...props}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export const ArrowUpRight = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M7 17 17 7M8 7h9v9" />
  </svg>
);

export const ArrowUp = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M12 19V5M6 11l6-6 6 6" />
  </svg>
);

export const Check = (props: IconProps) => (
  <svg {...base} strokeWidth={2.2} {...props}>
    <path d="m5 12.5 4.2 4.2L19 7" />
  </svg>
);

export const Alert = (props: IconProps) => (
  <svg {...base} {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5v5.5M12 16.5h.01" />
  </svg>
);

export const Info = (props: IconProps) => (
  <svg {...base} {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5.5M12 7.5h.01" />
  </svg>
);

export const Spinner = (props: IconProps) => (
  <svg {...base} strokeWidth={2.4} {...props}>
    <path d="M12 3a9 9 0 1 0 9 9" />
  </svg>
);

/** Two overlapping minds: one cyan, one violet. */
export const TwoMinds = (props: IconProps) => (
  <svg viewBox="0 0 32 32" fill="none" aria-hidden focusable={false} {...props}>
    <circle cx="12" cy="16" r="8.5" stroke="#00D9FF" strokeWidth="1.6" />
    <circle cx="20" cy="16" r="8.5" stroke="#A78BFA" strokeWidth="1.6" />
    <path d="M16 9.1a8.5 8.5 0 0 1 0 13.8 8.5 8.5 0 0 1 0-13.8Z" fill="url(#tm)" opacity="0.55" />
    <defs>
      <linearGradient id="tm" x1="12" y1="9" x2="20" y2="23" gradientUnits="userSpaceOnUse">
        <stop stopColor="#00D9FF" />
        <stop offset="1" stopColor="#8B5CF6" />
      </linearGradient>
    </defs>
  </svg>
);

/** A rating line stepping up. */
export const Rating = (props: IconProps) => (
  <svg viewBox="0 0 32 32" fill="none" aria-hidden focusable={false} {...props}>
    <path d="M4 25h24" stroke="#2A3038" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M5 21.5 11 18l5 2.5 6-8 5 1.5" stroke="#00D9FF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="22" cy="12.5" r="2.2" fill="#0F1115" stroke="#A78BFA" strokeWidth="1.6" />
  </svg>
);

/** Brackets around a dot: open data. */
export const OpenData = (props: IconProps) => (
  <svg viewBox="0 0 32 32" fill="none" aria-hidden focusable={false} {...props}>
    <path d="M10 7H7v18h3M22 7h3v18h-3" stroke="#00D9FF" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 16h8M12 12h5M12 20h6" stroke="#A78BFA" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);
