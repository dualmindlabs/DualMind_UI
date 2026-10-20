// ESLint flat config (ESLint 9+ no longer reads .eslintrc.*).
// Same rules as the old .eslintrc.json: eslint:recommended plus the overrides below.
import js from '@eslint/js';
import globals from 'globals';

export default [
  // web/ is the React app with its own ESLint config (web/eslint.config.js); dist/ is build output.
  { ignores: ['web/**', 'dist/**'] },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        AOS: 'readonly',
        Razorpay: 'readonly',
        DualMindAuth: 'readonly',
        DUALMIND_CONFIG: 'readonly',
        supabase: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-console': 'off',
      'no-undef': 'warn',
      semi: ['error', 'always'],
      quotes: ['error', 'single', { avoidEscape: true }],
      'no-constant-condition': 'warn',
      // New in ESLint 10's recommended set. Here it only flags default values
      // like `let x = ''` that every branch overwrites, so report, don't fail.
      'no-useless-assignment': 'warn',
    },
  },
];
