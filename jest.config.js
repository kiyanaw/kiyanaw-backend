export default {
  projects: [
    // Main React/TypeScript tests
    {
      displayName: 'Main App',
      preset: 'ts-jest',
      testEnvironment: 'jsdom',
      setupFiles: ['<rootDir>/src/setupTestGlobals.ts'],
      setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        '^../aws-exports.js$': '<rootDir>/src/__mocks__/aws-exports-mock.js',
        '^../graphql/queries.js$': '<rootDir>/src/graphql/queries.js',
        '^../graphql/mutations.js$': '<rootDir>/src/graphql/mutations.js',
      },
      transformIgnorePatterns: [
        'node_modules/(?!(@aws-amplify|aws-amplify)/)',
      ],
      transform: {
        '^.+\\.(t|j)sx?$': ['ts-jest', {
          tsconfig: {
            jsx: 'react-jsx',
            esModuleInterop: true,
            allowSyntheticDefaultImports: true,
            allowJs: true,
            target: 'ES2020',
            lib: ['ES2020', 'DOM', 'DOM.Iterable'],
            types: ['@testing-library/jest-dom'],
          },
        }],
      },
      testMatch: [
        '<rootDir>/src/**/*.(test|spec).(ts|tsx)',
      ],
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
      collectCoverageFrom: [
        'src/**/*.(ts|tsx)',
        '!src/**/*.d.ts',
        '!src/**/*.(test|spec).(ts|tsx)',
      ],
      testPathIgnorePatterns: [
        '/node_modules/',
        '/amplify/',
      ],
    },
    // Lambda function tests - inviteHandler
    {
      displayName: 'Lambda Functions',
      testEnvironment: 'node',
      rootDir: 'amplify/backend/function/inviteHandler/src',
      testMatch: [
        '<rootDir>/actions/**/*.(test|spec).(js|ts)',
      ],
      collectCoverageFrom: [
        'actions/**/*.(js|ts)',
        '!actions/**/*.(test|spec).(js|ts)',
      ],
      testPathIgnorePatterns: [
        '/node_modules/',
      ],
    },
    // Lambda function tests - indexRegionData
    {
      displayName: 'Lambda Functions - IndexRegionData',
      testEnvironment: 'node',
      rootDir: 'amplify/backend/function/indexRegionData/src',
      testMatch: [
        '<rootDir>/test/test-*.(js|ts)',
      ],
      collectCoverageFrom: [
        'lib/**/*.(js|ts)',
        'index.js',
        '!test/**/*.(js|ts)',
      ],
      testPathIgnorePatterns: [
        '/node_modules/',
      ],
    },
    // Lambda function tests - onTranscriptionChange
    {
      displayName: 'Lambda Functions - OnTranscriptionChange',
      testEnvironment: 'node',
      rootDir: 'amplify/backend/function/onTranscriptionChange/src',
      testMatch: [
        '<rootDir>/test/test-*.(js|ts)',
      ],
      collectCoverageFrom: [
        'lib/**/*.(js|ts)',
        'index.js',
        '!test/**/*.(js|ts)',
      ],
      testPathIgnorePatterns: [
        '/node_modules/',
      ],
    },
    // Lambda function tests - createPeaksFile
    {
      displayName: 'Lambda Functions - CreatePeaksFile',
      testEnvironment: 'node',
      rootDir: 'amplify/backend/function/createPeaksFile/src',
      testMatch: [
        '<rootDir>/test/test-*.(js|ts)',
      ],
      collectCoverageFrom: [
        'lib/**/*.(js|ts)',
        'index.js',
        'utils.js',
        '!test/**/*.(js|ts)',
      ],
      testPathIgnorePatterns: [
        '/node_modules/',
      ],
    },
    // Lambda function tests - processMedia
    {
      displayName: 'Lambda Functions - ProcessMedia',
      testEnvironment: 'node',
      rootDir: 'amplify/backend/function/processMedia/src',
      testMatch: [
        '<rootDir>/test/test-*.(js|ts)',
      ],
      collectCoverageFrom: [
        'lib/**/*.(js|ts)',
        'index.js',
        'utils.js',
        '!test/**/*.(js|ts)',
      ],
      testPathIgnorePatterns: [
        '/node_modules/',
      ],
    },
    // Amplify hooks tests
    {
      displayName: 'Amplify Hooks',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/amplify/hooks/**/*.test.js',
      ],
      transform: {
        '^.+\\.js$': ['ts-jest', {
          tsconfig: {
            esModuleInterop: true,
            allowSyntheticDefaultImports: true,
            allowJs: true,
            target: 'ES2020',
          },
        }],
      },
      testPathIgnorePatterns: [
        '/node_modules/',
      ],
    },
  ],
}; 
