// @ts-check
import eslint from '@eslint/js'
import { flatConfigs } from 'eslint-plugin-import'
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'
import globals from 'globals'
// eslint-disable-next-line import/no-unresolved
import tseslint from 'typescript-eslint'

export default [
  {
    ignores: ['docs', 'build', 'out', 'index.d.ts', '__test__', 'dist', '**/node_modules/**', 'node_modules'],
  },
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  flatConfigs.recommended,
  eslintPluginPrettierRecommended,
  {
    settings: {
      'import/parsers': {
        '@typescript-eslint/parser': ['.ts', '.tsx'],
      },
      'import/resolver': {
        node: {
          extensions: ['.ts', '.js', '.d.ts', '.mjs', '.cjs'],
        },
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      'import/no-deprecated': 2,
      'import/no-unresolved': 2,
      'import/prefer-default-export': 'off',
      'import/no-extraneous-dependencies': 'off',
      'import/no-useless-path-segments': 1,
      'import/order': [
        'error',
        {
          alphabetize: {
            caseInsensitive: false,
            order: 'asc',
          },
          groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index'], 'type'],
          'newlines-between': 'always',
          distinctGroup: false,
          pathGroups: [
            {
              group: 'external',
              pattern: 'node_modules',
              position: 'before',
            },
            {
              group: 'external',
              pattern: '@foxford/**',
              position: 'after',
            },
            {
              group: 'internal',
              pattern: '@@foxford/*',
              position: 'before',
            },
            {
              group: 'internal',
              pattern: 'services/**',
              position: 'before',
            },
            {
              group: 'internal',
              pattern: 'modules/**',
              position: 'before',
            },
          ],
          pathGroupsExcludedImportTypes: ['type'],
        },
      ],
    },
  },
]
