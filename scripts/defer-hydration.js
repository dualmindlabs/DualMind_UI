// Starts a prerendered page's JavaScript after the first paint instead of with the document.
//
// React Router's prerendered HTML loads its code with one inline `<script type="module" async>`
// plus a `<link rel="modulepreload">` for every chunk of the route. All of that is requested while
// the HTML is still being parsed, so it shares the link with the stylesheet and the fonts, and the
// headline cannot paint until about 370 KB (gzipped) have arrived on a slow phone. The page is
// fully readable HTML, so this moves the code behind the `load` event:
//   - the inline module script becomes an external, content-hashed file (assets/boot-<hash>.js),
//   - the modulepreload links are dropped from the head,
//   - a tiny inline script waits for `load`, then one animation frame, adds the modulepreload links
//     (so the chunks still load in parallel, not as a waterfall) and the boot script.
// First paint and LCP no longer wait for JavaScript; hydration starts a few hundred milliseconds
// later. Pages that need their JavaScript to render anything (the SPA fallback) are left alone.
// The inline script is hashed by build.js like every other inline script (the CSP allows the hash).
//
// Measured in CI (Lighthouse, mobile, simulated throttling): FCP 3.1 s -> 1.1 s on /.
const crypto = require('crypto');

const MODULE_SCRIPT_RE = /<script type="module" async="">([\s\S]*?)<\/script>/;
const MODULEPRELOAD_RE = /<link rel="modulepreload"[^>]*>/g;

function loaderScript(preloads, bootUrl) {
    const hrefs = JSON.stringify(preloads);
    return (
        '(function(){function g(){requestAnimationFrame(function(){setTimeout(function(){' +
        `${hrefs}.forEach(function(u){var l=document.createElement("link");l.rel="modulepreload";l.href=u;document.head.appendChild(l)});` +
        `var s=document.createElement("script");s.type="module";s.src=${JSON.stringify(bootUrl)};document.body.appendChild(s)` +
        '},0)})}' +
        'if(document.readyState==="complete")g();else addEventListener("load",g)})();'
    );
}

/**
 * @param {string} html a prerendered page
 * @returns {{ html: string, bootFile: string, bootCode: string } | null} the new page and the
 *   boot script to write to dist/assets/, or null when the page has nothing to defer
 */
function deferHydration(html) {
    if (html.includes('data-spa-fallback')) return null;
    const match = MODULE_SCRIPT_RE.exec(html);
    if (!match) return null;
    const bootCode = match[1];
    const hash = crypto.createHash('sha256').update(bootCode, 'utf8').digest('base64url').slice(0, 8);
    const bootFile = `boot-${hash}.js`;
    const preloads = [];
    for (const link of html.matchAll(MODULEPRELOAD_RE)) {
        const href = /\bhref="([^"]+)"/.exec(link[0]);
        if (href) preloads.push(href[1]);
    }
    const next = html
        .replace(MODULEPRELOAD_RE, '')
        .replace(match[0], () => `<script>${loaderScript(preloads, `/assets/${bootFile}`)}</script>`);
    return { html: next, bootFile, bootCode };
}

module.exports = { deferHydration };
