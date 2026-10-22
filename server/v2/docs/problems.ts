// /problems/ and /problems/<slug> (BE-5 design): one short Markdown page per problem type, from
// the registry in server/problem-types.js, so the docs cannot drift from the behaviour. Pure.

import { PROBLEM_TYPES } from '../../problem-types.js';
import { isProblemSlug, type ProblemSlug } from '../problems.ts';

/** The first letter capitalised; the registry's `usedFor` texts start lower case. */
function sentence(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function renderProblemPage(slug: ProblemSlug, origin: string): string {
  const entry = PROBLEM_TYPES[slug]!;
  return [
    `# ${slug} (HTTP ${entry.status})`,
    '',
    `${entry.title}. ${sentence(entry.usedFor)}.`,
    '',
    `What to do: ${entry.help}`,
    '',
    `See: [API reference](${origin}/developers/#problems)`,
    '',
  ].join('\n');
}

export function renderProblemIndex(origin: string): string {
  return [
    '# Problem types',
    '',
    'Every error under `/api/v2` is `application/problem+json` (RFC 9457). The `type` of an error is one of these identifiers.',
    '',
    ...Object.entries(PROBLEM_TYPES).map(([slug, entry]) => `- [${slug}](${origin}/problems/${slug}) (HTTP ${entry.status}): ${entry.title}`),
    '',
    `See: [API reference](${origin}/developers/#problems)`,
    '',
  ].join('\n');
}

/** The slug of `/problems/<slug>` (no trailing slash), or null when it is not a known type. */
export function problemSlugFromPath(pathname: string): ProblemSlug | null {
  const slug = /^\/problems\/([a-z_]+)$/.exec(pathname)?.[1];
  return slug !== undefined && isProblemSlug(slug) ? slug : null;
}
