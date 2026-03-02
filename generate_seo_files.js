const fs = require('fs');
const path = require('path');

function ensureDirSync(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function writeFileSync(filePath, content) {
    ensureDirSync(path.dirname(filePath));
    fs.writeFileSync(filePath, content.trim() + '\n', 'utf8');
    console.log(`Created/Updated: ${filePath}`);
}

// 1. robots.txt
writeFileSync('robots.txt', `User-agent: *
Allow: /
Disallow: /api/
Disallow: /battle-session/
Disallow: /admin/

Sitemap: https://arena.dualmindlab.tech/sitemap.xml`);

// 2. sitemap.xml
writeFileSync('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://arena.dualmindlab.tech/</loc>
    <lastmod>2025-01-01</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://arena.dualmindlab.tech/leaderboard</loc>
    <lastmod>2025-01-01</lastmod>
    <changefreq>hourly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://arena.dualmindlab.tech/battle</loc>
    <changefreq>always</changefreq>
    <priority>0.95</priority>
  </url>
  <url>
    <loc>https://arena.dualmindlab.tech/compare</loc>
    <changefreq>daily</changefreq>
    <priority>0.85</priority>
  </url>
  <url>
    <loc>https://arena.dualmindlab.tech/models</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://arena.dualmindlab.tech/blog</loc>
    <changefreq>weekly</changefreq>
    <priority>0.75</priority>
  </url>
  <url>
    <loc>https://arena.dualmindlab.tech/about</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>https://arena.dualmindlab.tech/methodology</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
</urlset>`);

// 3. manifest.json
writeFileSync('manifest.json', `{
  "name": "DualMind Arena",
  "short_name": "DualMindArena",
  "description": "Human-voted AI model battle platform. Vote. Compare. Rank.",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#4AABC2",
  "background_color": "#0f1115",
  "icons": [
    { "src": "/assets/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/assets/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}`);

// Helper to get base HTML template
function getHtmlTemplate(title, metaDescription, canonicalPath, jsonLd, mainContent) {
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <title>${title}</title>
  <meta name="description" content="${metaDescription}" />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://arena.dualmindlab.tech${canonicalPath}" />

  <!-- Fonts & Icons -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/remixicon@4.3.0/fonts/remixicon.css" rel="stylesheet">

  <!-- App CSS -->
  <link rel="stylesheet" href="/css/tokens.css" />
  <link rel="stylesheet" href="/css/styles.css" />

  <script src="/theme.js"></script>
  <script src="/config.js"></script>

  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cdefs/%3E%3Crect width='64' height='64' rx='12' fill='%230f1115'/%3E%3Cpath d='M20 18h24l-6 10 6 10H20l6-10-6-10z' fill='%238ab4ff'/%3E%3C/svg%3E">
  <meta name="theme-color" content="#4AABC2">

  ${jsonLd}
</head>
<body>
  <div class="about-page">
    <header class="about-header">
      <a href="/" class="about-logo">
        <i class="ri-arrow-left-line"></i>
        <span>DualMind Arena</span>
      </a>
      <nav aria-label="Main Navigation" style="display: flex; gap: 1rem; align-items: center;">
        <a href="/" title="DualMind Arena Home">Home</a>
        <a href="/battle/" title="Vote on AI Model Battles">Battle</a>
        <a href="/leaderboard/" title="AI Model Leaderboard">Leaderboard</a>
        <a href="/compare/" title="Compare AI Models Head-to-Head">Compare</a>
        <a href="/models/" title="All AI Models Directory">Models</a>
        <a href="/blog/" title="AI Research & Insights Blog">Blog</a>
      </nav>
      <div class="header-actions">
        <a href="/login-modern.html" class="header-btn" title="Login"><i class="ri-user-line"></i></a>
      </div>
    </header>

    <main class="about-content">
      ${mainContent}
    </main>

    <footer style="margin-top: 4rem; padding-top: 2rem; border-top: 1px solid var(--border); text-align: center; color: var(--text-secondary); font-size: 0.9rem;">
      <p>
        <strong>DualMind Arena</strong> — also known as <strong>DualMindArena</strong> —
        is the internet's human-voted AI model battle platform.
      </p>
      <nav aria-label="Footer Navigation" style="display: flex; gap: 1rem; justify-content: center; margin: 1rem 0;">
        <a href="/about/">About</a>
        <a href="/methodology/">Methodology</a>
        <a href="/blog/">Blog</a>
        <a href="https://dualmindlab.tech" title="DualMind Lab — Official Website">DualMind Lab</a>
      </nav>
      <p>© 2025 DualMind Arena. All rights reserved.</p>
    </footer>
  </div>
</body>
</html>`;
}

// 4. Battle
writeFileSync('battle/index.html', getHtmlTemplate(
  'AI Battle Arena — Vote on AI Model Responses | DualMind Arena',
  'Enter the DualMind Arena and vote head-to-head between AI models. Your vote shapes the global AI leaderboard. Real responses. Real humans. Real rankings.',
  '/battle/',
  `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "DualMind Arena — AI Battle",
  "url": "https://arena.dualmindlab.tech/battle/",
  "applicationCategory": "UtilitiesApplication",
  "description": "Vote on head-to-head AI model battles. Human judgment ranks AI models on DualMind Arena.",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }
}
</script>`,
  `
  <section aria-label="Battle Arena">
    <h1 class="about-title">AI Battle Arena</h1>
    <p class="about-description">Two AI models. One prompt. You decide the winner.</p>

    <div class="battle-container mission-card" role="main">
      <div style="text-align: center; padding: 2rem;">
        <p>Loading Battle Arena...</p>
        <a href="/" class="about-btn" style="margin-top: 1rem; display: inline-flex;">Go to Live Arena</a>
      </div>
    </div>
  </section>

  <section class="post-vote mission-card" aria-label="After Your Vote">
    <p>See how this model ranks globally →
      <a href="/leaderboard/" title="AI Model Leaderboard on DualMind Arena" style="color: var(--color-cyan); font-weight: 500;">View Leaderboard</a>
    </p>
  </section>
  `
));

// 5. Models Directory
writeFileSync('models/index.html', getHtmlTemplate(
  'AI Models Directory — All Ranked Models | DualMind Arena',
  'Browse every AI model tracked and ranked on DualMind Arena. Compare GPT-4, Claude, Gemini, Llama, and more — ranked by real human votes.',
  '/models/',
  '',
  `
  <h1 class="about-title">AI Models on DualMind Arena</h1>
  <p class="about-description">Every model below has been evaluated through live head-to-head battles on <strong>DualMind Arena</strong>. Rankings are determined entirely by human votes — no algorithms, no sponsorships.</p>

  <section aria-label="Model Directory">
    <div class="mission-card model-card">
      <h2><a href="/models/gpt-4o/" title="GPT-4o Performance on DualMind Arena" style="color: var(--color-cyan);">GPT-4o</a></h2>
      <p>Win rate, battle count, top categories</p>
    </div>
    <div class="mission-card model-card">
      <h2><a href="/models/claude-3-5-sonnet/" title="Claude 3.5 Sonnet Performance on DualMind Arena" style="color: var(--color-cyan);">Claude 3.5 Sonnet</a></h2>
      <p>Win rate, battle count, top categories</p>
    </div>
    <div class="mission-card model-card">
      <h2><a href="/models/gemini-1-5-pro/" title="Gemini 1.5 Pro Performance on DualMind Arena" style="color: var(--color-cyan);">Gemini 1.5 Pro</a></h2>
      <p>Win rate, battle count, top categories</p>
    </div>
  </section>
  `
));

// 6. Specific Model Page: GPT-4o
writeFileSync('models/gpt-4o/index.html', getHtmlTemplate(
  'GPT-4o Performance & Rankings | DualMind Arena AI Battles',
  'GPT-4o ranked by real human votes on DualMind Arena. See win rate, battle history, and how GPT-4o compares to Claude, Gemini, and Llama in head-to-head AI battles.',
  '/models/gpt-4o/',
  `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "GPT-4o",
  "description": "GPT-4o is evaluated and ranked through human-voted battles on DualMind Arena.",
  "applicationCategory": "ArtificialIntelligence",
  "url": "https://arena.dualmindlab.tech/models/gpt-4o/"
}
</script>`,
  `
  <h1 class="about-title">GPT-4o Performance & Rankings</h1>
  <div class="mission-card">
    <p>Detailed performance statistics and rankings for <strong>GPT-4o</strong> based on human-voted battles on <a href="/" style="color: var(--color-cyan);">DualMind Arena</a>.</p>

    <h2>Top Comparisons</h2>
    <ul>
      <li><a href="/compare/gpt-4o-vs-claude-3-5-sonnet/" style="color: var(--color-cyan);">GPT-4o vs Claude 3.5 Sonnet</a></li>
      <li><a href="/compare/gpt-4o-vs-gemini-1-5-pro/" style="color: var(--color-cyan);">GPT-4o vs Gemini 1.5 Pro</a></li>
    </ul>
  </div>
  `
));

// 7. Compare Hub
writeFileSync('compare/index.html', getHtmlTemplate(
  'AI Model Comparisons — Head-to-Head Battle Results | DualMind Arena',
  'Human-voted AI model comparisons on DualMind Arena. See real battle results: GPT-4o vs Claude, Gemini vs Llama, and dozens more. Data-driven. Human-judged.',
  '/compare/',
  '',
  `
  <h1 class="about-title">AI Model Comparisons</h1>
  <p class="about-description">Head-to-head battle results based on human votes on DualMind Arena.</p>

  <div class="mission-card">
    <h2>Popular Matchups</h2>
    <ul>
      <li><a href="/compare/gpt-4o-vs-claude-3-5-sonnet/" style="color: var(--color-cyan);">GPT-4o vs Claude 3.5 Sonnet</a></li>
      <li><a href="/compare/gpt-4o-vs-gemini-1-5-pro/" style="color: var(--color-cyan);">GPT-4o vs Gemini 1.5 Pro</a></li>
      <li><a href="/compare/claude-3-5-sonnet-vs-gemini-1-5-pro/" style="color: var(--color-cyan);">Claude 3.5 Sonnet vs Gemini 1.5 Pro</a></li>
    </ul>
  </div>
  `
));

// 8. Specific Compare Page
writeFileSync('compare/gpt-4o-vs-claude-3-5-sonnet/index.html', getHtmlTemplate(
  'GPT-4o vs Claude 3.5 Sonnet — Human-Voted AI Battle | DualMind Arena',
  'GPT-4o vs Claude 3.5 Sonnet: see real battle results voted on by humans on DualMind Arena. Win rates, sample prompts, category breakdowns — no bias, no benchmarks.',
  '/compare/gpt-4o-vs-claude-3-5-sonnet/',
  `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "GPT-4o vs Claude 3.5 Sonnet — DualMind Arena Battle Results",
  "description": "Human-voted comparison of GPT-4o and Claude 3.5 Sonnet across real prompts.",
  "url": "https://arena.dualmindlab.tech/compare/gpt-4o-vs-claude-3-5-sonnet/",
  "publisher": {
    "@type": "Organization",
    "name": "DualMind Arena",
    "url": "https://dualmindlab.tech"
  }
}
</script>`,
  `
  <h1 class="about-title">GPT-4o vs Claude 3.5 Sonnet</h1>
  <p class="about-description">Battle results based on human votes on <a href="/" style="color: var(--color-cyan);">DualMind Arena</a>.</p>

  <section aria-label="Battle Summary" class="mission-card">
    <h2>Overall Win Rate</h2>
    <p>Detailed statistics coming soon.</p>
  </section>

  <section aria-label="Category Breakdown" class="mission-card">
    <h2>Performance by Category</h2>
    <p>Coding, reasoning, creativity, etc.</p>
  </section>

  <section aria-label="Related Comparisons" class="mission-card">
    <h2>More Comparisons</h2>
    <ul>
      <li><a href="/compare/gpt-4o-vs-gemini-1-5-pro/" style="color: var(--color-cyan);">GPT-4o vs Gemini 1.5 Pro</a></li>
      <li><a href="/compare/claude-3-5-sonnet-vs-gemini-1-5-pro/" style="color: var(--color-cyan);">Claude 3.5 Sonnet vs Gemini 1.5 Pro</a></li>
    </ul>
  </section>
  `
));

// 9. Blog Index
writeFileSync('blog/index.html', getHtmlTemplate(
  'AI Model Research & Insights — DualMind Arena Blog',
  'In-depth research on AI model performance, evaluation methodology, and human preference data from DualMind Arena\'s battle platform.',
  '/blog/',
  '',
  `
  <h1 class="about-title">AI Model Research & Insights</h1>
  <p class="about-description">Research, analysis, and insights from the DualMind Arena platform.</p>

  <div class="mission-card">
    <h2>Recent Articles</h2>
    <ul>
      <li><a href="/blog/how-humans-evaluate-ai/" style="color: var(--color-cyan);">How Humans Actually Evaluate AI Models</a></li>
      <li><a href="/blog/gpt-4o-vs-claude-analysis/" style="color: var(--color-cyan);">GPT-4o vs Claude: 10,000 Human Votes Later</a></li>
      <li><a href="/blog/ai-leaderboard-methodology/" style="color: var(--color-cyan);">Why Most AI Benchmarks Are Wrong</a></li>
      <li><a href="/blog/best-ai-model-2025/" style="color: var(--color-cyan);">Best AI Model in 2025 (According to Humans)</a></li>
      <li><a href="/blog/what-is-dualmind-arena/" style="color: var(--color-cyan);">What is DualMind Arena? The Human-Voted AI Battle Platform</a></li>
    </ul>
  </div>
  `
));

// 10. About Page
writeFileSync('about/index.html', getHtmlTemplate(
  'About DualMind Arena — The Human-Voted AI Battle Platform',
  'DualMind Arena (DualMindArena) is a platform where humans vote on AI model responses in blind head-to-head battles, creating the most unbiased AI ranking system.',
  '/about/',
  `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "AboutPage",
  "name": "About DualMind Arena",
  "url": "https://arena.dualmindlab.tech/about/",
  "description": "DualMind Arena is a human-voted AI evaluation platform staging blind head-to-head battles between AI models.",
  "publisher": {
    "@type": "Organization",
    "name": "DualMind Arena",
    "alternateName": "DualMindArena",
    "url": "https://dualmindlab.tech"
  }
}
</script>`,
  `
  <h1 class="about-title">About DualMind Arena</h1>
  <div class="mission-card">
    <p>DualMind Arena is a human-voted AI evaluation platform staging blind head-to-head battles between AI models.</p>
    <p>Read more about our <a href="/methodology/" style="color: var(--color-cyan);">Methodology</a> or see the <a href="/leaderboard/" style="color: var(--color-cyan);">Leaderboard</a>.</p>
  </div>
  `
));

// 11. Methodology Page
writeFileSync('methodology/index.html', getHtmlTemplate(
  'Our Methodology — How DualMind Arena Ranks AI Models',
  'Learn how DualMind Arena evaluates and ranks AI models using blind human voting, Elo scoring, and category-based battle analysis. Transparent. Unbiased. Human-driven.',
  '/methodology/',
  `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "How does DualMind Arena rank AI models?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "DualMind Arena uses blind head-to-head battles where humans vote on which AI response is better. Results are aggregated using an Elo-style scoring system."
      }
    },
    {
      "@type": "Question",
      "name": "Are the AI models anonymous during battles?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. Model identities are hidden during voting to eliminate bias. The voter only sees Response A and Response B."
      }
    },
    {
      "@type": "Question",
      "name": "What is DualMind Arena?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "DualMind Arena (also known as DualMindArena) is a platform where humans evaluate AI models through blind head-to-head response battles, producing human-voted rankings."
      }
    }
  ]
}
</script>`,
  `
  <h1 class="about-title">Our Methodology</h1>
  <div class="mission-card">
    <h2>How DualMind Arena Ranks AI Models</h2>
    <p>DualMind Arena evaluates and ranks AI models using blind human voting, Elo scoring, and category-based battle analysis. Transparent. Unbiased. Human-driven.</p>

    <h3>How does DualMind Arena rank AI models?</h3>
    <p>DualMind Arena uses blind head-to-head battles where humans vote on which AI response is better. Results are aggregated using an Elo-style scoring system.</p>

    <h3>Are the AI models anonymous during battles?</h3>
    <p>Yes. Model identities are hidden during voting to eliminate bias. The voter only sees Response A and Response B.</p>

    <h3>What is DualMind Arena?</h3>
    <p>DualMind Arena (also known as DualMindArena) is a platform where humans evaluate AI models through blind head-to-head response battles, producing human-voted rankings.</p>
  </div>
  `
));

const blogPosts = [
  { slug: 'how-humans-evaluate-ai', title: 'How Humans Actually Evaluate AI Models' },
  { slug: 'gpt-4o-vs-claude-analysis', title: 'GPT-4o vs Claude: 10,000 Human Votes Later' },
  { slug: 'ai-leaderboard-methodology', title: 'Why Most AI Benchmarks Are Wrong' },
  { slug: 'best-ai-model-2025', title: 'Best AI Model in 2025 (According to Humans)' },
  { slug: 'what-is-dualmind-arena', title: 'What is DualMind Arena? The Human-Voted AI Battle Platform' }
];

blogPosts.forEach(post => {
  writeFileSync(`blog/${post.slug}/index.html`, getHtmlTemplate(
    `${post.title} | DualMind Arena`,
    `Read ${post.title} on DualMind Arena. Explore human AI evaluation data and insights.`,
    `/blog/${post.slug}/`,
    `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "${post.title}",
  "description": "Read ${post.title} on DualMind Arena. Explore human AI evaluation data and insights.",
  "url": "https://arena.dualmindlab.tech/blog/${post.slug}/",
  "datePublished": "${new Date().toISOString()}",
  "dateModified": "${new Date().toISOString()}",
  "author": {
    "@type": "Organization",
    "name": "DualMind Arena"
  },
  "publisher": {
    "@type": "Organization",
    "name": "DualMind Arena",
    "logo": {
      "@type": "ImageObject",
      "url": "https://arena.dualmindlab.tech/assets/logo.png"
    }
  }
}
</script>`,
    `
    <article class="mission-card">
      <h1 class="about-title" style="font-size: 2rem;">${post.title}</h1>
      <p style="color: var(--text-secondary); margin-bottom: 2rem;">Published on ${new Date().toLocaleDateString()}</p>

      <div class="article-content">
        <p>Full article content coming soon...</p>
        <p>Return to <a href="/blog/" style="color: var(--color-cyan);">Blog Index</a></p>
      </div>
    </article>
    `
  ));
});

console.log('All files generated successfully.');