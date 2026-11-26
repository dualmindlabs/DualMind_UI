// /llms.txt (BE-5 design): an index of the machine-readable entry points, in the llms.txt
// convention. The origin comes from the request, so previews list their own links. Pure.

export function renderLlmsTxt(origin: string): string {
  return [
    '# DualMind Arena',
    '',
    '> DualMind Arena is a blind, side-by-side comparison of AI models: users vote, and a leaderboard shows an Elo rating for each model (ratings under audit).',
    '',
    '## Data',
    '',
    `- [Leaderboard (Markdown)](${origin}/leaderboard.md): current ranking, one table`,
    `- [Leaderboard (JSON)](${origin}/api/v2/leaderboard): same data with typed fields`,
    `- [Data licence](${origin}/data/): CC BY 4.0 for the leaderboard numbers; model answers stay under each provider's terms and are for analysis and evaluation only`,
    `- [Methodology](${origin}/methodology/): how the ratings are computed`,
    '',
    '## API',
    '',
    `- [OpenAPI 3.1 document](${origin}/api/v2/openapi.json): machine-readable description of the v2 API`,
    `- [API reference](${origin}/developers/): human documentation`,
    `- [Error types](${origin}/problems/): what each problem type means`,
    '',
    '## Optional',
    '',
    '- [Developer docs](https://dev-doc.dualmindlab.tech/llms.txt): guides and the v1 API reference',
    '- [Source code](https://github.com/dualmindlabs/DualMind_UI)',
    '',
  ].join('\n');
}
