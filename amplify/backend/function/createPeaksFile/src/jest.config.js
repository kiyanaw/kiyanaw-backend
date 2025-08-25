module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '**/test/test-*.(js|ts)',
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
};
