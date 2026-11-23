// Public API of the compare feature: the `/compare/` page (run a compare, signed in) and
// `/compare/<shareId>` (read a stored result), both behind the backend's compare flag.
export { ComparePage } from './components/compare-page';
export const COMPARE_SEO = {
  title: 'Compare two AI models side by side · DualMind Arena',
  description:
    'Pick two models, ask once and read both answers with their names. Results are private unless you share them.',
  path: '/compare/',
  robots: 'noindex, nofollow',
} as const;
