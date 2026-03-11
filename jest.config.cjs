const nextJest = require('next/jest');

const createJestConfig = nextJest({ dir: './' });

const config = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'], 
  testEnvironment: 'jest-environment-jsdom',
  // Add this section to resolve the @/ alias
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverage: true,
  collectCoverageFrom: [
    'components/**/*.{ts,tsx}',
    'app/**/*.{ts,tsx}',
    '!app/layout.tsx',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    global: {
      statements: 90,
      branches: 90,
      functions: 90,
      lines: 90,
    },
  },
};

module.exports = createJestConfig(config);