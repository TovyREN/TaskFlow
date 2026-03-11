import '@testing-library/jest-dom';

// Global mock for Google
global.google = {
  accounts: {
    id: { initialize: jest.fn(), renderButton: jest.fn() },
  },
};

// Global mock for Prisma so it never tries to connect to a real DB
jest.mock('./lib/prisma', () => ({
  __esModule: true,
  default: {
    user: { findUnique: jest.fn(), create: jest.fn() },
    task: { findMany: jest.fn(), create: jest.fn() },
  },
}), { virtual: true });