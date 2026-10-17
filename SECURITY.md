# Security Policy

We take the security of DualMind Arena and its users seriously. Thank you for helping keep it safe.

## Supported versions

Only the latest code on `master`, as deployed to [arena.dualmindlab.tech](https://arena.dualmindlab.tech), receives security fixes. There are no separately maintained release branches.

| Version | Supported |
| --- | --- |
| `master` / production deployment | Yes |
| Older commits, forks and preview deployments | No |

## Reporting a vulnerability

**Please do not report security vulnerabilities through public GitHub issues, discussions or pull requests.**

Report them privately in one of these ways:

1. **GitHub private vulnerability reporting (preferred).** Open the [Security tab](https://github.com/dualmindlabs/DualMind_UI/security) of this repository and choose **Report a vulnerability**, or go straight to [the advisory form](https://github.com/dualmindlabs/DualMind_UI/security/advisories/new). Only the maintainers can see the report.
2. **Email** [support@dualmindlab.tech](mailto:support@dualmindlab.tech) with a subject line starting with `[SECURITY]`.

Please include as much of the following as you can:

- The type of issue (for example XSS, broken authentication, exposed data, open redirect).
- The affected URL, page or file path, and the commit or date you tested.
- Step-by-step instructions to reproduce it, with a proof of concept if possible.
- The impact: what an attacker could do and what data could be exposed.
- Any suggested fix.

## What happens next

1. We acknowledge your report and may ask follow-up questions.
2. We investigate, confirm the issue and decide on a fix.
3. We fix it on `master` and deploy the fix to production.
4. With your permission, we credit you when the fix is published.

Please keep the details confidential until we confirm a fix has been deployed.

## Scope

In scope:

- The code in this repository: the arena web app, the `dualmind-arena` Cloudflare Worker (`worker.js`) and the waitlist worker (`waitlist-worker/`).
- The live sites they serve: `arena.dualmindlab.tech` and `early.dualmindlab.tech`.

Issues in the DualMind API (`api.dualmindlab.tech`) can be reported the same way; we route them to the right team.

Out of scope:

- Vulnerabilities in third-party services we use (Supabase, Cloudflare, AI model providers). Report those to the vendor.
- Denial-of-service and volumetric attacks, spam, and social engineering of DualMind staff or users.
- Findings from automated scanners without a demonstrated, exploitable impact.

## Testing guidelines

- Only test with accounts you own. Never access, change or delete other users' data.
- Do not run automated or high-volume scans against production.
- Stop testing and report as soon as you find something that exposes user data.
