// ESLint flat config for the web app. The repo root has its own config for the legacy files and
// ignores web/. Type-aware typescript-eslint, React hooks, jsx-a11y, sorted imports, and the
// structure rules from docs/architecture.md (feature boundaries, named exports, no raw HTML).
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const noRawHtml = {
  selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
  message:
    'dangerouslySetInnerHTML is not allowed. Render text as React children, or use the sanitised Markdown renderer.',
};

const noDefaultExport = {
  selector: 'ExportDefaultDeclaration',
  message:
    'Use named exports. Only route modules (src/app/routes, src/app/root.tsx, src/app/routes.ts) export a default.',
};

export default defineConfig(
  {
    ignores: [
      'build/',
      '.react-router/',
      'node_modules/',
      'playwright-report/',
      'test-results/',
      'screenshots/',
      'tests/.tmp/',
    ],
  },
  js.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: { 'simple-import-sort': simpleImportSort },
    rules: {
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // Plain JS files (this config, the e2e server script) are not part of the TS project.
    files: ['**/*.{js,mjs}'],
    extends: [tseslint.configs.disableTypeChecked],
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended],
  },
  {
    files: ['src/**/*.tsx'],
    extends: [jsxA11y.flatConfigs.recommended],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': ['error', noRawHtml, noDefaultExport],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@/components/ui',
              message: 'components/ui has no barrel: import each primitive from its own file.',
            },
          ],
          patterns: [
            {
              group: ['@/features/*/*'],
              message:
                'Import a feature through its public API (@/features/<name>), not its internals.',
            },
            {
              group: ['../../*'],
              message: 'Use the @/ alias for anything outside the current folder or its parent.',
            },
          ],
        },
      ],
    },
  },
  {
    // Route modules and the React Router app entry are the only default exports.
    files: ['src/app/routes/**/*.tsx', 'src/app/root.tsx', 'src/app/routes.ts'],
    rules: { 'no-restricted-syntax': ['error', noRawHtml] },
  },
  {
    // A fixed, build-time string (no user data) that sets the theme before the first paint.
    files: ['src/components/layout/theme-script.tsx'],
    rules: { 'no-restricted-syntax': ['error', noDefaultExport] },
  },
);
