import type { ReactNode } from 'react';

export function SectionHeading({
  id,
  index,
  label,
  children,
  lede,
}: {
  id: string;
  index: string;
  label: string;
  children: ReactNode;
  lede?: ReactNode;
}) {
  return (
    <div className="max-w-[760px]">
      <p className="eyebrow flex items-center gap-3">
        <span className="text-cyan">{index}</span>
        <span className="h-px w-8 bg-line" aria-hidden="true" />
        {label}
      </p>
      <h2
        id={id}
        className="mt-5 text-[clamp(2.1rem,4.8vw,3.9rem)] leading-[1] font-light tracking-[-0.038em] text-fg"
      >
        {children}
      </h2>
      {lede && <p className="mt-5 max-w-[56ch] text-[16px] leading-relaxed text-fg-soft sm:text-[17px]">{lede}</p>}
    </div>
  );
}
