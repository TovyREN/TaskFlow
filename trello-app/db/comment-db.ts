import db, { generateCuid } from './database';

export interface CommentRow {
  id: string;
  card_id: string;
  user_id: string;
  content: string;
  created_at: number;
  updated_at: number;
}

export interface CommentWithUser {
  id: string;
  card_id: string;
  user_id: string;
  content: string;
  created_at: Date;
  updated_at: Date;
  user: {
    id: string;
    email: string;
    name: string | null;
    avatar: string | null;
  };
}

export const commentDb = {
  create(cardId: string, userId: string, content: string): CommentWithUser {
    const id = generateCuid();
    const now = Math.floor(Date.now() / 1000);

    const stmt = db.prepare(`
      INSERT INTO comments (id, card_id, user_id, content, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, cardId, userId, content, now, now);

    // Recharger avec user
    const getStmt = db.prepare(`
      SELECT c.*, u.email as user_email, u.name as user_name, u.avatar as user_avatar
      FROM comments c
      JOIN users u ON u.id = c.user_id
      WHERE c.id = ?
    `);

    const row = getStmt.get(id) as any;

    return {
      id: row.id,
      card_id: row.card_id,
      user_id: row.user_id,
      content: row.content,
      created_at: new Date(row.created_at * 1000),
      updated_at: new Date(row.updated_at * 1000),
      user: {
        id: row.user_id,
        email: row.user_email,
        name: row.user_name,
        avatar: row.user_avatar,
      },
    };
  },

  findByCardId(cardId: string): CommentWithUser[] {
    const stmt = db.prepare(`
      SELECT c.*, u.email as user_email, u.name as user_name, u.avatar as user_avatar
      FROM comments c
      JOIN users u ON u.id = c.user_id
      WHERE c.card_id = ?
      ORDER BY c.created_at DESC
    `);

    const rows = stmt.all(cardId) as any[];

    return rows.map((row) => ({
      id: row.id,
      card_id: row.card_id,
      user_id: row.user_id,
      content: row.content,
      created_at: new Date(row.created_at * 1000),
      updated_at: new Date(row.updated_at * 1000),
      user: {
        id: row.user_id,
        email: row.user_email,
        name: row.user_name,
        avatar: row.user_avatar,
      },
    }));
  },

  countByCardIds(cardIds: string[]): Array<{ card_id: string; count: number }> {
    if (cardIds.length === 0) return [];
    const placeholders = cardIds.map(() => '?').join(',');

    const stmt = db.prepare(`
      SELECT card_id as card_id, COUNT(*) as count
      FROM comments
      WHERE card_id IN (${placeholders})
      GROUP BY card_id
    `);

    return (stmt.all(...cardIds) as Array<{ card_id: string; count: number }>).map((r) => ({
      card_id: r.card_id,
      count: Number(r.count) || 0,
    }));
  },
};
