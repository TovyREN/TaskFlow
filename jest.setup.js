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
  prisma: {
    user: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    workspace: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    workspaceMember: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), updateMany: jest.fn(), deleteMany: jest.fn() },
    workspaceInvitation: { findFirst: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    board: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    boardLabel: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    taskList: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
    task: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    taskAssignee: { create: jest.fn(), deleteMany: jest.fn() },
    taskLabel: { create: jest.fn(), deleteMany: jest.fn() },
    checklist: { findUnique: jest.fn(), create: jest.fn(), delete: jest.fn() },
    checklistItem: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    comment: { findUnique: jest.fn(), create: jest.fn(), delete: jest.fn() },
    notification: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), count: jest.fn(), updateMany: jest.fn() },
    $transaction: jest.fn((fns) => Promise.all(fns)),
  },
}), { virtual: true });

// Global mock for socket emission helpers
jest.mock('./lib/socket', () => ({
  __esModule: true,
  emitSocketEvent: jest.fn(),
  emitToWorkspace: jest.fn(),
  emitToBoard: jest.fn(),
  emitToUser: jest.fn(),
}), { virtual: true });

// Global mock for password utilities
jest.mock('./lib/password', () => ({
  __esModule: true,
  hashPassword: jest.fn().mockResolvedValue('$2b$10$hashedvalue'),
  verifyPassword: jest.fn().mockResolvedValue(true),
}), { virtual: true });
