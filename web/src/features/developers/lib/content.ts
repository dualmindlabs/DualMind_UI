/** The copy of the API reference that is not in the OpenAPI document. */

export const DEVELOPERS_PATH = '/developers/';
export const OPENAPI_URL_PATH = '/api/v2/openapi.json';
export const DEV_DOCS_URL = 'https://dev-doc.dualmindlab.tech';

export const developersPage = {
  title: 'API reference · DualMind Arena',
  description:
    'The DualMind Arena API v2: the public leaderboard as JSON and Markdown, the OpenAPI 3.1 document, error types, rate limits and the versioning policy.',
  eyebrow: 'API reference',
  heading: { text: 'The Arena API,', human: 'in the open.' },
  intro:
    'Read the leaderboard as JSON or Markdown, or fetch the OpenAPI document and generate a client. Everything here is generated from the same file the API is tested against, so it cannot drift from what the API does.',
} as const;

export const conventions: readonly string[] = [
  'JSON in and out, camelCase field names, times in ISO 8601 UTC.',
  'Every response carries an `X-Request-Id` header. Send your own (8 to 128 characters of letters, digits and `._:-`) to trace a call; an error repeats it as `requestId`.',
  'Errors are always `application/problem+json` (RFC 9457), also for unknown paths (404) and wrong methods (405, with `Allow`).',
  'Public routes need no key or sign-in. Routes that act for a user need `Authorization: Bearer <access token>`.',
  'Bodies must be `application/json` and at most 1 MiB. There is no CORS: call the API from a server, not from another site’s browser code.',
  'Reads can be cached: send `If-None-Match` with the last `ETag` and a `304` costs almost nothing.',
];

export interface Snippet {
  id: string;
  label: string;
  language: string;
  code: string;
}

export const quickstart: readonly Snippet[] = [
  {
    id: 'curl',
    label: 'curl',
    language: 'bash',
    code: 'curl -s https://arena.dualmindlab.tech/api/v2/leaderboard | jq \'.items[0]\'',
  },
  {
    id: 'javascript',
    label: 'JavaScript',
    language: 'javascript',
    code: `const response = await fetch('https://arena.dualmindlab.tech/api/v2/leaderboard');
if (!response.ok) throw new Error(\`Request failed: \${response.status}\`);
const { items, meta } = await response.json();
console.log(items[0].displayName, meta.generatedAt);`,
  },
  {
    id: 'python',
    label: 'Python',
    language: 'python',
    code: `import requests

response = requests.get('https://arena.dualmindlab.tech/api/v2/leaderboard', timeout=10)
response.raise_for_status()
board = response.json()
print(board['items'][0]['displayName'], board['meta']['generatedAt'])`,
  },
];

export interface RateLimitRow {
  group: string;
  appliesTo: string;
  limit: string;
}

/** Mirrors RATE_LIMIT_GROUPS in server/rate-limit.js (a unit test keeps them equal). */
export const rateLimits: readonly RateLimitRow[] = [
  { group: 'read', appliesTo: 'every GET and HEAD under /api/', limit: '30 per 10 seconds' },
  { group: 'write', appliesTo: 'other POST, PATCH, PUT and DELETE calls', limit: '30 per 60 seconds' },
  { group: 'battle', appliesTo: 'starting a battle or chat', limit: '6 per 60 seconds' },
  { group: 'vote', appliesTo: 'voting', limit: '10 per 10 seconds' },
  { group: 'speech', appliesTo: 'text to speech', limit: '10 per 60 seconds' },
];

export const rateLimitNote =
  'Limits count per signed-in user, or per client address when there is no token. Over the limit the API answers 429 with a `rate_limited` problem, `Retry-After` (seconds to wait) and `RateLimit-Policy` headers. Wait, then retry. The health check is not limited.';

export const versioningParagraphs: readonly string[] = [
  'The version is in the path: this is `/api/v2`. Within a version the API only changes additively: new routes, new optional fields, new problem types and new values where the schema says a value can grow. Clients should ignore fields they do not know.',
  'A breaking change ships as `/api/v3`; `/api/v2` keeps working next to it. A route that is going away is marked deprecated in the OpenAPI document and the changelog before it is removed.',
  'The document’s `info.version` is the API version. It gains a minor number with every additive release.',
];

export const moreLinks: readonly { label: string; href: string; note: string }[] = [
  { label: 'OpenAPI 3.1 document', href: OPENAPI_URL_PATH, note: 'for Postman, Scalar, Redoc or openapi-typescript' },
  { label: 'Leaderboard as Markdown', href: '/leaderboard.md', note: 'one table, for people and for language models' },
  { label: 'llms.txt', href: '/llms.txt', note: 'the index of the above for LLM tools' },
  { label: 'Developer docs', href: DEV_DOCS_URL, note: 'guides and the v1 API reference' },
];
