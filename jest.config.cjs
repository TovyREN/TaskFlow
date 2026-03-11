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
    '!app/actions/**',           
    '!app/layout.tsx',           
    '!app/page.tsx',             
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    global: {
      statements: 95,
      branches: 95,
      functions: 95,
      lines: 95,
    },
  },
};

module.exports = createJestConfig(config);