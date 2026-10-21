/**
 * The share page's Open Graph card (1200 x 630, slice S11): one static, branded image for every
 * shared battle (a per-battle image is BE-19). share.spec.ts loads `/` (for the fonts and CSS
 * variables), lays this markup over the page and takes the screenshot uploaded as
 * `og-share.png`; the file committed to web/public/og/share.png comes from that artifact. Same
 * look as the landing card (og-template.ts): inline styles only, which the enforced CSP allows.
 */
import { OG_HEIGHT, OG_WIDTH } from './og-template';

export { OG_HEIGHT, OG_WIDTH };

const emblem = `
<svg viewBox="0 0 32 32" width="52" height="52" aria-hidden="true">
  <path d="M16 9.37A7.5 7.5 0 0 1 16 22.63A7.5 7.5 0 0 1 16 9.37Z" style="fill: var(--human-tint)" />
  <g fill="none" stroke-width="2">
    <circle cx="12.5" cy="16" r="7.5" style="stroke: var(--mind-a)" />
    <circle cx="19.5" cy="16" r="7.5" style="stroke: var(--mind-b)" />
  </g>
  <circle cx="16" cy="16" r="2" style="fill: var(--human)" />
</svg>`;

function pane(letter: 'A' | 'B', picked: boolean, widths: number[]) {
  const color = letter === 'A' ? 'var(--mind-a)' : 'var(--mind-b)';
  const border = picked
    ? 'border: 1.5px solid var(--human); box-shadow: 0 0 0 4px color-mix(in oklab, var(--human) 18%, transparent), var(--raise-strong)'
    : `border: 1px solid color-mix(in oklab, ${color} 45%, transparent); box-shadow: var(--raise-strong)`;
  const lines = widths
    .map(
      width =>
        `<div style="height: 9px; width: ${width}%; border-radius: 999px; background: var(--line-subtle)"></div>`,
    )
    .join('');
  return `
  <div style="display: flex; flex-direction: column; gap: 13px; padding: 20px 22px; border-radius: 16px; background: var(--surface-2); ${border}">
    <div style="display: flex; align-items: center; gap: 12px">
      <span style="display: grid; place-items: center; width: 28px; height: 28px; border-radius: 999px; background: ${color}; color: var(--on-accent); font: 500 14px var(--font-mono)">${letter}</span>
      <span style="font: 600 16px var(--font-sans); color: ${letter === 'A' ? 'var(--mind-a)' : 'var(--mind-b-text)'}">Answer ${letter}</span>
      ${
        picked
          ? '<span style="margin-left: auto; padding: 5px 11px; border-radius: 999px; border: 1px solid color-mix(in oklab, var(--human) 55%, transparent); background: var(--human-tint); font: 500 11px var(--font-mono); letter-spacing: 0.2em; text-transform: uppercase; color: var(--human)">Picked</span>'
          : ''
      }
    </div>
    ${lines}
  </div>`;
}

export const OG_SHARE_TEMPLATE = `
<div id="og-card" style="position: relative; isolation: isolate; overflow: hidden; width: ${OG_WIDTH}px; height: ${OG_HEIGHT}px; background: var(--bg-deep); color: var(--fg); font-family: var(--font-sans)">
  <div style="position: absolute; inset: 0; z-index: -1; background:
    radial-gradient(closest-side, color-mix(in oklab, var(--mind-a) 34%, transparent), transparent) -300px -340px / 900px 760px no-repeat,
    radial-gradient(closest-side, color-mix(in oklab, var(--mind-b) 38%, transparent), transparent) calc(100% + 300px) -340px / 900px 760px no-repeat,
    radial-gradient(closest-side, color-mix(in oklab, var(--human) 16%, transparent), transparent) calc(100% + 120px) calc(100% + 260px) / 760px 620px no-repeat;
    filter: blur(8px)"></div>
  <div style="position: absolute; inset: 0; z-index: -1; opacity: 0.35; background-image: radial-gradient(color-mix(in oklab, var(--fg) 13%, transparent) 1px, transparent 1.2px); background-size: 24px 24px; -webkit-mask-image: radial-gradient(ellipse 70% 70% at 30% 60%, black, transparent); mask-image: radial-gradient(ellipse 70% 70% at 30% 60%, black, transparent)"></div>

  <div style="position: absolute; left: 72px; top: 62px; display: flex; align-items: center; gap: 16px">
    ${emblem}
    <span style="font: 800 21px var(--font-sans); letter-spacing: 0.12em; text-transform: uppercase; line-height: 1">DualMind <span style="color: var(--mind-a)">Arena</span></span>
  </div>

  <div style="position: absolute; left: 72px; top: 178px; width: 600px">
    <div style="display: flex; align-items: center; gap: 12px; font: 500 14px var(--font-mono); letter-spacing: 0.22em; text-transform: uppercase; color: var(--mind-a)">
      <span style="width: 28px; height: 1px; background: currentColor"></span>
      Shared battle
    </div>
    <div style="margin-top: 22px; font-weight: 300; font-size: 66px; line-height: 1.02; letter-spacing: -0.04em">Two anonymous<br />models answered.</div>
    <div style="margin-top: 8px; font: italic 400 70px/1.08 var(--font-serif); letter-spacing: -0.01em; color: var(--human)">See which one won.</div>
  </div>

  <div style="position: absolute; left: 72px; bottom: 58px; display: flex; align-items: center; gap: 18px; font: 500 15px var(--font-mono); letter-spacing: 0.2em; text-transform: uppercase; color: var(--fg-soft)">
    <span>arena.dualmindlab.tech</span>
    <span style="width: 1px; height: 16px; background: var(--line-strong)"></span>
    <span style="color: var(--muted)">Run your own battle</span>
  </div>

  <div style="position: absolute; right: 72px; top: 132px; width: 392px; display: grid; gap: 18px">
    ${pane('A', false, [90, 76, 84, 52])}
    ${pane('B', true, [86, 72, 80, 60])}
    <div style="justify-self: end; display: flex; align-items: center; gap: 10px; padding: 10px 16px; border-radius: 999px; border: 1px solid color-mix(in oklab, var(--human) 55%, transparent); background: var(--human-tint); font: 500 13px var(--font-mono); letter-spacing: 0.2em; text-transform: uppercase; color: var(--human)">
      <span style="width: 8px; height: 8px; border-radius: 999px; background: var(--human)"></span>
      Verdict: B is better
    </div>
  </div>
</div>`;
