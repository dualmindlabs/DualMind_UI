/**
 * The landing page's Open Graph card (1200 x 630), drawn with the site's own fonts and tokens.
 * landing.spec.ts loads `/` (so the fonts and CSS variables are there), swaps the body for this
 * markup and takes the screenshot uploaded as `og-landing.png`; the file committed to
 * web/public/og/landing.png comes from that artifact. Inline styles only: the page's CSS has no
 * classes for this layout, and the enforced CSP allows style attributes.
 */
export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

const emblem = `
<svg viewBox="0 0 32 32" width="56" height="56" aria-hidden="true">
  <path d="M16 9.37A7.5 7.5 0 0 1 16 22.63A7.5 7.5 0 0 1 16 9.37Z" style="fill: var(--human-tint)" />
  <g fill="none" stroke-width="2">
    <circle cx="12.5" cy="16" r="7.5" style="stroke: var(--mind-a)" />
    <circle cx="19.5" cy="16" r="7.5" style="stroke: var(--mind-b)" />
  </g>
  <circle cx="16" cy="16" r="2" style="fill: var(--human)" />
</svg>`;

function pane(letter: 'A' | 'B', color: string, widths: number[]) {
  const lines = widths
    .map(
      width =>
        `<div style="height: 9px; width: ${width}%; border-radius: 999px; background: var(--line-subtle)"></div>`,
    )
    .join('');
  return `
  <div style="display: flex; flex-direction: column; gap: 14px; padding: 22px 24px; border-radius: 16px; border: 1px solid color-mix(in oklab, ${color} 45%, transparent); background: var(--surface-2); box-shadow: var(--raise-strong)">
    <div style="display: flex; align-items: center; gap: 12px">
      <span style="display: grid; place-items: center; width: 30px; height: 30px; border-radius: 999px; background: ${color}; color: var(--on-accent); font: 500 15px var(--font-mono)">${letter}</span>
      <span style="font: 600 17px var(--font-sans); color: ${letter === 'A' ? 'var(--mind-a)' : 'var(--mind-b-text)'}">Answer ${letter}</span>
      <span style="margin-left: auto; font: 500 12px var(--font-mono); letter-spacing: 0.2em; text-transform: uppercase; color: var(--muted)">Name hidden</span>
    </div>
    ${lines}
  </div>`;
}

export const OG_TEMPLATE = `
<div id="og-card" style="position: relative; isolation: isolate; overflow: hidden; width: ${OG_WIDTH}px; height: ${OG_HEIGHT}px; background: var(--bg-deep); color: var(--fg); font-family: var(--font-sans)">
  <div style="position: absolute; inset: 0; z-index: -1; background:
    radial-gradient(closest-side, color-mix(in oklab, var(--mind-a) 38%, transparent), transparent) -280px -330px / 900px 760px no-repeat,
    radial-gradient(closest-side, color-mix(in oklab, var(--mind-b) 42%, transparent), transparent) calc(100% + 280px) -330px / 900px 760px no-repeat;
    filter: blur(8px)"></div>
  <div style="position: absolute; inset: 0; z-index: -1; opacity: 0.8; background:
    conic-gradient(from 112deg at 6% -14%, transparent 0deg, color-mix(in oklab, var(--mind-a) 22%, transparent) 7deg, transparent 13deg, color-mix(in oklab, var(--mind-a) 12%, transparent) 21deg, transparent 29deg, color-mix(in oklab, var(--mind-a) 18%, transparent) 36deg, transparent 46deg),
    conic-gradient(from 186deg at 94% -14%, transparent 0deg, color-mix(in oklab, var(--mind-b) 12%, transparent) 9deg, transparent 17deg, color-mix(in oklab, var(--mind-b) 22%, transparent) 25deg, transparent 33deg, color-mix(in oklab, var(--mind-b) 14%, transparent) 41deg, transparent 50deg);
    -webkit-mask-image: linear-gradient(to bottom, black 20%, transparent 85%); mask-image: linear-gradient(to bottom, black 20%, transparent 85%)"></div>
  <div style="position: absolute; inset: 0; z-index: -1; opacity: 0.35; background-image: radial-gradient(color-mix(in oklab, var(--fg) 13%, transparent) 1px, transparent 1.2px); background-size: 24px 24px; -webkit-mask-image: radial-gradient(ellipse 70% 70% at 30% 60%, black, transparent); mask-image: radial-gradient(ellipse 70% 70% at 30% 60%, black, transparent)"></div>

  <div style="position: absolute; left: 72px; top: 64px; display: flex; align-items: center; gap: 16px">
    ${emblem}
    <span style="font: 800 22px var(--font-sans); letter-spacing: 0.12em; text-transform: uppercase; line-height: 1">DualMind <span style="color: var(--mind-a)">Arena</span></span>
  </div>

  <div style="position: absolute; left: 72px; top: 196px; width: 640px">
    <div style="font-weight: 300; font-size: 82px; line-height: 0.98; letter-spacing: -0.045em">Two models.<br />One prompt.</div>
    <div style="margin-top: 6px; font: italic 400 84px/1.05 var(--font-serif); letter-spacing: -0.01em; color: var(--human)">You decide.</div>
  </div>

  <div style="position: absolute; left: 72px; bottom: 60px; display: flex; align-items: center; gap: 18px; font: 500 15px var(--font-mono); letter-spacing: 0.2em; text-transform: uppercase; color: var(--fg-soft)">
    <span>arena.dualmindlab.tech</span>
    <span style="width: 1px; height: 16px; background: var(--line-strong)"></span>
    <span style="color: var(--muted)">Blind battles · public Elo</span>
  </div>

  <div style="position: absolute; right: 72px; top: 150px; width: 380px; display: grid; gap: 18px">
    ${pane('A', 'var(--mind-a)', [92, 78, 86, 54])}
    ${pane('B', 'var(--mind-b)', [88, 70, 80, 46])}
    <div style="justify-self: end; display: flex; align-items: center; gap: 10px; padding: 10px 16px; border-radius: 999px; border: 1px solid color-mix(in oklab, var(--human) 55%, transparent); background: var(--human-tint); font: 500 13px var(--font-mono); letter-spacing: 0.2em; text-transform: uppercase; color: var(--human)">
      <span style="width: 8px; height: 8px; border-radius: 999px; background: var(--human)"></span>
      Your verdict
    </div>
  </div>
</div>`;
