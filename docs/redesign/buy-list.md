# DualMind Arena redesign: buy list

Checked on 2026-10-20. Companion documents: [licences.md](./licences.md) (policy and inventory), [component-catalog.md](./component-catalog.md), [design-direction.md](./design-direction.md).

**Nothing paid is copied into this repository until Harsh decides.** The free tiers cover the whole redesign (see the picks in the catalog); this list shows what money would add.

**The public-repo constraint.** Paid kits license you to use their code in your product, but almost all forbid redistributing the source files. A public GitHub repo publishes every file, so purchased code needs either (a) the repo to go private, or (b) the purchased code kept out of the public repo (a private npm package or a private git submodule, with CI given a token to fetch it). Trade-off: private repos have a monthly GitHub Actions minutes quota on the free plan (public repos are free), and a private submodule adds CI and contributor friction. Always read the licence text before buying: the prices below came from the vendors' own pages, but most pages do not state a public-repo rule.

Prices are USD as listed on 2026-10-20 and often discounted; re-check at checkout.

---

## Ranked list (best value for DualMind first)

| Rank | Kit | Price | Licence summary | What it adds for DualMind | Screens | Public-repo constraint | Recommendation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | [React Bits Pro](https://pro.reactbits.dev) | Starter $129, **Pro $249**, Ultimate $349 (one-time, one developer, lifetime) | Commercial licence, unlimited projects. Full terms page not confirmed. | Same author and stack as the waitlist already in use. Pro: 300 page blocks (hero, features, pricing, FAQ, footer), 300 app UI blocks (chat, dashboards, tables), Agent Kit, Landing Builder. Ultimate: 15 landing templates. | Landing hero and sections, leaderboard, about, auth | Almost certainly no public redistribution; read the licence. Keep out of public repo or go private. | **Buy if the site goes private** (or Pro now with the code kept in a private package) |
| 2 | [Aceternity UI Pro](https://ui.aceternity.com/pricing) | Free $0; 1-year $169; **Lifetime $199**; Team (up to 10) $1,590 (listed discounts from $249, $299, $1,990) | Custom licence: use in unlimited projects, but no redistribution of the Item "or its source files, regardless of modifications". Public repos not mentioned. | 200+ blocks, 15+ templates, 3 full landing pages. Polished bento features, timelines, hero sections, pricing, footers. The free tier already gives the pieces we planned. | Landing, about, how it works | Source-file redistribution is forbidden; a public repo is a grey area at best. | **Buy if the site goes private** |
| 3 | [Kokonut UI Pro](https://kokonutui.pro) | **$119** one-time (25% off $159), lifetime | Unlimited personal and commercial projects. No redistribution, no resale, no building a library from it. | 126 Pro components and sections, 5 website templates. The free tier already has the AI input, loaders and diff review; Pro adds more AI sections and full templates. | Arena (AI sections), landing | No redistribution; public repo not addressed. | **Buy if the site goes private** (cheapest AI-specific pick) |
| 4 | [Motion+](https://motion.dev/plus) | **$399** solo, one-time per developer, lifetime. Teams: yearly per seat. Optional yearly Pro add-on. | Motion+ code is MIT licensed ("yours forever" once added); a Builder's Licence is needed only if you resell its capabilities. | 510+ examples, Motion UI components, Motion Studio, AI Kit. Premium animation primitives for the reveal, number tickers, scroll sequences and the vote moment. | Arena reveal, leaderboard, landing | Page does not address public repos. Email support@motion.dev; MIT wording suggests it is the safest paid option. | **Buy now if support confirms a public repo is fine**, otherwise wait |
| 5 | [Hover.dev Pro](https://www.hover.dev/pricing) | **$49** one-time ("forever"; list $149) | Unlimited use of every component and template. Footer says components "may not be redistributed without the written consent of Hover.dev". | React and Tailwind buttons, nav, cards, hero effects. Small but cheap; good for the closing CTA and header polish. | Landing CTA, header | Redistribution wording; ask Hover.dev about a public repo. | **Buy if the site goes private** (low cost, low impact) |
| 6 | [ReUI Pro](https://dev.reui.io/pricing) | **Pro $199** (list $249), Ultimate $399 (list $499) one-time | Unlimited commercial use; full licence page not read. | About 976 shadcn blocks, application blocks (data grids, dashboards), motion icons; Ultimate adds icons and templates. | Leaderboard table, settings, admin-style views | Not confirmed. | Skip for now (free ReUI covers the data grid) |
| 7 | [Skiper UI Premium](https://skiper-ui.com) | **Premium $129**, Exclusive $549 (coming soon), one-time | Terms of Service not read. | Premium animated components, lifetime updates; Exclusive adds Figma and templates. | Landing | Not confirmed. | Skip |
| 8 | [Magic UI Pro](https://pro.magicui.design) | **$199** individual, one-time, lifetime | Commercial use allowed; **no redistribution or sharing; public repo not permitted** ($10,000 liquidated damages per instance stated). Team coverage unclear. | 9+ templates (AI Agent, SaaS, Dev Tool), 50+ sections. Strong landing sections. | Landing | **Hard no for a public repo.** | **Buy only if the site goes private**; otherwise skip |
| 9 | [Tailwind Plus](https://tailwindcss.com/plus) | Personal $299, Team (25 people) $979, one-time (per Tailwind's pricing pages) | Licensed per developer or team; terms page not readable. | Catalyst app UI kit, UI blocks, site templates. Mostly generic; we already have shadcn. | Settings, auth | One third-party post claims new sales stopped on 2026-09-09 (unverified; check the site). | Skip |
| 10 | [shadcnblocks](https://www.shadcnblocks.com/pricing) | Pro $149, Premium $299, Team (10 seats) $599, one-time | Our catalog notes the licence forbids public repos. | 600+ marketing and app blocks. | Landing, about | Forbidden for public repos. | Skip |

### Not worth buying or no paid tier found

- **Cult UI Pro**: no longer sold. Its author says the 58 Pro components are now free in the registry (137 total); only the AI SDK Agents add-on remains separate. Free action: re-check the licence of those components and consider them for the Arena (listed in licences.md only if adopted). Source: [Cult UI Pro pricing page](https://www.pro.cult-ui.com/pricing).
- **Motion Primitives, Animate UI, Smooth UI**: no paid tier found on their sites (Smooth UI not checked page by page).
- **Paid AI chat UI kits**: Shadcn Studio "Promptly" is a paid Figma and shadcn chat template (price not shown in search results). The free MIT [shadcn-chatbot-kit](https://github.com/Blazity/shadcn-chatbot-kit), prompt-kit and shadcn AI patterns already cover the Arena, so skip.
- **assistant-ui Cloud**: pricing not found; not needed (we use our own chat transport).

---

## Value summary

- **If you buy only one:** React Bits Pro at $249. It matches the waitlist's existing look and covers the most screens (landing, leaderboard, about, app blocks). Buy it when the repo goes private, or keep the code in a private package.
- **Total for the top 3** (React Bits Pro $249 + Aceternity UI Pro Lifetime $199 + Kokonut UI Pro $119): **$567** one-time.
- **Cheapest upgrade with the most AI relevance:** Kokonut UI Pro at $119.
- **Safest wording for a public repo:** Motion+ (MIT code), but confirm with support first.

## Decision paths

1. **Stay public, buy nothing** (current plan): free pieces in `vendor/` folders, listed in [licences.md](./licences.md). Cost: $0, free Actions minutes.
2. **Go private, buy the top 3**: $567 one-time plus GitHub Actions minutes beyond the free quota. Move vendored restricted-free pieces' licence notes into the private repo.
3. **Stay public, buy and keep code private**: publish purchased code as a private npm package or submodule; CI needs a read token. Adds setup effort but keeps free Actions.
