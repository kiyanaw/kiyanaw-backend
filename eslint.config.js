import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { 
    ignores: [
      'dist',
      'coverage/**',
      'src/aws-exports.js',
      'src/models/index.d.ts',
      'src/models/models',
      'src/graphql/*', 
      '**/*.test.*',
      '**/__mocks__/**',
      'src/ui-components/studioTheme.js.d.ts',
      'src/ui-components/studioTheme.js', 
      'src/ui-components/utils.js',
      'src/ui-components/*.jsx',
      'amplify/#current-cloud-backend/**',
      'amplify/backend/custom/regionChangeSQS/build/**',
      'amplify/backend/custom/inviteHandlerSES/cdk-stack.ts',
      'amplify-codegen-temp/models/models',
    ] 
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
)
