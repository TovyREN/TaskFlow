import db, { generateCuid } from './database';

export interface LabelRow {
  id: string;
  board_id: string;
  name: string;
  color: string;
  created_at: number;
}

export interface Label {
  id: string;
  board_id: string;
  name: string;
  color: string;
  created_at: Date;
}

function rowToLabel(row: LabelRow): Label {
  return {
    id: row.id,
    board_id: row.board_id,
    name: row.name,
    color: row.color,
    created_at: new Date(row.created_at * 1000),
  };
}

export const labelDb = {
  create(boardId: string, name: string, color: string): Label {
    const id = generateCuid();
    const now = Math.floor(Date.now() / 1000);

    const stmt = db.prepare(`
      INSERT INTO labels (id, board_id, name, color, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(id, boardId, name, color, now);

    return {
      id,
      board_id: boardId,
      name,
      color,
      created_at: new Date(now * 1000),
    };
  },

  findByBoardId(boardId: string): Label[] {
    const stmt = db.prepare('SELECT * FROM labels WHERE board_id = ? ORDER BY created_at ASC');
    const rows = stmt.all(boardId) as LabelRow[];
    return rows.map(rowToLabel);
  },

  findByCardIds(cardIds: string[]): Array<{ card_id: string; label: Label }> {
    if (cardIds.length === 0) return [];

    const placeholders = cardIds.map(() => '?').join(',');
    const stmt = db.prepare(`
      SELECT cl.card_id as card_id, l.*
      FROM card_labels cl
      JOIN labels l ON l.id = cl.label_id
      WHERE cl.card_id IN (${placeholders})
      ORDER BY l.created_at ASC
    `);

    const rows = stmt.all(...cardIds) as Array<LabelRow & { card_id: string }>;
    return rows.map((row) => ({
      card_id: row.card_id,
      label: rowToLabel(row),
    }));
  },

  isLabelOnCard(cardId: string, labelId: string): boolean {
    const stmt = db.prepare('SELECT 1 FROM card_labels WHERE card_id = ? AND label_id = ?');
    const row = stmt.get(cardId, labelId);
    return !!row;
  },

  addLabelToCard(cardId: string, labelId: string): void {
    const id = generateCuid();
    const now = Math.floor(Date.now() / 1000);

    const stmt = db.prepare(`
      INSERT OR IGNORE INTO card_labels (id, card_id, label_id, created_at)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(id, cardId, labelId, now);
  },

  removeLabelFromCard(cardId: string, labelId: string): void {
    const stmt = db.prepare('DELETE FROM card_labels WHERE card_id = ? AND label_id = ?');
    stmt.run(cardId, labelId);
  },
};
