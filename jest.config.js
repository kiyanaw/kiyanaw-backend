export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
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
    '/amplify/',
  ],
}; 