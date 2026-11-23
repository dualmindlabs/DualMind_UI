# legacy/

Files that no longer ship and that nothing in the build, the Worker or CI uses. They are kept for reference and can be deleted once nobody needs them. Nothing here is served, and `build.js` does not copy anything from this folder.

Moved on 2026-11-23 (see `KNOWN_ISSUES.md`, N10). The relative links inside the HTML pages were written for the repository root and are not updated, so the pages will not render from here.

| Path | What it was |
|---|---|
| `pages/login-modern.html`, `pages/signup-modern.html`, `pages/forgot-password.html` | Classic sign-in pages. The Worker now answers their old URLs with 301s to the web app (`server/redirects.js`) |
| `pages/auth-callback.html`, `pages/update-password.html` | Classic email-link targets. The same URLs are now client-only routes of the web app (`server/routing.js`) |
| `pages/verify.html` | Developer diagnostics page. Its URL redirects to `/` |
| `pages/login/` | Scripts and a nested copy of the classic sign-in page |
| `pages/share/` | The classic share page, replaced by the web app's `/share/<id>` page |
| `tools/mock-api-server.js` | Local mock API (Express). Its JWT secret is a dev value |
| `tools/arena-redesign.css`, `tools/performance-monitor.js` | A stylesheet and an FPS monitor that no page loads |
| `tests/auth-flow-redesign.spec.js` | Playwright spec for `signup-modern.html`, which only worked against `npx serve .` |

Deleted instead of moved: the `.bat` and `commit_and_push.*` helper scripts, `test-everything.js`, `test-supabase-auth.js` and `build-deploy.js`.
