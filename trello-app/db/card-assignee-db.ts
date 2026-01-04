import db, { generateCuid } from './database';

export interface CardAssigneeUser {
  card_id: string;
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
}

export const cardAssigneeDb = {
  findByCardIds(cardIds: string[]): CardAssigneeUser[] {
    if (cardIds.length === 0) return [];
    const placeholders = cardIds.map(() => '?').join(',');

    const stmt = db.prepare(`
      SELECT ca.card_id as card_id, u.id as id, u.email as email, u.name as name, u.avatar as avatar
      FROM card_assignees ca
      JOIN users u ON u.id = ca.user_id
      WHERE ca.card_id IN (${placeholders})
      ORDER BY ca.created_at ASC
    `);

    return stmt.all(...cardIds) as CardAssigneeUser[];
  },

  isAssigned(cardId: string, userId: string): boolean {
    const stmt = db.prepare('SELECT 1 FROM card_assignees WHERE card_id = ? AND user_id = ?');
    return !!stmt.get(cardId, userId);
  },

  assign(cardId: string, userId: string): void {
    const id = generateCuid();
    const now = Math.floor(Date.now() / 1000);

    const stmt = db.prepare(`
      INSERT OR IGNORE INTO card_assignees (id, card_id, user_id, created_at)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(id, cardId, userId, now);
  },

  unassign(cardId: string, userId: string): void {
    const stmt = db.prepare('DELETE FROM card_assignees WHERE card_id = ? AND user_id = ?');
    stmt.run(cardId, userId);
  },
};
