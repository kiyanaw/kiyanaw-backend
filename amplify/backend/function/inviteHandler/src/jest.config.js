module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '**/actions/**/*.(test|spec).(js|ts)',
  ],
  collectCoverageFrom: [
    'actions/**/*.(js|ts)',
    '!actions/**/*.(test|spec).(js|ts)',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
  ],
}; 