import db, { generateCuid } from './database';

export interface ChecklistRow {
  id: string;
  card_id: string;
  title: string;
  position: number;
  created_at: number;
  updated_at: number;
}

export interface ChecklistItemRow {
  id: string;
  checklist_id: string;
  title: string;
  completed: 0 | 1;
  position: number;
  created_at: number;
  updated_at: number;
}

export interface Checklist {
  id: string;
  card_id: string;
  title: string;
  position: number;
  created_at: Date;
  updated_at: Date;
}

export interface ChecklistItem {
  id: string;
  checklist_id: string;
  title: string;
  completed: boolean;
  position: number;
  created_at: Date;
  updated_at: Date;
}

function rowToChecklist(row: ChecklistRow): Checklist {
  return {
    id: row.id,
    card_id: row.card_id,
    title: row.title,
    position: row.position,
    created_at: new Date(row.created_at * 1000),
    updated_at: new Date(row.updated_at * 1000),
  };
}

function rowToChecklistItem(row: ChecklistItemRow): ChecklistItem {
  return {
    id: row.id,
    checklist_id: row.checklist_id,
    title: row.title,
    completed: row.completed === 1,
    position: row.position,
    created_at: new Date(row.created_at * 1000),
    updated_at: new Date(row.updated_at * 1000),
  };
}

export const checklistDb = {
  findByCardId(cardId: string): Array<Checklist & { items: ChecklistItem[] }> {
    const checklistStmt = db.prepare('SELECT * FROM checklists WHERE card_id = ? ORDER BY position ASC');
    const itemStmt = db.prepare('SELECT * FROM checklist_items WHERE checklist_id = ? ORDER BY position ASC');

    const checklists = (checklistStmt.all(cardId) as ChecklistRow[]).map(rowToChecklist);

    return checklists.map((checklist) => {
      const items = (itemStmt.all(checklist.id) as ChecklistItemRow[]).map(rowToChecklistItem);
      return { ...checklist, items };
    });
  },

  createChecklist(cardId: string, title: string): Checklist {
    const id = generateCuid();
    const now = Math.floor(Date.now() / 1000);

    const positionStmt = db.prepare('SELECT COALESCE(MAX(position), -1) + 1 as nextPos FROM checklists WHERE card_id = ?');
    const nextPos = (positionStmt.get(cardId) as { nextPos: number }).nextPos;

    const stmt = db.prepare(`
      INSERT INTO checklists (id, card_id, title, position, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, cardId, title, nextPos, now, now);

    return {
      id,
      card_id: cardId,
      title,
      position: nextPos,
      created_at: new Date(now * 1000),
      updated_at: new Date(now * 1000),
    };
  },

  deleteChecklist(checklistId: string): void {
    const stmt = db.prepare('DELETE FROM checklists WHERE id = ?');
    stmt.run(checklistId);
  },

  addItem(checklistId: string, title: string): ChecklistItem {
    const id = generateCuid();
    const now = Math.floor(Date.now() / 1000);

    const positionStmt = db.prepare('SELECT COALESCE(MAX(position), -1) + 1 as nextPos FROM checklist_items WHERE checklist_id = ?');
    const nextPos = (positionStmt.get(checklistId) as { nextPos: number }).nextPos;

    const stmt = db.prepare(`
      INSERT INTO checklist_items (id, checklist_id, title, completed, position, created_at, updated_at)
      VALUES (?, ?, ?, 0, ?, ?, ?)
    `);

    stmt.run(id, checklistId, title, nextPos, now, now);

    return {
      id,
      checklist_id: checklistId,
      title,
      completed: false,
      position: nextPos,
      created_at: new Date(now * 1000),
      updated_at: new Date(now * 1000),
    };
  },

  toggleItem(itemId: string, completed: boolean): void {
    const stmt = db.prepare('UPDATE checklist_items SET completed = ? WHERE id = ?');
    stmt.run(completed ? 1 : 0, itemId);
  },

  deleteItem(itemId: string): void {
    const stmt = db.prepare('DELETE FROM checklist_items WHERE id = ?');
    stmt.run(itemId);
  },

  getSummaryByCardIds(cardIds: string[]): Array<{ card_id: string; total: number; completed: number }> {
    if (cardIds.length === 0) return [];
    const placeholders = cardIds.map(() => '?').join(',');

    const stmt = db.prepare(`
      SELECT c.card_id as card_id,
             COUNT(ci.id) as total,
             SUM(CASE WHEN ci.completed = 1 THEN 1 ELSE 0 END) as completed
      FROM checklists c
      LEFT JOIN checklist_items ci ON ci.checklist_id = c.id
      WHERE c.card_id IN (${placeholders})
      GROUP BY c.card_id
    `);

    return (stmt.all(...cardIds) as Array<{ card_id: string; total: number; completed: number }>).map((r) => ({
      ...r,
      total: Number(r.total) || 0,
      completed: Number(r.completed) || 0,
    }));
  },
};
