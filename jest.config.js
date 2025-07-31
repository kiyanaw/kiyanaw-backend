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
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  collectCoverageFrom: [
    'src/**/*.(ts|tsx)',
    '!src/**/*.d.ts',
    '!src/**/*.(test|spec).(ts|tsx)',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/amplify/backend/(?!function/)',
    '/amplify/#current-cloud-backend/',
    '/amplify/cli.json',
    '/amplify/hooks/',
  ],
}; 