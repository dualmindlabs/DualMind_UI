# DualMind backend phase: research

Research for the backend phase of DualMind Arena, done on 2026-10-20 before any backend design. It covers what the leading AI arena and evaluation products offer, how arenas rank models and protect vote integrity, and what the Cloudflare platform provides for building it. Every claim carries its source; items marked unverified or [K] (general knowledge, not re-checked) should be confirmed before they drive a decision.

What it feeds: [feature-roadmap.md](./feature-roadmap.md) (prioritised features) and [ADR 0007](../adr/0007-backend-on-cloudflare.md) (architecture). Current API contract: [docs/api/endpoints.md](../api/endpoints.md).

Contents:

1. [Products: AI arenas and evaluation sites](#part-1-products-ai-arenas-and-evaluation-sites)
2. [Ranking, vote integrity, moderation and privacy](#part-2-ranking-vote-integrity-moderation-and-privacy)
3. [The Cloudflare platform](#part-3-the-cloudflare-platform)

---

## Part 1: Products, AI arenas and evaluation sites

Researched 2026-10-20. Read-only web research. Every claim carries a source URL. Items marked (unverified) came from third-party pages or search snippets only. Context: DualMind already has battle, vote, model-stats, threads, sharing (see docs/api/endpoints.md and docs/redesign/new-features.md Tier 3 items B-1 to B-11 in DualMind_UI, origin/master). Ideas below reference those B-ids where they overlap.

---

### 1. Arena (formerly LMArena / LMSYS Chatbot Arena), arena.ai

#### Features (user-facing)
- Modes: Battle (two anonymous models, labelled A/B; vote A, B, tie or both bad), Side by Side (user picks two models), Direct (one model); an Agent mode is also mentioned. Identities revealed after voting. Sources: https://en.wikipedia.org/wiki/Arena_(AI_platform) ; https://botnation.ai/en/chatbot-arena/ (third party, modes list unverified beyond Wikipedia).
- Separate leaderboards: Text, Code/WebDev, Vision, Image, Video, Search, Document, Agent (third party): https://www.everydev.ai/tools/lm-arena . Rebranded from LMArena to Arena in January 2026: https://en.wikipedia.org/wiki/Arena_(AI_platform)
- Category leaderboards and changes (dated), from the official changelog https://arena.ai/blog/leaderboard-changelog :
  - Arena Expert + eight Occupational categories (5 Nov 2025); Coding category narrowed (16 Oct 2025).
  - WebDev split into HTML and React (26 Feb 2026); Code Arena Fullstack (28 Jul 2026).
  - Text-to-Image per-category leaderboards (9 Feb 2026); Single-Image Edit and Multi-Image Edit share seven categories (Jan and Jul 2026).
  - Video arena voting limited to prompt authors (10 Mar 2026).
- Leaderboard statistics:
  - Confidence interval beside every score; closed-form CI replaced bootstrapping (23 Jul 2025); battles reweighted inversely to how often each model appears (same changelog).
  - Raw rank plus "rank spread": best rank = 1 + models whose lower CI is above your upper CI; worst rank = 1 + models whose upper CI is above your lower CI; overlapping spreads are ties. Source: https://arena.ai/blog/ranking-method
  - Bradley-Terry fit with extra terms for position bias and same-organization bias (12 May 2026), and style control (formatting/length regressed out): https://arena.ai/blog/leaderboard-changelog ; https://www.latent.space/p/lmarena
  - "Preliminary" tag for models that were tested anonymously and later released, until fresh votes accumulate (18 Sep 2025). "Deprecated" models listed publicly (also tracked on GitHub). Total vote counts include battles with models no longer shown (5 Aug 2025). Same changelog.
- Vote integrity pipeline (all from the changelog): removal of votes from statistically anomalous users (17 Sep 2025), model-battling-itself rows removed (4 Oct 2025), de-duplication and identity-leak detection (14 Jul 2025), consistent vote filters and image/video de-dup (13 Jan 2026), skipped votes excluded, votes from "Battles in Direct" count (12 May 2026).
- Accounts: registration optional, needed for some features (https://en.wikipedia.org/wiki/Arena_(AI_platform) ; terms https://help.arena.ai/articles/5629909088-terms-of-use).

#### Policies and transparency
- Pre-release onboarding: anonymous label per model, tested until rating stabilises (at least 1,000 votes), results go privately to provider, then model removed; providers can test several variants; public early release needs the model in Direct Chat at launch plus written confirmation it is identical to the public one; provider gives model access for at least 30 days. https://arena.ai/blog/policy
- Deprecation rules (model not publicly accessible, newer model in same series, cheaper strictly better alternative); retired models listed publicly. Same source.
- Data sharing: periodic releases to community, personal/sensitive data stripped first; conversation data from unreleased-model tests may go to providers. Same source; PII removal via GCP Sensitive Data Protection API per https://news.lmarena.ai/policy (search summary).
- Evaluation pipelines are open source and auditable (same policy page).
- Terms of use (updated 2026-02-23): no scraping or automated querying, no vote manipulation or paid votes, one account per person, 18+, inputs may be shared with third-party model providers, user keeps ownership but grants broad perpetual licence, prompts published under an anonymous identifier, no explicit rate limits stated. https://help.arena.ai/articles/5629909088-terms-of-use
- Public datasets: arena-human-preference-140k, about 135.6k text votes, CC-BY-4.0 on prompts; fields model_a, model_b, winner (model_a/model_b/tie/both_bad), conversations, `conv_metadata` (markdown and token counts for style control), `category_tag` (math, creative writing, hard prompts, instruction following), `language`, `is_code`, timestamp, `evaluation_session_id`. https://huggingface.co/datasets/lmarena-ai/arena-human-preference-140k . First release 2023: 33K conversations with anonymized user ids and moderation tags: https://oldblog.lmarena.ai/blog/2023/dataset
- Controversy to learn from: Llama 4 Maverick tested as a non-public variant (April 2025), policies updated afterwards. https://en.wikipedia.org/wiki/Arena_(AI_platform)

#### Public API
- No official public REST API for voting or leaderboard found in this research (not verified; absence of evidence). Leaderboard data is exposed through dataset releases and a changelog, not an API.

#### Sub-arenas
- **WebDev Arena**: prompt goes to two anonymous models, each builds a full web app, apps run live in browser so voter can interact before voting; Bradley-Terry ranking; code isolated in E2B sandboxes; 80k+ votes since Dec 2024 launch. https://news.lmarena.ai/webdev-arena ; https://e2b.dev/blog/how-lmarena-collaborated-with-e2b-to-build-llm-web-development-evals
- **Search Arena**: search-augmented models, 24k+ multi-turn conversations, 12k preference votes, open data and code (lmarena/search-arena on GitHub and Hugging Face); finding: number of citations sways votes even when unsupported, community sources preferred. Paper https://arxiv.org/pdf/2506.05334 ; https://news.lmarena.ai/search-arena
- **Copilot Arena**: VS Code extension; two completions shown at once, Tab accepts top, Shift-Tab bottom; inline edit diffs also compared; Bradley-Terry; open source https://github.com/lm-sys/copilot-arena ; paper https://arxiv.org/pdf/2502.09328 ; https://arena.ai/blog/copilot-arena/

#### Notable ideas for DualMind
- Rank spread/tie display, preliminary and deprecated badges, public changelog and methodology page, dated vote-filtering log, position-bias term, open dataset export of the user's own votes.

---

### 2. Artificial Analysis, artificialanalysis.ai

#### Features
- Dimensions per model: Intelligence Index (composite of about 10 evaluations, versioned; versions 4.0 to 4.3.x seen), output speed (tokens/s after first token, in OpenAI tokens, o200k_base), latency (Time to First Token, Time to First Answer Token excluding reasoning time, end-to-end time for 500 answer tokens), price (input/output per 1M tokens, blended with 7:2:1 cache-hit:input:output weighting), cost per task and time per task. https://artificialanalysis.ai/methodology ; https://artificialanalysis.ai/methodology/performance-benchmarking ; https://artificialanalysis.ai/
- Image arena and video arena: ELO from blind preference votes with 95% CI. https://artificialanalysis.ai/ (home page). Per API spec, arenas include text-to-image, image editing, text-to-video (silent and with audio), image-to-video, text-to-speech; only models with at least 500 appearances get a rank.
- Transparency: public metric definitions, per-benchmark methodology pages, downloadable performance prompts, results framed as real-world customer experience.

#### Public API (OpenAPI at https://artificialanalysis.ai/api/v2/openapi)
- Auth header `x-api-key`; attribution required on all tiers (visible byline or footer link).
- Endpoints: `GET /api/v2/language/models/free` (Free), `/api/v2/language/models` and `/{slug}` (Pro), `/{slug}/performance` and `/providers...` (commercial), per-arena `/models` (Pro) and `/models/free`.
- Rate limit: fixed 24-hour window, 100 requests Free, 500 Pro; `X-RateLimit-Reset` and `Retry-After` headers; quota shared per user or organisation.
- Model fields: `evaluations.artificial_analysis_intelligence_index`, `intelligence_index_version`, `performance.median_output_tokens_per_second`, `median_time_to_first_token_seconds`, `median_end_to_end_response_time_seconds`, `pricing.price_1m_input_tokens`, `price_1m_output_tokens`, `context_window_tokens`. Null means not measured, never zero. Arena entries: `elo`, `ci_95`, plus `rank`, `samples`, `release_date`, `categories` on Pro.
- Notable: the openness of a documented rate limit with reset header, and versioned metrics.

#### Ideas for DualMind
- Per-model speed and TTFT collected from real battles (we measure them anyway), a quality-vs-speed-vs-price scatter, versioned scoring methodology, minimum-appearances rule before ranking.

---

### 3. OpenRouter, openrouter.ai

#### Features
- Rankings page: weekly tokens processed per model, top models by task (share of spend), cost per coding-agent session, open vs closed weight market share, benchmarks chart (Intelligence Index vs weighted input price, Pareto toggle, pin up to five models), top apps; stealth models excluded; data CC BY 4.0 with citation. https://openrouter.ai/rankings
- Routing: model fallbacks via `models` array, provider failover on 5xx/rate limit by default. https://openrouter.ai/docs/api-reference/overview ; https://openrouter.ai/blog/insights/reliability-failover/
- Provider preferences in `provider` object: `order`, `sort` (price, throughput, latency), `allow_fallbacks`, `require_parameters`, `data_collection` (allow/deny), `zdr`, `max_price`, `quantizations`, `preferred_min_throughput` (p50/p75/p90/p99). https://openrouter.ai/docs/guides/routing/provider-selection
- Uptime: tracks response times, error rates, availability per provider in real time (https://openrouter.ai/docs/features/uptime-optimization); per-model uptime tab (unverified, third party).

#### API shape
- Base `https://openrouter.ai/api/v1`; `POST /chat/completions` (OpenAI-compatible, `choices[].message` or `.delta`); `GET /generation?id=` for stats; OpenAPI at openrouter.ai/openapi.json. Headers `Authorization: Bearer`, optional `HTTP-Referer`, `X-OpenRouter-Title`. SSE streaming with usage in final chunk; comment payloads to ignore. Usage has prompt/completion/total tokens and cost fields. Error `{code, message, metadata}`; normalized `finish_reason` with `native_finish_reason`. https://openrouter.ai/docs/api-reference/overview
- `GET /models` fields: id, canonical_slug, name, created, pricing, context_length, architecture, top_provider, per_request_limits, supported_parameters, default_parameters, links. https://openrouter.ai/docs/api/api-reference/models/get-models

#### Ideas for DualMind
- Model catalog endpoint with pricing and capabilities, fallback chain when a model errors in a battle, normalized finish_reason and error shape, usage and cost per response.

---

### 4. Poe, poe.com
- OpenAI-compatible endpoint across hundreds of bots; `model` is the bot name; bot-specific parameters need the Poe SDK; unsupported fields ignored. https://creator.poe.com/docs/api ; https://creator.poe.com/docs/external-applications/openai-compatible-api
- Multi-bot chat (one prompt, several bots side by side) is described by third parties only (unverified): https://www.itechguides.com/products/poe/
- Idea: OpenAI-compatible facade makes DualMind usable from any client; "ignore unsupported params" policy.

### 5. Vellum LLM leaderboard
- Static comparison table: context window, input/output price per 1M tokens, speed and latency, benchmark scores. Snapshots disagree on date, live page not loaded. https://vellum.ai/llm-leaderboard ; https://www.vellum.ai/md/llm-leaderboard
- Idea: markdown/LLM-friendly export of the leaderboard (`/md` variant).

### 6. Scale SEAL leaderboards
- Private held-out expert-written test sets, never released, to prevent contamination; sometimes public split plus private split (HLE: 2,500 public questions, private set to detect overfitting). Ranking uses "Rank (Upper Bound)" based on confidence intervals; also calibration error. https://labs.scale.com/leaderboard/humanitys_last_exam ; https://arxiv.org/pdf/2505.00612 ; https://www.aiwiki.ai/wiki/seal_leaderboards (secondary)
- Idea: hidden "gold" prompts as attention checks for vote quality; CI-based rank bound.

### 7. Hugging Face Open LLM Leaderboard
- Archived: v1 in June 2024, v2 retired 13 March 2025 after evaluating 13K+ models because benchmarks became obsolete. https://huggingface.co/docs/leaderboards/en/open_llm_leaderboard/archive
- Lesson: keep a visible "archived" state and version evaluation methodology instead of silently changing it.

### 8. Newer / niche products
- **Open Model Arena** (open source, self-hosted): blind battles on your own prompts and models, Elo leaderboard, live audience voting. https://github.com/pete-builds/open-model-arena . Idea: audience (room) voting mode.
- Arena video: votes from website and Discord merged (21 Jan 2026) per changelog; ties to multi-channel voting.
- Funding context: Arena raised $200M at $3.1B valuation in October 2026 (https://en.wikipedia.org/wiki/Arena_(AI_platform)); shows arena data is seen as the product.
- Search and Copilot Arena already covered above.

---

### Feature ideas for DualMind, ranked
(Rank = impact on a reviewer per unit of effort. B-ids refer to docs/redesign/new-features.md.)

1. Rating change on reveal (+14/-14): the most memorable moment. Why: tangible, shows Elo is real. Backend: vote response returns eloBefore/eloAfter, D1 Elo write in a Worker (B-2).
2. Public methodology page generated from code plus versioned changelog (like Arena's changelog): why: transparency is what makes arenas credible. Backend: static page plus `methodology_version` stored per rating row.
3. Confidence intervals and rank spread with tie display (B-6): why: statistically honest, mirrors Arena. Backend: scheduled Worker (Cron Trigger) computes Bradley-Terry plus CI into D1, KV caches the leaderboard.
4. Streaming battle over SSE with per-model TTFT and tokens/s captured (B-1): why: real streaming plus Artificial Analysis-style speed metrics from live data. Backend: Worker streaming, AI Gateway for logging, write latency into D1.
5. Leaderboard categories from automatic prompt classification (coding, math, writing, etc.) (B-4): why: Arena's core drill-down. Backend: Workers AI classifier at battle time, category column on battle and vote.
6. Vote-integrity pipeline with a public dated filter log: dedupe, self-battles, anomalous-voter detection, rate limits (Durable Object per user), Turnstile. Why: shows production thinking and mirrors Arena's changelog. Backend: DO counters, D1 flags, filter table.
7. Open data export of anonymized votes (CC-BY dataset in Parquet/JSONL on R2, monthly): why: matches Arena/Hugging Face practice, great portfolio talking point. Backend: Queue plus Worker export job to R2, PII scrub step.
8. Per-user stats page and streaks (B-7): votes, agreement with crowd, favourite models. Backend: D1 aggregates per user, KV cache.
9. Leaderboard history with sparklines and rank-movement badges (B-3): Backend: daily snapshot via Cron into D1.
10. Head-to-head matrix heatmap (B-5): Backend: pairwise counts table in D1, cached in KV.
11. Preliminary and deprecated badges plus "new" tag: new models flagged until N votes, retired models listed publicly. Backend: model lifecycle column, minimum-appearance rule (AA uses 500, Arena 1,000 for pre-release).
12. Reweighted sampling so new models get matched fairly and the pairing is not purely random: Backend: weighted sampler Worker reading counts from D1/KV.
13. Model catalog API with pricing, context length, capabilities (OpenRouter `/models` shape): Backend: D1 table plus cached endpoint, OpenAPI spec generated.
14. Fallback chain and normalized errors per model (OpenRouter `models`, `finish_reason` normalization): Backend: AI Gateway fallback or Worker retry logic.
15. Safe retries via idempotency key (B-8): Backend: KV or DO keyed lookup with TTL.
16. Social share cards (B-9): Workers OG image render of battle and result. Backend: Worker plus R2 cache.
17. Position-bias control: randomize A/B side server-side and store the side, fit a position term in ratings. Why: mirrors Arena's May 2026 change. Backend: assignment stored at battle creation.
18. Quality vs speed vs price scatter (AA/OpenRouter benchmark chart) using live latency and token cost from usage logs. Backend: aggregate usage in D1, cost per response from catalog pricing.
19. Style-control toggle (length and markdown controls in the Bradley-Terry fit): why: very credible leaderboard view. Backend: store token and markdown counts per response (Arena does in `conv_metadata`), nightly regression job.
20. Gauntlet/bracket mode (B-11) and Room/audience voting (Open Model Arena idea): Backend: Durable Object per room with WebSocket for live votes.
21. Attention-check prompts with known winners (SEAL held-out idea): weight or flag voters who fail. Backend: gold set in D1, per-user reliability score.
22. Account data controls: export my data, delete account (B-10) plus clear prompt-licence wording as in Arena's terms. Backend: Queue-driven export to R2, deletion cascade.
23. Rate-limit headers and documented quotas (`X-RateLimit-Reset`, `Retry-After`, as in AA API): Backend: DO or Workers rate limiting binding; fills the unknown 429 shape noted in endpoints.md.
24. Public read-only JSON API plus OpenAI-compatible chat facade (Poe/OpenRouter style) for the leaderboard: Backend: Worker routes, attribution requirement like AA.
25. Search-arena style citation study: for a search-enabled mode, log citations and show citation count effect: stretch, needs a tool-calling model and a search provider.
26. Markdown/LLM-readable leaderboard (`/leaderboard.md`, `llms.txt`), as Vellum and OpenRouter docs do: tiny effort, Worker route.

---

## Part 2: Ranking, vote integrity, moderation and privacy

Date: 2026-10-20. Evidence tags: [V] = read on the cited page this session; [K] = standard knowledge or general practice, not re-verified here (check before relying on exact numbers).

Primary sources
- Chatbot Arena paper: https://arxiv.org/abs/2403.04132 (HTML: https://arxiv.org/html/2403.04132)
- Style control blog: https://lmsys.org/blog/2024-08-28-style-control/
- Arena ranking-method post: https://arena.ai/blog/ranking-method
- Arena-Rank package post: https://arena.ai/blog/arena-rank ; code https://github.com/lmarena/arena-rank
- Leaderboard Illusion: https://arxiv.org/abs/2504.20879 (HTML: https://arxiv.org/html/2504.20879)

---------------------------------------------------------------------
### 1. Ranking methods

#### 1.1 Online Elo
Update after each battle (A vs B, S_A in {1, 0.5, 0}):
```
E_A = 1 / (1 + 10^((R_B - R_A)/400))
R_A <- R_A + K * (S_A - E_A)
R_B <- R_B + K * ((1 - S_A) - (1 - E_A))     (zero-sum)
```
- K-factor: larger K = faster but noisier. Chess uses 16-32 [K]. Early Chatbot Arena used Elo with K=4 (FastChat code, [K]); small K is right when you have thousands of battles per model.
- Order dependence: the same set of votes in a different order gives different ratings. Later votes dominate; a model's rating drifts as a random walk. Early Arena versions reported Elo; the authors moved to Bradley-Terry because it is "better for the purpose of statistical estimation" [V arxiv 2403.04132 HTML].
- Common mitigation if you keep Elo: replay all battles in many random permutations and average (what the early Arena notebooks did, [K]). But this is just a noisy approximation of BT, so use BT directly.

#### 1.2 Bradley-Terry MLE (the standard for arenas)
Model: P(m beats m') = 1 / (1 + exp(xi_m' - xi_m)), with one coefficient pinned (xi_1 = 0) for identifiability [V paper]. Same as Elo's logistic with natural-log base instead of 10/400.

Logistic regression formulation (this is how to implement it):
- One row per battle. Feature vector X in R^M: +1 at column of model A, -1 at column of model B, 0 elsewhere. Label Y = 1 if A wins, else 0.
- Fit `P(Y=1) = sigmoid(X . beta)` with no intercept (or with an intercept for position bias, see 1.6), minimising binary cross-entropy. Add a tiny L2 penalty (e.g. C large, like sklearn `LogisticRegression(fit_intercept=False, C=1e6)`) for stability when a model has few votes or only wins [K].
- Paper weights each battle by 1/P(pair) so the estimate targets a uniform pair distribution, correcting for non-uniform sampling [V paper].
- Convert to Elo-looking scale: `score = SCALE * beta/ln(10) * ... ` precisely: `rating = 1000 + 400 * beta / ln(10)` (since 400/ln10 maps natural-log BT onto Elo's base-10/400 convention) [K]. Anchor: older Arena code anchored by setting a reference model (mixtral-8x7b) to 1114 [K]; current Arena ratings sit around the 1000 range in the arena-rank example output [V github]. Any anchor is arbitrary: pick a fixed baseline model or mean-centre to 1000, document it, never re-anchor silently.
- Expected win rate between two models from ratings: `1 / (1 + 10^((R_B - R_A)/400))` (same as Elo formula).

Ties and "both bad":
- Paper main analysis uses binary outcomes; mentions generalisation to ties/degrees of preference and a non-parametric extension (Appendix B) [V]. It does not state how tie votes are encoded there.
- Practical options [K]: (a) simplest and what FastChat did: count each tie as half a win for each side (duplicate row, one with Y=1 and one with Y=0, or fractional label 0.5 with sample weights); (b) Rao-Kupper / Davidson tie models add a tie threshold parameter theta: P(tie) = (nu-1) sqrt(pi_a pi_b) / ((pi_a + nu pi_b)(pi_b + nu pi_a)); (c) drop ties (a third-party analysis found ranking is robust to dropping vs modelling ties on one dataset, with 38.4% ties; https://pypi.org/project/arenakit/ via search result, not independently verified).
- "Both bad": treat as a tie for ranking (information about relative strength is ~0) but keep as a separate quality signal (a per-model "both bad rate" stat). Do not feed to BT as a win.

#### 1.3 Confidence intervals
- Paper compares pivot bootstrap and sandwich (robust) standard errors; deploys sandwich intervals (smaller in large samples), plus a chi-squared simultaneous interval for uniform coverage across all models. Replicate count for the bootstrap is not stated in the paper [V].
- Arena-Rank (current production) computes CIs in closed form (analytic), not bootstrap; reports 95% (alpha=0.05) and a `variances` column; >30x faster than the old FastChat pipeline [V arena.ai/blog/arena-rank, github]. Exact analytic formula not documented on the page.
- DualMind-sized implementation (simple, defensible): percentile bootstrap, B = 1000 resamples of battles with replacement (older Arena notebooks used 100-1000 [K]), refit BT each time, take 2.5% / 97.5% quantiles of each rating. 1000 refits of a small logistic regression is cheap in a Worker or a cron job; recompute offline every few minutes/hours and cache in KV/D1, not per request.
- Alternative cheap analytic option: Fisher information. Var(beta_hat) ~ inverse of X^T W X where W = diag(p(1-p)); CI = beta +- 1.96 sqrt(diag). Fine with low pair-coverage skew; use sandwich if you weight rows.

#### 1.4 Presenting ranks: "rank (UB)" and rank spread
- Old Arena "Rank (UB)" = 1 + number of models whose lower CI bound is above this model's upper CI bound. This was optimistic and favoured wide-CI new entries [V arena.ai/blog/ranking-method].
- Current Arena: raw rank (sort by score, unique) plus a rank spread:
  - best rank = 1 + #models whose lower CI > this model's upper CI
  - worst rank = 1 + #models whose upper CI > this model's lower CI
  - Models tie when spreads overlap; raw rank stays the best point estimate [V same post].
- Show for each row: rating, +/- half CI width, votes, rank spread (e.g. "2-5"), and a bar/error-bar.

#### 1.5 Few votes, provisional, deprecations
- Provisional [K, recommended]: flag a model "preliminary" until it has >= ~300-1000 battles or CI half-width < ~15-20 points; Arena's own leaderboard shows "preliminary" tags for new models [K]. Hide from ranks/rank-1 claims but show in a separate list. Rank spreads already penalise wide CIs.
- Arena-Rank has a "reweighting" feature for models with fewer battles [V title-level only; mechanism undocumented on page].
- Deprecations (from critiques, 1.9): publish a deprecation list, keep deprecated models' historical ratings visible but marked, never silently delete.

#### 1.6 Style control and position bias
- Style control adds covariates Z to the BT logit: `P = sigmoid(X beta + Z gamma)`; covariates are answer token length, # markdown headers, # bold, # list items. Each is normalised as (feat_A - feat_B)/(feat_A + feat_B), so the difference is relative. Reported coefficients (combined controls): length 0.249, list 0.031, header 0.024, bold 0.019. Effect: e.g. gpt-4o-mini falls rank 6 -> 11 [V lmsys style-control blog].
- Authors' caveat: observational; length can correlate with real quality [V same].
- Implementation: add 4 columns to X (the Z features), fit the same regression; report both "default" and "style-controlled" boards; make style controlled the headline. Token count can be approximated by chars/4 if you lack a tokenizer.
- Position bias: randomise left/right per battle; optionally add an intercept column (+1 for "A is left") to the regression [K]. Store which side each model was on.

#### 1.7 Categories
- Filter battles by prompt category and refit BT per category (e.g. coding, creative writing, hard prompts, language). Needs a prompt classifier (cheap LLM call or keyword rules) tagging each battle once at creation. Minimum votes per category apply separately; CIs will be wider, so show them [K].
- Style control per category is the same regression restricted to that subset.

#### 1.8 Win-rate matrix, sampling, alternatives
- Win-rate matrix: for each pair (a,b), fraction of non-tie battles a wins, plus battle-count matrix; show the model-implied win rate from ratings next to it. Paper uses these as a validation of BT [V paper mentions win-matrix precision].
- Active sampling (paper): choose pair a with probability
  `P_t(a) ∝ sqrt(Sigma_aa / n_a) - sqrt(Sigma_aa / (n_a + 1))`, where Sigma is the estimated covariance of the estimate and n_a the count of battles for pair a. This prioritises pairs that most reduce interval width. On a holdout replay it needed ~4,400 samples to reach precision 0.2 on the win matrix versus ~6,800 for uniform [V paper HTML]. Combine with importance weighting 1/P(pair) in the BT fit.
- Simple practical sampler for a small arena [K]: weight pairs by 1/sqrt(n_pair+1) and ensure every pair gets a minimum; add a fraction (e.g. 20%) of pure uniform for exploration; cap per-provider share (see 1.9).
- Glicko-2 / TrueSkill [K]: Glicko tracks rating deviation (uncertainty) and volatility per player, TrueSkill is Bayesian with Gaussian skill beliefs and handles draws and teams. Both are built for sequential play with players whose skill changes over time. For arena leaderboards the models are fixed, votes are plentiful and can be refit in batch, so a static BT MLE with proper CIs is simpler, order independent, and reproducible. That is the argument for BT (paper's statistical-estimation rationale, [V]). Glicko-2 is a reasonable provisional "live" display if you want a fast-updating number, but not the published rating.

#### 1.9 Critiques and recommendations (The Leaderboard Illusion)
All from https://arxiv.org/html/2504.20879 [V]:
1. Prohibit score retraction after submission; publish all results permanently, including private variants.
2. Set a transparent limit on concurrent private variants per provider (suggested: 3). Meta tested 27 private variants before Llama 4.
3. Apply model removals equally across licence categories (e.g. deprecate the bottom 30% within each of proprietary / open-weight / open-source). Open-weight and open-source were deprecated at 87.8% and 89% vs 80% proprietary.
4. Fair sampling: return to active sampling; providers reached up to a 34% maximum daily sampling rate (about 10x the lowest).
5. Publish removed models: 47 of 243 public models officially deprecated vs 205 silently removed.
Other numbers: Google and OpenAI ~19.2% and ~20.4% of data; 83 open-weight models together ~29.7%; limited extra Arena data can yield up to 112% relative gains on the Arena distribution (overfitting concern) [V abstract page].
Relevance to DualMind: you control the model list, so the lessons are: pre-register the sampling policy, publish battle counts per model, never hide a model's poor result, disclose any models tested but unlisted, list deprecations.

Also relevant: ranking-robustness work shows small perturbations of votes can flip top ranks (https://arxiv.org/pdf/2508.11847, https://icml.cc/virtual/2026/68325, search results only). Argues for showing rank spreads, not just a ranking.

---------------------------------------------------------------------
### 2. Vote integrity and abuse prevention

What the paper itself documents [V paper HTML]:
- Anomalous-user detection: for each vote, compute a p-value comparing the user's vote to historical votes for that same action; combine across votes with Fisher's method (sum of -2 log p ~ chi-squared); test at random vote counts between 1 and 100 so attackers cannot learn the checkpoint; ~90% true positive and 60-70% true negative on small test sets.
- Identity-reveal filtering via keyword filters on conversations that name the model.
- OpenAI moderation API flags about 3% of requests.
- Paper does not describe deduplication or validity criteria for votes.

Recommended controls for DualMind [K unless noted]:
- One vote per battle: battle_id is a server-issued random ID; votes table has UNIQUE(battle_id). Allow edit-before-reveal only, or "last write wins within 60 s" if you want correction. Votes are accepted only for battles the server created, and only once both responses finished streaming.
- Server-side timing: store response_complete_at and vote_at. Reject or down-weight votes with read time < ~2-3 s, or less than reading speed for the response length (e.g. < chars/25 s capped at 20 s). Flag rather than silently delete; keep `valid` and `reason` columns.
- Identity: anonymous session cookie (HttpOnly, signed) plus a hashed IP (HMAC with rotating secret) and a hashed user-agent; never store raw IP long term. Use these only for rate limits and anomaly checks.
- Rate limiting: per session and per hashed IP, e.g. max 1 battle start per 5 s, 60 battles/hour/IP, vote rate cap; Cloudflare Workers rate limiting binding or Durable Object counters. Return 429 with Retry-After.
- Turnstile: require a token before the first battle of a session and again after N battles or on suspicion. Validate server-side at POST https://challenges.cloudflare.com/turnstile/v0/siteverify with `secret`, `response`, optional `remoteip` and `idempotency_key`; token is valid 300 s and single use (replay gives `timeout-or-duplicate`); check `action` and `hostname` [V https://developers.cloudflare.com/turnstile/get-started/server-side-validation/].
- Anomaly detection (offline job, hourly): per-session features: fraction left vs right (binomial test against 0.5; flag p < 1e-4 once >= 30 votes), tie-only voters, vote bursts (votes per minute z-score), median read time, identical vote sequence across sessions, votes concentrated on one model, agreement rate with the consensus (Fisher/p-value approach above). Quarantine flagged sessions' votes (exclude from rating, keep for review).
- Prompt de-duplication: normalise (lowercase, collapse whitespace), hash; cap contribution of identical or near-identical prompts per user (e.g. count of 1 vote per normalised prompt per session) and run a global cap per prompt hash so a single prompt cannot dominate. Optional near-dup via embedding or MinHash. Paper does not describe this [V], so it is a design choice. Note: Arena's data-release work deduplicated prompts [K, not verified here].
- Vote weighting: weight = 1 for normal votes, 0 for quarantined; keep the weighted logistic regression (it already supports sample weights).
- Model-identity leaks: (a) system prompt for all models: "Do not state your name, creator, or model family"; (b) post-filter responses with regexes for model and vendor names (own model list + common names like GPT, Claude, Gemini, Llama, Mistral, Qwen, DeepSeek, "trained by", "I am a large language model"); (c) detect prompts asking "who are you/ what model are you" with a regex or tiny classifier; (d) when a response matches, either rewrite/redact, regenerate, or mark the battle `identity_leaked` and exclude its vote from rating (paper: keyword filters on identity [V]). Keep the raw text for audit.
- Anonymity until vote: model names never appear in the API payload before the vote is stored; return names only in the vote response. Use opaque per-battle slot IDs.
- Server-side integrity: sign battle tokens (HMAC of battle_id + created_at + slot mapping) so clients cannot alter which model was left/right; log all votes append-only; store rating-run version so any change is reproducible.

---------------------------------------------------------------------
### 3. Moderation and safety

Options for prompts and responses:
- OpenAI Moderation endpoint: `omni-moderation-latest`, free, text and image; categories harassment(/threatening), hate(/threatening), illicit(/violent), self-harm (/intent/instructions), sexual, sexual/minors, violence(/graphic); returns `flagged`, `categories`, `category_scores`. Do not send suspected CSAM to it [V https://developers.openai.com/api/docs/guides/moderation]. The Arena paper reports ~3% of requests flagged with this API [V paper].
- Llama Guard 3 on Workers AI: `@cf/meta/llama-guard-3-8b`; input is a `messages` array of role/content; output is text "safe" or "unsafe" plus violated category codes; 131,072 token context; $0.484/M input tokens, $0.03/M output [V https://developers.cloudflare.com/workers-ai/models/llama-guard-3-8b/]. Category list is on the model card (MLCommons hazard taxonomy S1-S14, [K]). Check the current Workers AI model catalog for newer guard models; model availability changes.
- Cloudflare AI Gateway guardrails (uses Llama Guard) exist as an option [K, verify].

Flow [K]:
1. Pre-check the user prompt (cheap: OpenAI moderation if you accept a third-party call, else Llama Guard). If flagged hard categories: refuse before any model call, do not create a battle, do not store the text (store only hash + category).
2. Post-check each response before display (or streaming buffer check): if unsafe, replace with a placeholder and mark the battle `moderated`, excluded from rating.
3. Refusals: model refusals are legitimate content; detect with regex ("I can't help with", "I cannot assist") and let the user vote normally, but track per-model refusal rate as a stat. Votes where both refuse can be auto-tied or excluded. Arena treats refusals as votes like any other [K].
4. Reporting flow: a "Report" button on each response (reasons: unsafe, personal data, wrong identity leak, other) writes to a `reports` table (battle_id, slot, reason, free text up to 500 chars, session hash). Auto-hide a battle from public datasets after 1 report; admin review queue; take-down within a stated window.
5. Prompt-injection and abuse: cap prompt length (e.g. 4k chars), strip HTML in rendering (render markdown safely, sanitize), disable link auto-fetch.

---------------------------------------------------------------------
### 4. Privacy and data

What Arena does (so you can mirror or improve):
- Terms of use / FAQ: conversations may be shared to support the community and advance AI, including posted publicly; shared data is anonymous and not linked to users; only prompt text and model responses are shared [V via search snippets: https://lmarena.ai/faq, https://lmarena.ai/terms-of-use, privacy policy https://arena.ai/privacy-policy, dated 5 Sep 2025]. I could not open the full policy pages; read before copying wording.
- Paper: users must accept terms that consent to public data release; authors planned to release a 100K+ pairwise vote dataset [V paper HTML].
- Released datasets: Chatbot Arena Conversations (33K, 2023) and LMSYS-Chat-1M (2023), both with PII redaction and moderation tags [K]. Check https://huggingface.co/datasets/lmsys/chatbot_arena_conversations for exact fields.

Recommended defaults for DualMind [K]:
- Consent: show, before first prompt, a short notice such as: "Prompts and model responses are stored and may be published in anonymised form as an open dataset of human preference votes. Do not enter personal, confidential or sensitive information. Votes are tied to a random session ID, not your name." Require an accept checkbox or clear continue-implies-consent with a link. Remember consent in the session; record the notice version.
- Store: battle_id, timestamp, prompt, two responses, model IDs, vote, vote timing, language, category, token counts, moderation flags, hashed session and IP hash (HMAC with rotating key). Do not store raw IPs, emails, user-agents in full.
- Publish: only prompt, responses, models, vote, category, language, timestamp rounded to day; exclude flagged, moderated, reported and PII-hit battles; no session or user IDs; publish a datasheet.
- PII redaction before publication: regexes for email, phone, credit card (Luhn), IBAN, national IDs, IPv4/6, URLs with tokens/keys, API-key patterns; plus an NER pass (Presidio or a small NER model) for names, addresses; replace with typed placeholders like `<EMAIL>`. Any battle with high-risk PII hits is dropped, not redacted. Redaction is imperfect, so keep the user-facing warning and the report/takedown route.
- Retention: raw conversations with hashed IPs: 90 days then delete or aggregate (suggested); rating-relevant vote records (no text): keep indefinitely; session hashes rotate with the HMAC key so old hashes become unlinkable. State this in the policy.
- GDPR basics [K]: lawful basis (consent for dataset release; legitimate interest for abuse prevention), purpose limitation, data minimisation, right of access / erasure / portability. Since you do not know who the user is, offer deletion by session: show the session ID in a "Your data" panel; `DELETE /me` removes battles tied to that session and flags them for removal from the next dataset release. Be upfront that already-published dataset releases cannot be recalled, other than on the next version. Provide a contact email for requests; respond within one month. For children, say service is for 13+/16+ (check target jurisdictions) [K].
- Third-party model providers: prompts go to each provider's API; disclose this, and use no-training/zero-retention API options where offered [K].
- Security: encrypt at rest (D1/R2 default), restrict admin access, log access to raw data.

---------------------------------------------------------------------
### Recommendations for DualMind

- Rating method: batch-fit Bradley-Terry (logistic regression, +1/-1 design matrix, no Elo online updates), weighted by 1/P(pair), ties as two half-weight rows, both-bad treated as tie plus a separate stat. Rating = 1000 + 400*beta/ln(10), mean-centred to 1000 and documented. Show default and style-controlled (length + headers/bold/lists, relative-normalised) boards.
- CI method: percentile bootstrap, B=1000, 95%; recompute on a schedule and cache. Display rating +/- half-width and a rank spread (best = 1 + #models strictly above by CI, worst = 1 + #models whose upper CI exceeds this lower CI); sort by raw rank.
- Minimum-votes rule: mark "preliminary" below 300 battles or CI half-width over 20 points; exclude from rank 1 claims and from the win-rate matrix highlight until it clears; show battle counts everywhere.
- Integrity checks: UNIQUE(battle_id) votes, server-signed battle tokens, min read time (about 2-3 s or length-scaled), Turnstile at session start, per-session and hashed-IP rate limits, hourly anomaly job (side-bias binomial test, bursts, Fisher combined p-values) that quarantines instead of deleting, prompt-hash dedup cap, identity-leak regex plus "who are you" prompt detection excluding those votes, no model names before vote.
- Moderation: Llama Guard 3 (`@cf/meta/llama-guard-3-8b`) on Workers AI for prompts and responses (or free OpenAI `omni-moderation-latest` if third-party calls are acceptable); block unsafe prompts without storing text, mark and exclude unsafe responses, track refusal rate per model, per-response Report button feeding an admin queue that auto-hides from datasets.
- Privacy defaults: consent notice with "do not enter personal info", random session ID plus HMAC-hashed IP (no raw IP), 90-day raw retention, PII-scrubbed and moderation-filtered periodic dataset release without user IDs, session-based delete/export route, disclose provider data flows.
- Fairness (from Leaderboard Illusion): publish the sampling policy, battle counts and deprecation list; no hidden models or retracted scores; active sampling (variance-reduction formula above) with a per-model share cap.

---

## Part 3: The Cloudflare platform

Date: 2026-10-20. Figures were read from Cloudflare docs today unless marked (unverified) = from general knowledge, not re-checked today. Re-check pricing before committing spend.

Assumption: Arena needs Workers Paid ($5/month minimum). Free-tier CPU (10 ms) and subrequest (50) limits are too tight for streaming battles and fan-out jobs, and most paid features (Queues retention, DO duration, Workflows scale) assume Paid.

---

### 1. Workers, builds, bindings, routing

#### Workers runtime limits
Source: https://developers.cloudflare.com/workers/platform/limits/ and https://developers.cloudflare.com/workers/platform/pricing/

| Item | Free | Paid |
|---|---|---|
| CPU per HTTP request | 10 ms | 30 s default, up to 5 min (`limits.cpu_ms`) |
| CPU per Cron Trigger | 10 ms | 30 s (<1h interval) / 15 min (>=1h) |
| Wall time (HTTP) | no limit | no limit |
| Wall time (cron, queue consumer, DO alarm) | 15 min | 15 min |
| Subrequests per request | 50 | 10,000 (configurable to 10M) |
| Simultaneous open connections | 6 | 6 |
| Memory per isolate | 128 MB | 128 MB |
| Workers / Cron Triggers per account | 100 / 5 | 500 / 250 |
| Price | 100k req/day | 10M req + 30M CPU-ms/month incl.; $0.30 per extra M req, $0.02 per extra M CPU-ms |

- CPU time counts only compute. Waiting on `fetch()`, KV, D1 or an LLM stream is free (docs: "waiting on network requests does not count toward CPU time"). This is why a Worker that proxies 2 LLM streams for 60 s costs almost no CPU.
- Duration is not billed. Static asset requests are free and unlimited.
- Gotcha: the 6 simultaneous "waiting for headers" connections limit. Two provider streams plus a KV/D1 read stay within it, but a fan-out of 10+ parallel fetches queues. Once headers arrive, a connection stops counting.
- Gotcha: `ctx.waitUntil()` work after the response has a 30 s cap (https://developers.cloudflare.com/workers/best-practices/workers-best-practices/). Use Queues or Workflows for anything longer.
- Gotcha: the Vitest plugin injects `nodejs_compat`, so tests can pass when production lacks the flag. Put `nodejs_compat` in wrangler config explicitly.

#### Streaming and SSE
- Return `new Response(readable, {headers: {"content-type": "text/event-stream"}})` with a `TransformStream`. The Worker stays alive while the body is streaming, so no `waitUntil` is needed (same best-practices page).
- Never buffer: 128 MB memory limit. Pipe `upstream.body` through.
- Client disconnect: abort the upstream fetches via `AbortSignal` so you stop paying the providers.
- Fit: the Arena battle stream is the main use. See section 3 for the two-provider multiplex.

#### Smart Placement
- Config `placement: { mode: "smart" }` (https://developers.cloudflare.com/workers/configuration/placement/) runs the Worker near the backend it talks to if that lowers latency.
- Fit: useful for the existing proxy to api.dualmindlab.tech (ASP.NET), if that API lives in one region. Not useful for static assets. Do not enable it on the Worker that mostly calls D1 read replicas or LLM APIs without measuring. Metrics show request-duration impact.
- Gotcha: placement only helps when most time is spent waiting on one origin. With a fan-out to several origins it may do nothing.

#### Workers Builds (CI from git)
Source: https://developers.cloudflare.com/workers/ci-cd/builds/
- Non-production branches create a Preview with a Preview URL (not a Worker version or deployment). Production branch builds create a version and, if deploy is enabled, the active deployment.
- Alternative: set the deploy command to `npx wrangler versions upload` to build and save versions without promoting.
- Preview bindings, secrets and resource isolation are set in the Previews docs, so previews can point at a separate D1/KV (see section 6).
- Not documented on the fetched page: build-minute quotas and plan limits (check dashboard).
- Gotcha: Harsh's rule is heavy work in GitHub Actions. Workers Builds runs on Cloudflare, not on the VM, so it is acceptable for deploy. Tests and migrations still belong in GitHub Actions.

#### Service bindings and RPC
- A Worker can call another Worker through a binding with no public URL, no extra request billing hop beyond the called Worker's own invocation, and typed RPC methods via `WorkerEntrypoint` (https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/). (billing details unverified)
- A `connect()` handler no longer needs an experimental flag since Aug 2026 (https://developers.cloudflare.com/changelog/post/2026-08-18-connect-handler/). Not needed for Arena.
- Fit: split a public edge Worker (assets + auth + routing) from private Workers (votes, battles, jobs) only if different bindings, deploy cadence or secrets justify it. Otherwise one Worker is simpler.
- Gotcha: each Worker is separately deployed and versioned, so a breaking RPC change needs a coordinated deploy.

#### One Worker with a router vs several Workers/routes
- Recommendation: one `dualmind-arena` Worker with Hono (or the similar router) for `/api/*` own endpoints plus the proxy pass-through for the legacy ASP.NET routes. Reasons: shared auth middleware, shared bindings, one deploy, CI simplicity. Add a second Worker only for the queue consumer / cron / Workflows (they can live in the same Worker as extra handlers too: `fetch`, `queue`, `scheduled` exports in one module).
- Hono: typed routes, middleware, `@hono/zod-openapi` for OpenAPI generation, good Workers support, small. itty-router: smaller still, less ecosystem. Plain `switch(url.pathname)`: fine for under about 8 routes but no middleware story. (router comparison is general knowledge, unverified)
- Split Workers (route-based) only when teams or blast radius differ. The waitlist Worker already stays separate and should remain so.

---

### 2. Storage and compute primitives

#### D1
Sources: https://developers.cloudflare.com/d1/platform/limits/ , https://developers.cloudflare.com/d1/platform/pricing/
- Limits: 10 DBs and 500 MB each on Free; 50,000 DBs and 10 GB each on Paid. 100 columns/table, 2 MB row, 100 bound params/query, 100 KB SQL, 30 s max query. Queries per Worker invocation: 50 Free / 1,000 Paid. `db.batch()` limits apply per statement, 30 s total for the batch.
- Pricing (Paid): 25B rows read + 50M rows written/month included, then $0.001 per M reads and $1.00 per M writes; storage 5 GB included, $0.75/GB-month. Free: 5M reads/day and 100k writes/day. Since 2026-09-01 free-tier overage queries fail rather than bill (https://developers.cloudflare.com/changelog/post/2026-09-01-d1-free-tier-limit-enforcement/).
- Single-writer: one primary handles all writes, so write throughput is bounded by one SQLite instance. A vote table at modest scale is fine; batch heavy writes.
- Time Travel: 7 days Free / 30 days Paid point-in-time restore, 10 restores per 10 min per DB.
- Read replication + Sessions API (https://developers.cloudflare.com/d1/best-practices/read-replication/): enable in dashboard or REST (`read_replication.mode = auto`); use `env.DB.withSession(bookmark | "first-primary" | "first-unconstrained")`, return `session.getBookmark()` in a header (e.g. `x-d1-bookmark`) and send it back for read-your-writes and monotonic reads. No extra cost beyond rows read/written. Sessions only work through the Worker binding. Docs page does not state beta/GA status, so check before relying on it.
- Migrations: `wrangler d1 migrations create/apply <db> [--local|--remote]`, files in `migrations/`, tracked in `d1_migrations` table; `migrations_dir` and `migrations_pattern` configurable (https://developers.cloudflare.com/d1/reference/migrations/).
- Local/test: `wrangler dev` uses a local SQLite file via Miniflare; `preview_database_id` separates preview from prod (https://developers.cloudflare.com/d1/best-practices/local-development/).
- Environments: per-env D1 binding in `env.staging.d1_databases` (https://developers.cloudflare.com/d1/configuration/environments/).
- Jurisdiction: `--jurisdiction=us` exists since Oct 2026 (changelog). Irrelevant unless residency matters.
- Fit: system of record for votes, battles metadata, rating snapshots, idempotency keys, audit log. Gotcha: no cross-DB transactions; keep all vote-critical tables in one DB. Gotcha: Free-tier daily write cap (100k) would stop the app mid-day, one more reason for Paid.

#### KV
Source: https://developers.cloudflare.com/kv/platform/limits/
- Eventually consistent, read-optimized. Limits: 25 MiB value, 512 B key, 1 write/sec per key, `cacheTtl` min 30 s. Free: 100k reads/day, 1,000 writes/day, 1 GB; Paid: unlimited ops (usage billed).
- Fit: cached leaderboard JSON, feature flags, model catalog, JWKS cache. Not for votes or counters (write-per-key limit, stale reads).
- Gotcha: propagation delay means a flag flip may take up to about a minute to be seen everywhere (general knowledge, unverified).

#### R2
Source: https://developers.cloudflare.com/r2/pricing/
- Standard $0.015/GB-month; Class A $4.50/M, Class B $0.36/M; egress free; free tier 10 GB, 1M A, 10M B per month.
- Fit: share-card PNGs, leaderboard CSV/JSON exports, D1 backup dumps. Serve through the Worker or a custom domain with Cache.
- Gotcha: generating share cards means rendering (Satori/resvg-wasm style or Browser Rendering). CPU cost per image is real (tens of ms); generate once on first share, store in R2 keyed by battle id, cache forever.

#### Queues
Sources: https://developers.cloudflare.com/queues/platform/limits/ , https://developers.cloudflare.com/queues/platform/pricing/
- Limits: 128 KB message, batch up to 100 messages (max wait 60 s), 5,000 msg/s per queue, up to 100 retries, retention 24 h on Free and up to 14 days on Paid (default 4), `delaySeconds` up to 24 h, 250 concurrent consumer invocations, 15 min consumer wall time, 30 s CPU default (up to 5 min).
- Pricing: per 64 KB operation; typical message = 3 operations (write, read, delete); Free 10k ops/day; Paid 1M ops/month then $0.40/M. No egress charge. 1M msgs/day is about $35.6/month.
- DLQ: configurable per consumer (`dead_letter_queue` in consumer config) (general knowledge, unverified; page fetched did not mention it). Retries add read ops, DLQ adds writes.
- Fit: async work off the vote path: "vote recorded" event -> rating recompute batch, moderation checks, share-card generation, leaderboard snapshot fan-out. Batch consumers coalesce many votes into one Bradley-Terry update.
- Gotcha: at-least-once delivery, so consumers must be idempotent (use the idempotency key / event id in D1).
- Gotcha: `send()` counts toward the 6-connection limit and throws at over 5,000 msg/s.

#### Cron Triggers
- Free 5 / Paid 250 per account. CPU 30 s (<1h interval) or 15 min (>=1h), wall 15 min.
- Fit: nightly full Bradley-Terry refit, hourly leaderboard snapshot to D1 + R2 export, retention cleanup. Cron should enqueue work or start a Workflow rather than do heavy work inline.
- Gotcha: cron is at-least-once-ish and can overlap; guard with a lock row or deterministic snapshot id.

#### Durable Objects (SQLite-backed)
Source: https://developers.cloudflare.com/durable-objects/platform/pricing/
- Single-threaded, strongly consistent per object, own SQLite storage. Free plan allows only SQLite-backed DOs: 100k req/day, 13,000 GB-s/day, 5M rows read, 100k rows written, 5 GB.
- Paid: 1M requests/month incl., $0.15/M; 400k GB-s incl., $12.50/M GB-s; rows read 25B / written 50M incl.; storage $0.20/GB-month (SQLite storage billing from 2026-01-07).
- WebSocket hibernation: idle hibernating objects are not charged duration; incoming messages bill at 20:1; outgoing messages and pings are free. Without hibernation, a connected socket keeps billing duration (docs example: about $419/month for 100 always-on objects vs about $21 with hibernation).
- Fit 1: per-user rate limiting / vote cooldown with exact counts (1 DO per user id). Fit 2: live leaderboard fan-out: one `LeaderboardRoom` DO holds hibernating WebSockets and broadcasts updates when a snapshot changes. Fit 3: per-battle coordinator for streaming battles (optional).
- Gotcha: a single hot DO is a serialization point (about 1k req/s order of magnitude, unverified); shard by user or battle id, never one global counter object.
- Gotcha: DOs live in one location, so cross-ocean users pay latency.

#### Workflows
Source: https://developers.cloudflare.com/workflows/reference/limits/
- Durable multi-step execution with `step.do`, `step.sleep`, retries. Free: 10 ms CPU/step, 100 concurrent instances, 1,024 steps, 3-day retention. Paid: 30 s CPU/step (to 5 min), 50,000 concurrent, 10,000 steps (to 25,000), 1 GB state, 30-day retention, 1 MiB per step result and event payload. Workflows can have cron schedules (up to 100 per account).
- Pricing: not on the limits page (CPU-time and request based; check https://developers.cloudflare.com/workflows/platform/pricing/).
- Fit: the nightly "recompute ratings -> write snapshot -> export CSV to R2 -> purge KV cache -> notify" pipeline, where each step must retry independently. Also a moderation appeal flow with human wait (`step.waitForEvent`).
- Gotcha: step results must be under 1 MiB; keep big data in D1/R2 and pass ids. Steps must be idempotent (retried).
- Queues vs Workflows: Queues for high-volume small events; Workflows for few, long, multi-step jobs.

---

### 3. AI: Workers AI, AI Gateway, dual-provider streaming

#### Workers AI
Source: https://developers.cloudflare.com/workers-ai/platform/pricing/ , https://developers.cloudflare.com/workers-ai/models/
- Free allocation 10,000 Neurons/day; paid $0.011 per 1,000 Neurons above that (needs Workers Paid).
- Guard model: exactly one listed under safety: `@cf/meta/llama-guard-3-8b` (classifies prompts and responses safe/unsafe with violated categories). Price $0.484/M input tokens, $0.030/M output tokens.
- Text generation catalog today has 38 models, including `gpt-oss-120b` and `gpt-oss-20b` (OpenAI), `llama-3.3-70b-instruct-fp8-fast`, `llama-4-scout-17b-16e-instruct`, `mistral-small-3.1-24b-instruct`, `qwen3-30b-a3b-fp8`, `qwq-32b`, `deepseek-v4-flash/pro`, `kimi-k2.6`, `glm-5.x`, `gemma-4-26b-a4b-it`, `nemotron-3-120b-a12b`, and Cloudflare's own `clef` family.
- Sample prices per M tokens in/out: llama-3.1-8b-fp8-fast $0.045/$0.384; llama-3.3-70b-fast $0.293/$2.253; gpt-oss-20b $0.20/$0.30; gpt-oss-120b $0.35/$0.75.
- Fit: cheap open-weight contestants in the arena (no separate provider keys, one bill), plus Llama Guard on user prompts before a battle starts.
- Gotcha: Llama Guard input price is high relative to small chat models, so a guard call on every prompt can cost more than the answer from an 8B model. Guard only user prompts (not both answers), cache verdicts by prompt hash in KV, or run a cheap regex/blocklist first.
- Gotcha: third-party text models are removed or renamed often; keep the model id in D1/KV config, not hard-coded.

#### AI Gateway
Sources: https://developers.cloudflare.com/ai-gateway/reference/pricing/ , https://developers.cloudflare.com/ai-gateway/usage/providers/ , https://developers.cloudflare.com/ai-gateway/usage/chat-completion/
- Free on all plans: dashboard analytics, caching, rate limiting. Logs: gateways created on/after 2026-09-24 use Workers Logs pricing/retention; older gateways: 100k logs total on Free, 10M per gateway on Paid. DLP free. Guardrails are billed as Workers AI inference. Unified Billing: 5% fee on credit purchases, provider rates pass through.
- 24 providers including OpenAI, Anthropic, Google AI Studio, Vertex, Bedrock, Groq, Mistral, xAI, DeepSeek, OpenRouter, Workers AI.
- Endpoints (as of May 2026 changelog, https://developers.cloudflare.com/changelog/post/2026-05-21-rest-api/): `POST api.cloudflare.com/client/v4/accounts/{id}/ai/v1/chat/completions` (OpenAI shape), `/ai/v1/messages` (Anthropic shape), `/ai/v1/responses`, `/ai/run`. Pass `cf-aig-gateway-id` to choose a gateway. The older `/compat/chat/completions` still works but is marked deprecated for single-model calls. The Universal Endpoint is deprecated; fallbacks and retries moved to Dynamic Routing (`model: "dynamic/<route>"`, OpenAI chat shape only).
- From a Worker use the `AI` binding: `env.AI.run("openai/...", payload, { gateway: { id } })` (https://developers.cloudflare.com/ai-gateway/features/dynamic-routing/usage/).
- Custom metadata: per-request metadata (e.g. user id, battle id) for analytics and for Dynamic Route conditionals (https://developers.cloudflare.com/ai-gateway/observability/custom-metadata/); header name `cf-aig-metadata` is from general knowledge, unverified today.
- BYOK: store provider keys in the gateway; the Worker sends only a gateway token (`cf-aig-authorization`). Dynamic routing requires gateway auth on and BYOK keys stored.
- Fit: single control plane for all contestants: cost per model, latency, cache, per-user rate limit, logs, key custody out of the Worker.
- Gotcha: caching must stay OFF (or keyed carefully) for arena battles. Identical prompts must give independent samples, and cached answers would bias ratings.
- Gotcha: Auto Router (`cloudflare/auto`) picks models for you; never use it for blinded contestants, since the model must be the one the battle recorded. Read `cf-aig-model` / `cf-aig-provider` response headers to log what actually answered.
- Gotcha: logs count against retention limits; store the battle transcript yourself in D1/R2 if it is needed for moderation or disputes.

#### Streaming two providers into one SSE stream
Pattern (no doc page; standard Workers streams):
1. Validate auth + rate limit + Turnstile + guard, create `battle_id` and an idempotency row in D1.
2. Start both upstream `fetch()` calls in parallel with `stream: true`, sharing one `AbortController` tied to `request.signal`. Use the gateway so both go through the same base URL and logging (metadata: battle_id, slot A/B).
3. Create a `TransformStream`. For each upstream, read `response.body` with a reader, parse its SSE lines (OpenAI `data: {...}` / Anthropic `event: content_block_delta`), and write normalized frames to the writer: `event: delta\ndata: {"slot":"A","text":"..."}`. Serialize writes through one promise chain, since two readers writing concurrently to one writer must not interleave partial frames.
4. Heartbeat comment `: ping` every 15 s to keep proxies open. On finish of both, write `event: done` with usage and latency, then close.
5. Persist outcomes (final text, tokens, ms, finish reason, which model) in `ctx.waitUntil` or via a Queue message; do not rely on the client to report.
6. Blind arena: never send model ids in stream frames; reveal only after the vote.
- Limits that matter: 2 streams stay within 6 simultaneous connections; CPU cost is only parsing (low); memory low if you never buffer whole bodies; keep individual events small.
- Gotchas: (a) one provider failing should not kill the battle: emit `event: error {slot:"B"}` and let the client mark the battle void; (b) if AI Gateway Dynamic Route falls back to another model, the "model B" label changes, so record the actual model from response headers; (c) browsers' `EventSource` cannot POST or send auth headers, so use `fetch()` + `ReadableStream` on the client with the Supabase bearer token.

---

### 4. Security and abuse

#### Rate Limiting binding
Source: https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/
- Config `ratelimits: [{ name, namespace_id, simple: { limit, period: 10|60 } }]` (Wrangler 4.36+). `await env.RL.limit({ key })` -> `{ success }`.
- Per Cloudflare location, eventually consistent and "permissive", not for accurate accounting; no network round trip, so near-zero latency. Same `namespace_id` shares counters across Workers.
- Key by authenticated user id (after JWT verify), not IP.
- Fit: coarse abuse guard on all `/api/*` and per-route limits (e.g. vote 30/min, battle start 6/min). Pair with a Durable Object when you need an exact cap (daily battle quota per user).
- Gotcha: a user hopping between locations gets the limit multiplied. Fine for abuse control, wrong for quotas or billing.

#### WAF rate limiting rules
- Rule-based, configured at the zone (https://developers.cloudflare.com/waf/rate-limiting-rules/) before the Worker runs (so blocked requests cost no Worker invocation). Counting characteristics and mitigation timeouts depend on plan; Free plans have limited rules (exact plan matrix unverified today, check the docs).
- Fit: a blunt edge rule on `/api/battle` per IP as the first layer; the Worker binding is the second layer keyed by user.
- Gotcha: requires the hostname to be proxied through a Cloudflare zone, which works for dualmindlab.tech routes but not for `*.workers.dev`.

#### Turnstile
Source: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
- Server verifies with `POST https://challenges.cloudflare.com/turnstile/v0/siteverify` (`secret`, `response`, optional `remoteip`, optional `idempotency_key` UUID for safe retries). Tokens expire in 300 s, are single use, max 2048 chars. Always call from the Worker, never the browser; set a timeout.
- Fit: gate guest (anonymous) battle starts and signup. Skip for signed-in users with good history to save friction.
- Gotcha: a token verified once is burned, so verify once per battle start, not per vote. Make the verification part of the idempotent request flow (retry with the same `idempotency_key`).

#### Verifying Supabase JWTs in a Worker
Source: https://supabase.com/docs/guides/auth/jwts
- Public keys at `https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json` (also derivable from the token `iss` + `/.well-known/jwks.json`). Match header `kid` and `alg`. The endpoint returns no keys unless the project uses asymmetric signing keys. The fetched page does not say asymmetric is the default; verify in the Supabase dashboard (Project Settings > JWT Keys) that Arena's project has migrated off the legacy HS256 secret.
- Supabase edge caches JWKS for 10 minutes; do not cache longer in your code; after key rotation wait 20+ minutes.
- Use `jose`: `createRemoteJWKSet(new URL(jwksUrl))` + `jwtVerify(token, jwks, { issuer, audience: "authenticated" })`. `jose` works in Workers (WebCrypto). Cache the JWKS object at module scope so isolate reuse avoids refetch; optionally mirror in KV with a short TTL.
- Check `exp`, `iss`, `aud`, and `sub` (user id) explicitly; use `app_metadata.role`/custom claims for admin routes.
- Legacy HS256: Supabase recommends against verifying with the shared secret and suggests `GET /auth/v1/user` instead, which is a network call to one region (slow from the edge). Prefer migrating to asymmetric keys.
- Gotcha: JWTs cannot be revoked before `exp` (default 1 h); for banned users also check a `banned_users` row in D1/KV on sensitive writes.

#### Secrets
- `wrangler secret put NAME` for per-Worker secrets (env var size limit 5 KB; 64 vars Free / 128 Paid). Secrets Store (account-level shared secrets, binding `secrets_store_secrets`) exists for sharing across Workers (unverified details, check https://developers.cloudflare.com/secrets-store/). Local dev: `.dev.vars` (never commit).
- Put provider keys in AI Gateway BYOK, so the Worker holds only the gateway token, a Turnstile secret, and the D1 bindings. Fewer secrets in Worker env.
- In CI, deploy tokens as GitHub Actions secrets; scope Cloudflare API tokens to Workers + D1 edit only.

#### CORS and CSP
- Same-origin `/api` (current design) means no CORS is needed. Keep it that way; do not add `Access-Control-Allow-Origin: *`. If a third-party client is ever added, allowlist origins explicitly and never reflect Origin with credentials.
- SSE/fetch streaming to the same origin works with `connect-src 'self'`. If the page opens WebSockets to a DO (`wss://arena.../ws/leaderboard`) include it in `connect-src` (same-origin `'self'` covers wss on same host in modern browsers, but add the explicit `wss:` host to be safe).
- Turnstile needs `script-src https://challenges.cloudflare.com` and `frame-src https://challenges.cloudflare.com`.
- Supabase client needs `connect-src https://<ref>.supabase.co wss://<ref>.supabase.co`.
- Gotcha: set `Cache-Control: no-store` on authenticated API responses and `Vary: Authorization` if anything caches them; Cloudflare cache must never serve one user's stats to another.

---

### 5. Observability

- Workers Logs (https://developers.cloudflare.com/workers/observability/logs/workers-logs/): Free 200k events/day, 3-day retention; Paid 20M/month included, $0.60 per extra M, 7-day retention. `head_sampling_rate` 0 to 1; `observability.enabled = true`. From 2026-12-01 pricing moves to "Cloudflare Observability pricing" (re-check). Use structured `console.log(JSON.stringify({...}))` with `battle_id`, `user_id` hash, `route`, `ms`.
- Traces (https://developers.cloudflare.com/workers/observability/traces/): automatic tracing in early beta; opt in with `observability.traces.enabled = true`; exports via OpenTelemetry to Honeycomb/Grafana/Axiom; `persist:false` to export without storing in Cloudflare. 7-day retention; stored traces become billable from 2026-12-01. Sample (`head_sampling_rate` 0.05) to control cost.
- Analytics Engine (https://developers.cloudflare.com/analytics/analytics-engine/limits/): `env.AE.writeDataPoint({ blobs, doubles, indexes })`; up to 20 blobs, 20 doubles, 1 index (96 B) per point; 16 KB blobs; 250 data points per invocation; 3-month retention; query via SQL API. Pricing not on the fetched page (check https://developers.cloudflare.com/analytics/analytics-engine/pricing/).
  - Fit: votes per second, per-model time-to-first-token and total latency, error rate by provider, moderation hit rate, rate-limit denials. Index by model id or route; doubles for latency/token counts.
  - Gotcha: sampled at high volume (data points may be sampled, use `_sample_interval` in queries) (general knowledge, unverified).
- Tail Workers (`tail_consumers`): receive each invocation's logs/exceptions for custom handling (e.g. forward errors to a webhook or D1). Good for error alerts without a vendor. Logpush for Workers (`logpush: true`) ships trace events to R2/S3/etc. as files for long retention and audit (https://developers.cloudflare.com/workers/observability/logs/logpush/). Billed under Logpush pricing.
- Audit trail: do not use logs as audit. Write security-relevant events (vote accepted, ban, moderation decision, admin action) into a D1 `audit_log` table (append-only), with a copy to R2 via cron export. Logs are sampled, short-lived and not queryable by SLA.
- AI Gateway adds its own per-request logs, cost and latency analytics; join with your battle id through metadata.

---

### 6. Testing and CI

#### Vitest plugin (Miniflare)
Sources: https://developers.cloudflare.com/workers/testing/vitest-integration/ , https://developers.cloudflare.com/changelog/post/2026-08-19-vitest-plugin/
- Package renamed: `@cloudflare/vitest-pool-workers` is now `@cloudflare/vitest-plugin` (v1, Aug 2026). Requires Vitest >= 4.1. Config: `plugins: [cloudflareTest({ wrangler: { configPath: "./wrangler.jsonc" } })]`. Codemod: `npx @cloudflare/codemods vitest:pool-workers-to-vitest-plugin`.
- Real bindings in tests via `import { env } from "cloudflare:workers"`: D1, KV, R2, Queues, DOs, Workflows (see DO testing example https://developers.cloudflare.com/durable-objects/examples/testing-with-durable-objects/). Storage isolation is per test file (not per test) since 0.13; `isolatedStorage` / `singleWorker` options are gone.
- D1 migrations in tests: `readD1Migrations()` in config + `applyD1Migrations()` in a setup file (https://developers.cloudflare.com/workers/testing/vitest-integration/configuration/).
- Outbound mocks: `fetchMock` from `cloudflare:test` is removed; use `@msw/cloudflare` (https://developers.cloudflare.com/workers/testing/vitest-integration/mock-outbound-requests/). Mock the LLM providers and Supabase JWKS with it. For JWT tests generate a keypair with `jose` and serve a local JWKS.
- Gotcha: tests auto-inject `nodejs_compat`; assert the flag in wrangler config separately. Per-file storage means tests within a file share D1 state; reset tables in `beforeEach`.
- Heavy work rule: run `vitest run` in GitHub Actions, not on the VM.

#### Contract testing
- Define routes with `@hono/zod-openapi` (single source: zod schema -> validation + OpenAPI document). Publish `openapi.json` as a CI artifact; frontend generates its client from it (e.g. `openapi-typescript`).
- Schemathesis (https://schemathesis.readthedocs.io, general knowledge) fuzzes the live preview URL from the OpenAPI doc in a GitHub Actions job; needs a test JWT and a preview D1, and must exclude LLM endpoints (cost) or point them at a stubbed provider.
- Add golden-file tests for SSE frames (event names and JSON shapes) because OpenAPI cannot describe streams well.

#### Deploy checks and previews
- `wrangler deploy --dry-run --outdir dist` validates bundling and bindings without deploying (cheap CI check; general knowledge, flag exists in wrangler 3/4).
- `wrangler versions upload` + Preview URLs for PR previews (Workers Builds page above), or deploy a `--env staging` Worker from Actions.
- Separate preview database: `env.staging.d1_databases` with its own `database_id` (https://developers.cloudflare.com/d1/configuration/environments/). CI flow: `wrangler d1 migrations apply DB --env staging --remote` -> seed fixtures -> run tests/schemathesis against the staging Worker -> on merge `migrations apply --env production --remote` then deploy. Never run `--remote` against production from a PR job; keep the production deploy token in a protected environment with required reviewers.
- Migration safety: only additive migrations in the same release as code that needs them (expand/contract); D1 has Time Travel as a safety net (30 days Paid), but restoring rewinds everything including votes cast since.

---

### 7. Hyperdrive and Supabase Postgres

Sources: https://developers.cloudflare.com/hyperdrive/platform/pricing/ , https://developers.cloudflare.com/hyperdrive/reference/supported-databases-and-features/ , https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/
- What: connection pooling + query caching in front of Postgres/MySQL; Worker gets `env.HYPERDRIVE.connectionString` and uses `pg` (recommended) or `postgres` (do not set `prepare:false`) with `nodejs_compat`. Supabase is listed as supported (Postgres 15.x).
- Pricing: included on Free (100k queries/day) and Paid (unlimited queries); no data transfer fee; caching and pooling free.
- Local dev: `localConnectionString` or `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_<BINDING>`; caching does not apply locally.
- Pros of Hyperdrive: read existing Supabase tables (profiles, any legacy battle data) without migrating; one source of truth; Supabase RLS/Auth stay intact; fast to adopt.
- Cons: every query is a cross-network hop to one Supabase region (Hyperdrive reduces connection setup, not distance); transaction pooling restricts session features (prepared-statement quirks, advisory locks, LISTEN/NOTIFY); you carry Supabase compute limits and a second failure domain; Workers' 6-connection and subrequest limits apply (`max: 5` in the driver); credentials (a Postgres connection string) sit in Hyperdrive config, so use a least-privilege role, not the service role.
- Pros of D1: colocated with the Worker, per-request cost in rows not connections, free read replicas, Time Travel, simple testing in Miniflare. Cons: 10 GB cap, single writer, SQLite SQL dialect, no joins across stores.
- Verdict: keep identity and user profile data in Supabase (accessed through JWT claims, not Hyperdrive, on the hot path). Put hot, write-heavy, edge-latency data (votes, ratings, snapshots, idempotency, audit) in D1. Use Hyperdrive only for occasional reads/joins from Supabase (e.g. enriching leaderboard with display names, admin exports) and cache aggressively in KV. Avoid dual-writing the same entity to both stores.

---

### Cost sanity check (Paid, order of magnitude, at 100k battles/month, 1M votes/month)
- Workers requests/CPU: well inside the included 10M requests / 30M CPU-ms ($5 base).
- D1: 1M votes = about 1-3M rows written (vote + idempotency + audit), included allowance is 50M; reads included to 25B. Effectively $0.
- Queues: 1M messages x 3 ops = 3M ops, about $0.80 over the free 1M.
- LLM tokens dominate cost (Workers AI or provider bills via Gateway). Llama Guard on 100k prompts of about 200 tokens = 20M input tokens, about $9.7.
- Observability: Workers Logs 20M events included; sample if each request logs many lines.

---

### Recommended architecture for DualMind

- Services: one Worker `dualmind-arena` (static assets + Hono router: `/api/*` own routes, plus the existing hardened proxy to api.dualmindlab.tech); same module also exports `queue` and `scheduled` handlers; Workflow class `NightlyRatings`; DO classes `UserLimiter` (SQLite-backed, per-user quotas) and `LeaderboardRoom` (hibernating WebSockets). Waitlist Worker stays untouched.
- Request path: Rate Limiting binding (key = user id) -> `jose` JWT verify via Supabase JWKS -> Turnstile only for guests -> Llama Guard (cached by prompt hash in KV) -> battle start with idempotency key row in D1 -> dual-provider SSE multiplex through AI Gateway (cache off, metadata battle_id/slot).
- Bindings: D1 `DB` (+ read replication with Sessions bookmarks for leaderboard reads), KV `CACHE` (leaderboard JSON, flags, JWKS mirror), R2 `ASSETS` (share cards, exports, D1 dumps), Queue `EVENTS` + DLQ, Analytics Engine `METRICS`, Rate limit `RL`, AI `AI` (gateway id in options), Workflows, DOs. No Hyperdrive in v1.
- Data ownership: Supabase owns identity (auth.users, profiles, roles). D1 owns arena data: battles, votes (unique on user+battle), idempotency_keys, ratings, rating_snapshots, moderation_events, audit_log. Join on `sub` (Supabase user id) stored as text in D1; no foreign keys across systems; no dual writes. Add Hyperdrive later only for read-only Supabase lookups.
- Async: vote insert returns fast; enqueue `vote.recorded`; consumer batches (up to 100) and updates ratings idempotently; hourly cron enqueues snapshot; nightly Workflow does full Bradley-Terry refit -> snapshot row -> R2 export -> KV purge -> DO broadcast.
- Secrets: provider keys in AI Gateway BYOK; Worker secrets limited to gateway token, Turnstile secret, JWT issuer config; `.dev.vars` local only.
- Observability: Workers Logs (sampled, JSON), Analytics Engine for vote rate and per-model latency/TTFT, D1 `audit_log` for security events, optional OTel traces at 5% sampling, a Tail Worker for error alerts to WhatsApp.
- Testing: `@cloudflare/vitest-plugin` with real D1/KV/Queue/DO bindings and applied migrations; `@msw/cloudflare` for providers and JWKS; zod-openapi spec + Schemathesis on the staging Worker (LLM routes stubbed); SSE golden tests; all of it in GitHub Actions only.
- Environments: `production` and `staging` (own D1, KV, R2, queue, DO namespace, Turnstile test keys, AI Gateway with a spend cap); local = Miniflare. PR flow: Actions applies migrations to staging, deploys a staging version (or Workers Builds Preview), runs contract + e2e; merge to main applies production migrations then deploys, with a protected deploy token. Multi-commit work always via branch + PR.
- First checks before building: confirm Supabase project uses asymmetric JWT signing keys; confirm D1 read replication GA status; decide Workers Logs vs sampling budget before the 2026-12-01 pricing change.

