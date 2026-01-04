import db, { generateCuid, timestampToDate } from './database';

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  name: string | null;
  avatar: string | null;
  created_at: number;
  updated_at: number;
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionRow {
  id: string;
  user_id: string;
  token: string;
  expires_at: number;
  created_at: number;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

// Convertir UserRow en User
function rowToUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    avatar: row.avatar,
    createdAt: timestampToDate(row.created_at)!,
    updatedAt: timestampToDate(row.updated_at)!,
  };
}

// Convertir SessionRow en Session
function rowToSession(row: SessionRow): Session {
  return {
    id: row.id,
    userId: row.user_id,
    token: row.token,
    expiresAt: timestampToDate(row.expires_at)!,
    createdAt: timestampToDate(row.created_at)!,
  };
}

// Opérations sur les utilisateurs
export const userDb = {
  create(email: string, passwordHash: string, name: string | null = null): User {
    const id = generateCuid();
    const now = Math.floor(Date.now() / 1000);

    const stmt = db.prepare(`
      INSERT INTO users (id, email, password_hash, name, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, email, passwordHash, name, now, now);

    return {
      id,
      email,
      name,
      avatar: null,
      createdAt: new Date(now * 1000),
      updatedAt: new Date(now * 1000),
    };
  },

  findByEmail(email: string): (User & { passwordHash: string }) | null {
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    const row = stmt.get(email) as UserRow | undefined;

    if (!row) return null;

    return {
      ...rowToUser(row),
      passwordHash: row.password_hash,
    };
  },

  findById(id: string): User | null {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    const row = stmt.get(id) as UserRow | undefined;

    return row ? rowToUser(row) : null;
  },

  update(id: string, data: Partial<Pick<User, 'name' | 'avatar'>>): User | null {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }

    if (data.avatar !== undefined) {
      updates.push('avatar = ?');
      values.push(data.avatar);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    values.push(id);

    const stmt = db.prepare(`
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values);

    return this.findById(id);
  },
};

// Opérations sur les sessions
export const sessionDb = {
  create(userId: string, token: string, expiresAt: Date): Session {
    const id = generateCuid();
    const now = Math.floor(Date.now() / 1000);
    const expiresTimestamp = Math.floor(expiresAt.getTime() / 1000);

    const stmt = db.prepare(`
      INSERT INTO sessions (id, user_id, token, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(id, userId, token, expiresTimestamp, now);

    return {
      id,
      userId,
      token,
      expiresAt,
      createdAt: new Date(now * 1000),
    };
  },

  findByToken(token: string): Session | null {
    const stmt = db.prepare('SELECT * FROM sessions WHERE token = ?');
    const row = stmt.get(token) as SessionRow | undefined;

    return row ? rowToSession(row) : null;
  },

  deleteByToken(token: string): void {
    const stmt = db.prepare('DELETE FROM sessions WHERE token = ?');
    stmt.run(token);
  },

  deleteExpired(): void {
    const now = Math.floor(Date.now() / 1000);
    const stmt = db.prepare('DELETE FROM sessions WHERE expires_at < ?');
    stmt.run(now);
  },

  deleteByUserId(userId: string): void {
    const stmt = db.prepare('DELETE FROM sessions WHERE user_id = ?');
    stmt.run(userId);
  },
};
