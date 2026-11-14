import js from '@eslint/js'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import sonarjs from 'eslint-plugin-sonarjs'
import globals from 'globals'
import tseslint from 'typescript-eslint'

// Límites del criterio de aceptación (CLAUDE.md, puntos 3 y 4)
const LIMITS = {
  complexity: 6,
  cognitiveComplexity: 8,
  maxDepth: 2,
  maxParams: 3,
  maxLinesPerFile: 150,
  maxLinesPerFunction: 60,
}

const SIZE_OPTIONS = { skipBlankLines: true, skipComments: true }

const qualityRules = {
  complexity: ['error', LIMITS.complexity],
  'sonarjs/cognitive-complexity': ['error', LIMITS.cognitiveComplexity],
  'max-depth': ['error', LIMITS.maxDepth],
  'max-params': ['error', LIMITS.maxParams],
  'max-lines': ['error', { max: LIMITS.maxLinesPerFile, ...SIZE_OPTIONS }],
  'max-lines-per-function': ['error', { max: LIMITS.maxLinesPerFunction, ...SIZE_OPTIONS }],
  'no-magic-numbers': 'off',
  '@typescript-eslint/no-magic-numbers': [
    'error',
    { ignore: [-1, 0, 1, 2], ignoreArrayIndexes: true, ignoreDefaultValues: true, ignoreEnums: true, ignoreTypeIndexes: true },
  ],
}

// Los componentes y la app no conocen Supabase: dependen de repositorios inyectados
const noSupabaseInUi = {
  'no-restricted-imports': [
    'error',
    {
      patterns: [
        { group: ['@supabase/*'], message: 'Usa un repositorio de features/<feature>/api.' },
        { group: ['**/lib/supabase', '**/shared/api/supabase*'], message: 'Usa un repositorio de features/<feature>/api.' },
      ],
    },
  ],
}

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules', 'supabase', 'database', 'src/shared/api/database.types.ts'] },

  // Código nuevo en TypeScript: reglas estrictas con tipos
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.strictTypeChecked, ...tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh, sonarjs },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['error', { allowConstantExport: true }],
      ...qualityRules,
    },
  },
  {
    files: ['src/features/*/ui/**/*.{ts,tsx}', 'src/app/**/*.{ts,tsx}'],
    rules: noSupabaseInUi,
  },
  {
    files: ['src/**/*.test.{ts,tsx}', 'src/test/**/*.{ts,tsx}'],
    rules: {
      'max-lines': 'off',
      'max-lines-per-function': 'off',
      '@typescript-eslint/no-magic-numbers': 'off',
    },
  },

  // Código legado en JS (se migra en 0.3–0.6): solo la base, sin las reglas estrictas
  {
    files: ['src/**/*.{js,jsx}'],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { react, 'react-hooks': reactHooks },
    rules: { ...reactHooks.configs.recommended.rules, 'react/jsx-uses-vars': 'error' },
  },

  // Scripts de Node y configuración
  {
    files: ['scripts/**/*.js', '*.config.js'],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['vite.config.ts'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { globals: globals.node },
  },
)
