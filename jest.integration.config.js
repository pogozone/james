module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/integration'],
  testMatch: ['**/*.test.js'],
  testTimeout: 15000,
  setupFilesAfterEnv: ['<rootDir>/tests/integration/setup.js'],
};
