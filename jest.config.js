export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
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
      types: ['@testing-library/jest-dom'],
    },
    }],
  },
  testMatch: [
    '<rootDir>/src/**/*.(test|spec).(ts|tsx)',
    '<rootDir>/amplify/backend/function/**/src/**/*.(test|spec).(js|ts)',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  collectCoverageFrom: [
    'src/**/*.(ts|tsx)',
    'amplify/backend/function/**/src/**/*.(js|ts)',
    '!src/**/*.d.ts',
    '!src/**/*.(test|spec).(ts|tsx)',
    '!amplify/backend/function/**/src/**/*.(test|spec).(js|ts)',
    '!amplify/backend/function/**/src/**/node_modules/**',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/amplify/backend/(?!function/)',
    '/amplify/#current-cloud-backend/',
    '/amplify/cli.json',
    '/amplify/hooks/',
  ],
}; 