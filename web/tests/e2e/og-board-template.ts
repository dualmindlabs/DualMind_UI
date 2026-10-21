/**
 * The Open Graph cards for /leaderboard/ and /models/ (1200 x 630), drawn with the site's own
 * fonts and tokens like the landing and share cards (og-template.ts, og-share-template.ts).
 * leaderboard.spec.ts loads the page (for the fonts and CSS variables), lays the markup over it
 * and takes the screenshots uploaded as `og-leaderboard.png` and `og-models.png`; the files
 * committed to web/public/og/ come from that artifact. The pictures are decorative and carry no
 * numbers and no model names (nothing on a static image can stay true); inline styles only,
 * which the enforced CSP allows.
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

function frame(eyebrow: string, lines: [string, string], tagline: string, art: string) {
  return `
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
      ${eyebrow}
    </div>
    <div style="margin-top: 22px; font-weight: 300; font-size: 66px; line-height: 1.02; letter-spacing: -0.04em">${lines[0]}</div>
    <div style="margin-top: 8px; font: italic 400 70px/1.08 var(--font-serif); letter-spacing: -0.01em; color: var(--human)">${lines[1]}</div>
  </div>

  <div style="position: absolute; left: 72px; bottom: 58px; display: flex; align-items: center; gap: 18px; font: 500 15px var(--font-mono); letter-spacing: 0.2em; text-transform: uppercase; color: var(--fg-soft)">
    <span>arena.dualmindlab.tech</span>
    <span style="width: 1px; height: 16px; background: var(--line-strong)"></span>
    <span style="color: var(--muted)">${tagline}</span>
  </div>

  ${art}
</div>`;
}

function bar(width: number, tone: string) {
  return `<div style="height: 10px; width: ${width}%; border-radius: 999px; background: ${tone}"></div>`;
}

function rankRow(rank: string, width: number, lead: boolean) {
  const border = lead
    ? 'border: 1px solid color-mix(in oklab, var(--mind-a) 55%, transparent); box-shadow: 0 0 0 4px color-mix(in oklab, var(--mind-a) 14%, transparent), var(--raise-strong)'
    : 'border: 1px solid var(--line); box-shadow: var(--raise-strong)';
  return `
  <div style="display: grid; grid-template-columns: 44px 1fr; align-items: center; gap: 18px; padding: 20px 22px; border-radius: 16px; background: var(--surface-2); ${border}">
    <span style="font: 500 30px var(--font-mono); letter-spacing: -0.02em; color: ${lead ? 'var(--mind-a)' : 'var(--fg-soft)'}">${rank}</span>
    <div style="display: grid; gap: 12px">
      <div style="height: 12px; width: 62%; border-radius: 999px; background: var(--line-strong)"></div>
      ${bar(width, lead ? 'var(--mind-a)' : 'var(--line-subtle)')}
    </div>
  </div>`;
}

function modelTile(width: number, tone: string) {
  return `
  <div style="display: grid; gap: 12px; padding: 18px; border-radius: 14px; border: 1px solid var(--line); background: var(--surface-2); box-shadow: var(--raise-strong)">
    <div style="height: 9px; width: 42%; border-radius: 999px; background: ${tone}"></div>
    <div style="height: 12px; width: 78%; border-radius: 999px; background: var(--line-strong)"></div>
    ${bar(width, 'var(--line-subtle)')}
  </div>`;
}

export const OG_LEADERBOARD_TEMPLATE = frame(
  'Leaderboard',
  ['Ranked by blind votes.', 'Elo, not opinion.'],
  'Public Elo · Live',
  `<div style="position: absolute; right: 72px; top: 132px; width: 400px; display: grid; gap: 18px">
    ${rankRow('01', 88, true)}
    ${rankRow('02', 74, false)}
    ${rankRow('03', 61, false)}
    ${rankRow('04', 47, false)}
  </div>`,
);

export const OG_MODELS_TEMPLATE = frame(
  'Models',
  ['Every model in', 'the Arena.'],
  'Live from the Arena',
  `<div style="position: absolute; right: 72px; top: 132px; width: 420px; display: grid; grid-template-columns: 1fr 1fr; gap: 18px">
    ${modelTile(82, 'var(--mind-a)')}
    ${modelTile(64, 'var(--mind-b)')}
    ${modelTile(70, 'var(--mind-b)')}
    ${modelTile(52, 'var(--mind-a)')}
    ${modelTile(76, 'var(--human)')}
    ${modelTile(58, 'var(--mind-a)')}
  </div>`,
);
