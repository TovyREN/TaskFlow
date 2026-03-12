import { prisma } from '@/lib/prisma';
import { hashPassword, verifyPassword } from '@/lib/password';
import { loginUser, registerUser, loginWithGoogle } from '@/app/actions/authActions';

const mockVerifyIdToken = jest.fn();
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: mockVerifyIdToken,
  })),
}));

const mockPrismaUser = prisma.user as unknown as {
  findUnique: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
};

const mockHashPassword = hashPassword as jest.Mock;
const mockVerifyPassword = verifyPassword as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
  mockHashPassword.mockResolvedValue('$2b$10$hashedvalue');
  mockVerifyPassword.mockResolvedValue(true);
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ─── loginUser ───────────────────────────────────────────────────────

describe('loginUser', () => {
  it('returns error when user not found', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(null);

    const result = await loginUser('notfound@example.com', 'password');

    expect(result).toEqual({ success: false, error: 'User not found' });
  });

  it('returns error when password required but not provided', async () => {
    mockPrismaUser.findUnique.mockResolvedValue({
      id: '1',
      email: 'user@example.com',
      name: 'User',
      password: 'plaintext',
    });

    const result = await loginUser('user@example.com');

    expect(result).toEqual({ success: false, error: 'Password required' });
  });

  it('handles legacy plaintext password match and re-hashes', async () => {
    mockPrismaUser.findUnique.mockResolvedValue({
      id: '1',
      email: 'user@example.com',
      name: 'User',
      password: 'plaintext',
    });

    const result = await loginUser('user@example.com', 'plaintext');

    expect(mockHashPassword).toHaveBeenCalledWith('plaintext');
    expect(mockPrismaUser.update).toHaveBeenCalledWith({
      where: { id: '1' },
      data: { password: '$2b$10$hashedvalue' },
    });
    expect(result.success).toBe(true);
    expect(result.user).toMatchObject({
      id: '1',
      email: 'user@example.com',
      name: 'User',
    });
  });

  it('returns error on legacy plaintext mismatch', async () => {
    mockPrismaUser.findUnique.mockResolvedValue({
      id: '1',
      email: 'user@example.com',
      name: 'User',
      password: 'plaintext',
    });

    const result = await loginUser('user@example.com', 'wrong');

    expect(result).toEqual({ success: false, error: 'Invalid password' });
  });

  it('verifies bcrypt hashed password successfully', async () => {
    mockPrismaUser.findUnique.mockResolvedValue({
      id: '1',
      email: 'user@example.com',
      name: 'User',
      password: '$2b$10$somehash',
    });

    const result = await loginUser('user@example.com', 'password');

    expect(mockVerifyPassword).toHaveBeenCalledWith('password', '$2b$10$somehash');
    expect(result.success).toBe(true);
    expect(result.user).toMatchObject({
      id: '1',
      email: 'user@example.com',
      name: 'User',
    });
  });

  it('returns error on bcrypt verification failure', async () => {
    mockPrismaUser.findUnique.mockResolvedValue({
      id: '1',
      email: 'user@example.com',
      name: 'User',
      password: '$2b$10$somehash',
    });
    mockVerifyPassword.mockResolvedValue(false);

    const result = await loginUser('user@example.com', 'wrong');

    expect(result).toEqual({ success: false, error: 'Invalid password' });
  });

  it('returns success with user data for user without password (google-only user)', async () => {
    mockPrismaUser.findUnique.mockResolvedValue({
      id: '1',
      email: 'google@example.com',
      name: 'Google User',
      password: null,
    });

    const result = await loginUser('google@example.com');

    expect(result.success).toBe(true);
    expect(result.user).toMatchObject({
      id: '1',
      email: 'google@example.com',
      name: 'Google User',
    });
  });

  it('returns "Authentication failed" on database error', async () => {
    mockPrismaUser.findUnique.mockRejectedValue(new Error('DB error'));

    const result = await loginUser('user@example.com', 'password');

    expect(result).toEqual({ success: false, error: 'Authentication failed' });
  });

  it('falls back to email prefix when user.name is null', async () => {
    mockPrismaUser.findUnique.mockResolvedValue({
      id: '1',
      email: 'user@example.com',
      name: null,
      password: null,
    });

    const result = await loginUser('user@example.com');

    expect(result.success).toBe(true);
    expect(result.user.name).toBe('user');
    expect(result.user.avatar).toContain('User');
  });
});

// ─── registerUser ────────────────────────────────────────────────────

describe('registerUser', () => {
  it('registers new user successfully', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(null);
    mockPrismaUser.create.mockResolvedValue({
      id: '2',
      email: 'new@example.com',
      name: 'New User',
    });

    const result = await registerUser('New User', 'new@example.com', 'password123');

    expect(mockHashPassword).toHaveBeenCalledWith('password123');
    expect(mockPrismaUser.create).toHaveBeenCalledWith({
      data: { name: 'New User', email: 'new@example.com', password: '$2b$10$hashedvalue' },
    });
    expect(result.success).toBe(true);
    expect(result.user).toMatchObject({
      id: '2',
      email: 'new@example.com',
      name: 'New User',
    });
  });

  it('returns error when email already registered', async () => {
    mockPrismaUser.findUnique.mockResolvedValue({
      id: '1',
      email: 'existing@example.com',
    });

    const result = await registerUser('User', 'existing@example.com', 'password');

    expect(result).toEqual({ success: false, error: 'Email already registered' });
  });

  it('returns "Registration failed" on database error', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(null);
    mockPrismaUser.create.mockRejectedValue(new Error('DB error'));

    const result = await registerUser('User', 'fail@example.com', 'password');

    expect(result).toEqual({ success: false, error: 'Registration failed' });
  });

  it('falls back to name param when user.name is null', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(null);
    mockPrismaUser.create.mockResolvedValue({
      id: '2',
      email: 'new@example.com',
      name: null,
    });

    const result = await registerUser('Fallback Name', 'new@example.com', 'password123');

    expect(result.success).toBe(true);
    expect(result.user.name).toBe('Fallback Name');
    expect(result.user.avatar).toContain('User');
  });
});

// ─── loginWithGoogle ─────────────────────────────────────────────────

describe('loginWithGoogle', () => {
  const googlePayload = {
    sub: 'google-123',
    email: 'google@example.com',
    name: 'Google User',
    picture: 'https://photo.url/pic.jpg',
  };

  it('logs in existing user by googleId', async () => {
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => googlePayload,
    });
    mockPrismaUser.findUnique.mockResolvedValueOnce({
      id: '1',
      email: 'google@example.com',
      name: 'Google User',
      googleId: 'google-123',
      googleImage: 'https://photo.url/pic.jpg',
    });

    const result = await loginWithGoogle('fake-token');

    expect(result.success).toBe(true);
    expect(result.user).toMatchObject({
      id: '1',
      email: 'google@example.com',
      name: 'Google User',
      avatar: 'https://photo.url/pic.jpg',
    });
  });

  it('links google to existing user found by email', async () => {
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => googlePayload,
    });
    // First findUnique (by googleId) returns null
    mockPrismaUser.findUnique.mockResolvedValueOnce(null);
    // Second findUnique (by email) returns user
    mockPrismaUser.findUnique.mockResolvedValueOnce({
      id: '2',
      email: 'google@example.com',
      name: 'Existing User',
      googleId: null,
      googleImage: null,
    });
    // update returns updated user (not used directly, but the function re-uses the variable)
    mockPrismaUser.update.mockResolvedValue({});

    const result = await loginWithGoogle('fake-token');

    expect(mockPrismaUser.update).toHaveBeenCalledWith({
      where: { id: '2' },
      data: { googleId: 'google-123', googleImage: 'https://photo.url/pic.jpg' },
    });
    expect(result.success).toBe(true);
    expect(result.user).toMatchObject({
      id: '2',
      email: 'google@example.com',
      name: 'Existing User',
    });
  });

  it('creates new user when not found', async () => {
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => googlePayload,
    });
    // Both findUnique calls return null
    mockPrismaUser.findUnique.mockResolvedValueOnce(null);
    mockPrismaUser.findUnique.mockResolvedValueOnce(null);
    mockPrismaUser.create.mockResolvedValue({
      id: '3',
      email: 'google@example.com',
      name: 'Google User',
      googleId: 'google-123',
      googleImage: 'https://photo.url/pic.jpg',
    });

    const result = await loginWithGoogle('fake-token');

    expect(mockPrismaUser.create).toHaveBeenCalledWith({
      data: {
        email: 'google@example.com',
        name: 'Google User',
        googleId: 'google-123',
        googleImage: 'https://photo.url/pic.jpg',
      },
    });
    expect(result.success).toBe(true);
    expect(result.user).toMatchObject({
      id: '3',
      email: 'google@example.com',
      name: 'Google User',
    });
  });

  it('returns error for invalid payload (null)', async () => {
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => null,
    });

    const result = await loginWithGoogle('fake-token');

    expect(result).toEqual({ success: false, error: 'Invalid token' });
  });

  it('returns error when no email in payload', async () => {
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: 'google-123',
        email: undefined,
        name: 'No Email User',
        picture: 'https://photo.url/pic.jpg',
      }),
    });

    const result = await loginWithGoogle('fake-token');

    expect(result).toEqual({ success: false, error: 'Email not found in Google profile' });
  });

  it('returns "Google authentication failed" on error', async () => {
    mockVerifyIdToken.mockRejectedValue(new Error('Token verification failed'));

    const result = await loginWithGoogle('bad-token');

    expect(result).toEqual({ success: false, error: 'Google authentication failed' });
  });

  it('falls back to email prefix when name is null and uses UI avatars when no googleImage', async () => {
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: 'google-456',
        email: 'noname@example.com',
        name: null,
        picture: null,
      }),
    });
    // No user by googleId
    mockPrismaUser.findUnique.mockResolvedValueOnce(null);
    // No user by email - creates new
    mockPrismaUser.findUnique.mockResolvedValueOnce(null);
    mockPrismaUser.create.mockResolvedValue({
      id: '4',
      email: 'noname@example.com',
      name: null,
      googleId: 'google-456',
      googleImage: null,
    });

    const result = await loginWithGoogle('fake-token');

    expect(result.success).toBe(true);
    expect(result.user.name).toBe('noname');
    expect(result.user.avatar).toContain('ui-avatars.com');
  });
});
