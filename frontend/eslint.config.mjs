import { defineConfig, globalIgnores } from 'eslint/config';
import stylistic from '@stylistic/eslint-plugin';
import tseslint from 'typescript-eslint';

const eslintConfig = defineConfig([
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    plugins: {
      '@stylistic': stylistic,
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      '@stylistic/indent': ['error', 2],
      '@stylistic/quotes': ['error', 'single'],

      // Curly brace spacing
      '@stylistic/object-curly-spacing': ['error', 'always'],
      '@stylistic/jsx-curly-spacing': ['error', { when: 'always', children: true }],
      '@stylistic/block-spacing': ['error', 'always'],

      // JSX multiline formatting
      '@stylistic/jsx-max-props-per-line': ['error', { maximum: 1, when: 'multiline' }],
      '@stylistic/jsx-first-prop-new-line': ['error', 'multiline'],
      '@stylistic/jsx-closing-bracket-location': ['error', 'line-aligned'],
    },
  },
  globalIgnores([
    '.output/**',
    '.wxt/**',
    'node_modules/**',
  ]),
]);

export default eslintConfig;
