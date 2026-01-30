/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/__tests__/setup/env.setup.js'],
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup/afterEnv.js'],
  globalSetup: '<rootDir>/__tests__/setup/globalSetup.js',
  globalTeardown: '<rootDir>/__tests__/setup/globalTeardown.js',
  collectCoverage: true,
  collectCoverageFrom: [
    'modules/**/*.js',
    '!modules/**/index.js',
    '!modules/**/routes.js',
    '!modules/**/routes/**/*.js',
    '!modules/**/webhook*.js',
    'utils/**/*.js',
    '!**/node_modules/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  coverageThreshold: {
    global: {
      branches: 3,
      functions: 2,
      lines: 25,
      statements: 25,
    },
  },
  testMatch: ['**/__tests__/**/*.(test|spec).js'],
  moduleNameMapper: {
    '^bullmq$': '<rootDir>/__mocks__/bullmq.js',
    '^nodemailer$': '<rootDir>/__mocks__/nodemailer.js',
    '^redis$': '<rootDir>/__mocks__/redis.js',
  },
};
