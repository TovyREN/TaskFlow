const nextJest = require('next/jest');

const createJestConfig = nextJest({ dir: './' });

const config = {
  // Fixed the typo here: removed the '>'
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'], 
  testEnvironment: 'jest-environment-jsdom',
  collectCoverage: true,
  collectCoverageFrom: [
    'components/**/*.{ts,tsx}', 
    '!app/actions/**',           // Exclude the database logic
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