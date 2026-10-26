// /problems and /problems/<slug> as a styled web page, for people who follow a problem `type`
// URL from an error body in a browser. Machines keep the Markdown (problems.ts): the route picks
// this page only when the request's Accept header names text/html. Self-contained (inline CSS
// and one tiny theme script, no assets) so it needs nothing from the web build, and pure: it
// reads the registry in server/problem-types.js and nothing else.

import { PROBLEM_TYPES, problemTypeUrl } from '../../problem-types.js';
import type { ProblemSlug } from '../problems.ts';

/** True when the caller asks for a web page: Accept names text/html and not text/markdown first. */
export function prefersHtml(accept: string | null): boolean {
  if (!accept) return false;
  const ranges = accept.split(',').map(part => part.trim().toLowerCase());
  const html = ranges.findIndex(range => range.startsWith('text/html'));
  if (html === -1) return false;
  const markdown = ranges.findIndex(range => range.startsWith('text/markdown'));
  return markdown === -1 || html < markdown;
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, char => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });
}

/** Registry text to HTML: escaped, with `code` spans. */
function inline(text: string): string {
  return escapeHtml(text).replace(/`([^`]+)`/g, '<code>$1</code>');
}

function sentence(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const slugs = Object.keys(PROBLEM_TYPES) as ProblemSlug[];

function statusClass(status: number): 'client' | 'server' {
  return status >= 500 ? 'server' : 'client';
}

const CSS = `
:root{color-scheme:dark light;--bg:#08090b;--bg-deep:#050608;--surface:#101216;--surface-2:#161920;--line:#242831;--line-strong:#363b47;--fg:#f2f4f7;--fg-soft:#b4bac6;--muted:#8d94a3;--a:#4aabc2;--b:#e0a07c;--bad:#ee8e8e;--on-accent:#06161a;--code:#0b0d11;--shadow:0 1px 0 rgba(255,255,255,.05) inset,0 12px 32px -12px rgba(0,0,0,.6);--mesh:.09}
:root[data-theme=light]{color-scheme:light;--bg:#f7f8fa;--bg-deep:#eef0f4;--surface:#fff;--surface-2:#f1f3f6;--line:#dfe3ea;--line-strong:#c4cad6;--fg:#10131a;--fg-soft:#434a59;--muted:#5d6577;--a:#0b6b80;--b:#9e4d25;--bad:#b3261e;--on-accent:#fff;--code:#f1f3f6;--shadow:0 1px 2px rgba(16,19,26,.06),0 12px 28px -14px rgba(16,19,26,.18);--mesh:.07}
@media (prefers-color-scheme:light){:root:not([data-theme=dark]){color-scheme:light;--bg:#f7f8fa;--bg-deep:#eef0f4;--surface:#fff;--surface-2:#f1f3f6;--line:#dfe3ea;--line-strong:#c4cad6;--fg:#10131a;--fg-soft:#434a59;--muted:#5d6577;--a:#0b6b80;--b:#9e4d25;--bad:#b3261e;--on-accent:#fff;--code:#f1f3f6;--shadow:0 1px 2px rgba(16,19,26,.06),0 12px 28px -14px rgba(16,19,26,.18);--mesh:.07}}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;min-height:100svh;background:var(--bg);color:var(--fg-soft);font:400 1rem/1.65 Geist,ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;-webkit-font-smoothing:antialiased}
a{color:var(--a);text-underline-offset:.2em}
a:focus-visible,summary:focus-visible{outline:2px solid var(--a);outline-offset:3px;border-radius:6px}
code,pre,.mono{font-family:"Geist Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
code{font-size:.875em;padding:.1em .4em;border-radius:5px;background:var(--code);border:1px solid var(--line);color:var(--fg)}
.skip{position:absolute;left:-999px;top:8px;background:var(--surface-2);color:var(--fg);padding:10px 16px;border-radius:8px;z-index:9}
.skip:focus{left:12px}
.bar{display:flex;align-items:center;gap:16px;max-width:72rem;margin:0 auto;padding:18px 16px}
.brand{font-weight:700;letter-spacing:.14em;font-size:.8125rem;color:var(--fg);text-decoration:none}
.brand b{color:var(--a);font-weight:700}
.bar nav{margin-left:auto;display:flex;gap:6px;flex-wrap:wrap}
.bar nav a{color:var(--fg-soft);text-decoration:none;font-size:.875rem;font-weight:500;padding:8px 12px;border-radius:999px}
.bar nav a:hover{color:var(--fg);background:var(--surface-2)}
.hero{position:relative;isolation:isolate;overflow:hidden;border-bottom:1px solid var(--line);background:radial-gradient(52rem 26rem at 12% -4%,color-mix(in oklab,var(--a) calc(var(--mesh)*170%),transparent),transparent 70%),radial-gradient(52rem 26rem at 88% -4%,color-mix(in oklab,var(--b) calc(var(--mesh)*170%),transparent),transparent 70%),var(--bg-deep)}
.hero::before{content:"";position:absolute;inset:0;z-index:-1;background-image:linear-gradient(to right,color-mix(in oklab,var(--fg) 7%,transparent) 1px,transparent 1px),linear-gradient(to bottom,color-mix(in oklab,var(--fg) 7%,transparent) 1px,transparent 1px);background-size:56px 56px;-webkit-mask-image:radial-gradient(ellipse 80% 70% at 50% 0,#000 30%,transparent 100%);mask-image:radial-gradient(ellipse 80% 70% at 50% 0,#000 30%,transparent 100%)}
.wrap{max-width:72rem;margin:0 auto;padding:0 16px}
.hero .wrap{padding-top:clamp(2.5rem,7vw,5rem);padding-bottom:clamp(2.5rem,7vw,4.5rem)}
.kicker{display:inline-flex;align-items:center;gap:12px;margin:0 0 18px;font-size:.875rem;font-weight:500;color:var(--fg-soft)}
.kicker::before{content:"";width:24px;height:1px;background:currentColor;opacity:.55}
h1{margin:0;color:var(--fg);font-weight:600;letter-spacing:-.045em;line-height:1;font-size:clamp(2.5rem,1.7rem + 3.6vw,4.5rem);text-wrap:balance}
.lead{max-width:60ch;margin:20px 0 0;font-size:clamp(1.0625rem,1rem + .4vw,1.25rem);line-height:1.55;color:var(--fg-soft);text-wrap:pretty}
.crumb{margin:0 0 20px;font-size:.875rem;color:var(--muted)}
.crumb a{color:var(--fg-soft)}
main{padding:clamp(2rem,5vw,3.5rem) 0 clamp(3rem,7vw,5rem)}
.grid{list-style:none;margin:0;padding:0;display:grid;gap:14px;grid-template-columns:repeat(auto-fill,minmax(min(100%,19rem),1fr))}
.card{position:relative;display:flex;flex-direction:column;gap:10px;height:100%;padding:20px;border:1px solid var(--line);border-radius:14px;background:linear-gradient(180deg,color-mix(in oklab,var(--fg) 4%,var(--surface)),var(--surface));box-shadow:var(--shadow);text-decoration:none;color:var(--fg-soft);transition:transform .16s cubic-bezier(.2,.8,.2,1),border-color .16s}
.card:hover{border-color:var(--line-strong)}
@media (hover:hover) and (prefers-reduced-motion:no-preference){.card:hover{transform:translateY(-2px)}}
.card.client{border-top:2px solid var(--b)}
.card.server{border-top:2px solid var(--bad)}
.card h2{margin:0;font-size:1.125rem;font-weight:600;letter-spacing:-.02em;color:var(--fg)}
.card p{margin:0;font-size:.9375rem;line-height:1.55}
.slug{font-size:.8125rem;color:var(--muted)}
.status{font-family:"Geist Mono",ui-monospace,monospace;font-weight:600;font-size:1.75rem;letter-spacing:-.04em;line-height:1}
.client .status{color:var(--b)}
.server .status{color:var(--bad)}
.more{margin-top:auto;font-size:.875rem;font-weight:500;color:var(--a)}
.detail{display:grid;gap:28px;grid-template-columns:minmax(0,1fr);max-width:48rem}
.detail h2{margin:0 0 8px;font-size:.8125rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);font-family:"Geist Mono",ui-monospace,monospace}
.detail p{margin:0;font-size:1.0625rem;color:var(--fg-soft);max-width:62ch;text-wrap:pretty}
.big{display:flex;align-items:baseline;gap:16px;flex-wrap:wrap;margin-bottom:16px}
.big .status{font-size:clamp(3rem,10vw,6rem);letter-spacing:-.06em}
.pill{display:inline-block;padding:4px 10px;border:1px solid var(--line-strong);border-radius:999px;font-size:.8125rem;color:var(--fg-soft);background:var(--surface-2)}
pre{margin:0;padding:18px 20px;overflow-x:auto;border:1px solid var(--line);border-radius:12px;background:var(--code);color:var(--fg);font-size:.8125rem;line-height:1.7;box-shadow:var(--shadow)}
.pager{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;max-width:48rem;margin-top:clamp(2rem,5vw,3.5rem);padding-top:24px;border-top:1px solid var(--line);font-size:.9375rem}
.note{margin-top:clamp(2rem,5vw,3rem);padding:16px 20px;border:1px dashed var(--line-strong);border-radius:12px;font-size:.9375rem;color:var(--fg-soft)}
footer{border-top:1px solid var(--line);padding:24px 0 40px;font-size:.875rem;color:var(--muted)}
footer .wrap{display:flex;gap:8px 20px;flex-wrap:wrap}
footer a{color:var(--fg-soft)}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}
`;

// Sets data-theme from the site's stored preference before first paint (the web app's key).
const THEME_SCRIPT = `try{var t=localStorage.getItem('dm.theme');if(t==='dark'||t==='light')document.documentElement.setAttribute('data-theme',t)}catch(e){}`;

function page(options: { title: string; description: string; canonical: string; hero: string; body: string }): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>${escapeHtml(options.title)}</title>
<meta name="description" content="${escapeHtml(options.description)}">
<link rel="canonical" href="${escapeHtml(options.canonical)}">
<meta name="robots" content="index, follow">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<script>${THEME_SCRIPT}</script>
<style>${CSS}</style>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header>
<div class="bar">
<a class="brand" href="/" aria-label="DualMind Arena, home">DUALMIND <b>ARENA</b></a>
<nav aria-label="Main"><a href="/developers/">API reference</a><a href="/leaderboard/">Leaderboard</a><a href="/">Arena</a></nav>
</div>
</header>
<section class="hero"><div class="wrap">${options.hero}</div></section>
<main id="main"><div class="wrap">${options.body}</div></main>
<footer><div class="wrap"><span>Every error under <code>/api/v2</code> is <code>application/problem+json</code> (RFC 9457).</span><a href="/developers/#problems">API reference</a><a href="/llms.txt">llms.txt</a><span>Agents: send <code>Accept: text/markdown</code> for plain text.</span></div></footer>
</body>
</html>
`;
}

export function renderProblemIndexHtml(origin: string): string {
  const cards = slugs
    .map(slug => {
      const entry = PROBLEM_TYPES[slug]!;
      return `<li><a class="card ${statusClass(entry.status)}" href="/problems/${slug}"><span class="status">${entry.status}</span><h2>${escapeHtml(entry.title)}</h2><p>${inline(sentence(entry.usedFor))}.</p><span class="slug mono">${slug}</span><span class="more">What to do</span></a></li>`;
    })
    .join('');
  return page({
    title: 'Problem types · DualMind Arena API',
    description: 'Every error the DualMind Arena API sends names one of these problem types: what it means and what to do about it.',
    canonical: `${origin}/problems/`,
    hero: `<p class="kicker">API reference</p><h1>Problem types</h1><p class="lead">Every error under <code>/api/v2</code> is a problem (RFC 9457) whose <code>type</code> is one of these identifiers. Open one to see what it means and what to do next.</p>`,
    body: `<ul class="grid">${cards}</ul>`,
  });
}

export function renderProblemPageHtml(slug: ProblemSlug, origin: string): string {
  const entry = PROBLEM_TYPES[slug]!;
  const index = slugs.indexOf(slug);
  const prev = index > 0 ? slugs[index - 1] : undefined;
  const next = index < slugs.length - 1 ? slugs[index + 1] : undefined;
  const example = JSON.stringify(
    {
      type: problemTypeUrl(slug),
      title: entry.title,
      status: entry.status,
      detail: 'A sentence for people, safe to show.',
      instance: '/api/v2/…',
      requestId: '…',
    },
    null,
    2,
  );
  const body = `<div class="detail">
<section aria-labelledby="means"><h2 id="means">What it means</h2><p>${inline(sentence(entry.usedFor))}.</p></section>
<section aria-labelledby="todo"><h2 id="todo">What to do</h2><p>${inline(entry.help)}</p></section>
<section aria-labelledby="shape"><h2 id="shape">What you receive</h2><pre><code>${escapeHtml(example)}</code></pre></section>
</div>
<nav class="pager" aria-label="Problem types">
<span>${prev ? `<a href="/problems/${prev}" rel="prev">← ${escapeHtml(PROBLEM_TYPES[prev]!.title)}</a>` : ''}</span>
<a href="/problems/">All problem types</a>
<span>${next ? `<a href="/problems/${next}" rel="next">${escapeHtml(PROBLEM_TYPES[next]!.title)} →</a>` : ''}</span>
</nav>`;
  return page({
    title: `${entry.title} (${slug}) · DualMind Arena API`,
    description: `${entry.title}, HTTP ${entry.status}: what the ${slug} problem type means and what to do about it.`,
    canonical: `${origin}/problems/${slug}`,
    hero: `<p class="crumb"><a href="/problems/">Problem types</a> / <span class="mono">${slug}</span></p><div class="big ${statusClass(entry.status)}"><span class="status">${entry.status}</span><span class="pill mono">${slug}</span></div><h1>${escapeHtml(entry.title)}</h1>`,
    body,
  });
}
