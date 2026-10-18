import { DEMO_PROMPTS } from '@/content/demo';

/** Answer lines as skeleton bars: [width %, row] per side. */
const LINES = {
  a: [92, 100, 86, 97, 74, 90, 58],
  b: [96, 88, 100, 64],
} as const;

/**
 * The hero's picture of a battle, for wide screens: a prompt, two anonymous answers still
 * streaming, the names hidden, and the vote bar. It is an illustration (skeleton text, no model
 * output and no names), so it is hidden from assistive technology; the working demo is further down.
 */
export function BattlePreview() {
  return (
    <div aria-hidden="true" className="battle-preview pointer-events-none relative hidden select-none xl:block">
      <div className="battle-preview-card rounded-[22px] border border-line bg-surface/70 shadow-[0_50px_120px_-40px_rgb(0_0_0/0.95),0_0_0_1px_rgb(255_255_255/0.02)_inset] backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-line-soft px-5 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
          <span className="inline-flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-cyan" />
            <span className="size-1.5 rounded-full bg-violet" />
            Battle
          </span>
          <span>Names hidden</span>
        </div>

        <div className="px-5 pt-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">You asked</p>
          <p className="mt-1.5 text-[15px] leading-snug text-fg">{DEMO_PROMPTS[0].prompt}</p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-px border-y border-line-soft bg-line-soft">
          {(['a', 'b'] as const).map(side => (
            <div key={side} className="bg-surface px-4 py-4">
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] ${side === 'a' ? 'text-cyan' : 'text-violet-text'}`}
                >
                  <span className={`size-1.5 rounded-full ${side === 'a' ? 'bg-cyan' : 'bg-violet'}`} />
                  Model {side.toUpperCase()}
                </span>
                <span className="font-mono text-[10px] tracking-[0.1em] text-muted/70">▒▒▒▒▒▒</span>
              </div>
              <div className="mt-3.5 space-y-2">
                {LINES[side].map((width, row) => (
                  <span
                    key={row}
                    className="preview-line block h-[7px] rounded-full bg-fg/[0.15]"
                    style={{ width: `${width}%`, animationDelay: `${row * 220 + (side === 'b' ? 110 : 0)}ms` }}
                  />
                ))}
                <span
                  className={`caret ml-0 block h-[11px] w-[6px] rounded-[2px] ${side === 'a' ? 'text-cyan' : 'text-violet-text'}`}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-4 gap-1.5 p-3">
          {['A is better', 'Tie', 'Both bad', 'B is better'].map(label => (
            <span
              key={label}
              className={`grid h-9 place-items-center rounded-[10px] border text-[11.5px] font-medium ${
                label === 'B is better'
                  ? 'preview-pick border-cyan/60 bg-cyan/10 text-fg'
                  : 'border-line bg-ink/50 text-muted'
              }`}
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="absolute -bottom-5 left-8 rounded-full border border-line bg-elevated/90 px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-fg-soft shadow-[0_12px_30px_-12px_rgb(0_0_0/0.9)] backdrop-blur">
        Vote first. <span className="text-cyan">Then the names.</span>
      </div>
    </div>
  );
}
