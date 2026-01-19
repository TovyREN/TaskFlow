import db, { generateCuid, timestampToDate } from './database';

export interface BoardRow {
  id: string;
  name: string;
  description: string | null;
  background: string | null;
  visibility: string;
  owner_id: string;
  created_at: number;
  updated_at: number;
}

export interface Board {
  id: string;
  name: string;
  description: string | null;
  background: string | null;
  visibility: string;
  owner_id: string;
  created_at: Date;
  updated_at: Date;
}

function rowToBoard(row: BoardRow): Board {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    background: row.background,
    visibility: row.visibility,
    owner_id: row.owner_id,
    created_at: timestampToDate(row.created_at)!,
    updated_at: timestampToDate(row.updated_at)!,
  };
}

export const boardDb = {
  create(
    name: string,
    ownerId: string,
    description?: string | null,
    background?: string | null,
    visibility: string = 'private'
  ): Board {
    const id = generateCuid();
    const now = Math.floor(Date.now() / 1000);

    const stmt = db.prepare(`
      INSERT INTO boards (id, name, description, background, visibility, owner_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, name, description, background, visibility, ownerId, now, now);

    return {
      id,
      name,
      description: description || null,
      background: background || null,
      visibility,
      owner_id: ownerId,
      created_at: new Date(now * 1000),
      updated_at: new Date(now * 1000),
    };
  },

  findById(id: string): Board | null {
    const stmt = db.prepare('SELECT * FROM boards WHERE id = ?');
    const row = stmt.get(id) as BoardRow | undefined;

    return row ? rowToBoard(row) : null;
  },

  findByOwnerId(ownerId: string): Board[] {
    const stmt = db.prepare('SELECT * FROM boards WHERE owner_id = ? ORDER BY created_at DESC');
    const rows = stmt.all(ownerId) as BoardRow[];

    return rows.map(rowToBoard);
  },

  // Trouver tous les boards accessibles par un utilisateur (owner ou membre)
  findByUserId(userId: string): Board[] {
    const stmt = db.prepare(`
      SELECT DISTINCT b.* 
      FROM boards b
      LEFT JOIN board_members bm ON bm.board_id = b.id AND bm.user_id = ?
      WHERE b.owner_id = ? OR (bm.user_id = ? AND bm.status = 'accepted')
      ORDER BY b.created_at DESC
    `);
    const rows = stmt.all(userId, userId, userId) as BoardRow[];

    return rows.map(rowToBoard);
  },

  update(
    id: string,
    data: Partial<Pick<Board, 'name' | 'description' | 'background' | 'visibility'>>
  ): Board | null {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }

    if (data.description !== undefined) {
      updates.push('description = ?');
      values.push(data.description);
    }

    if (data.background !== undefined) {
      updates.push('background = ?');
      values.push(data.background);
    }

    if (data.visibility !== undefined) {
      updates.push('visibility = ?');
      values.push(data.visibility);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    values.push(id);

    const stmt = db.prepare(`
      UPDATE boards 
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values);

    return this.findById(id);
  },

  delete(id: string): boolean {
    const stmt = db.prepare('DELETE FROM boards WHERE id = ?');
    const result = stmt.run(id);

    return result.changes > 0;
  },

  // Vérifier si un utilisateur peut accéder à un board
  canUserAccess(boardId: string, userId: string): boolean {
    const stmt = db.prepare(`
      SELECT COUNT(*) as count 
      FROM boards 
      WHERE id = ? AND (owner_id = ? OR visibility = 'public')
    `);
    const result = stmt.get(boardId, userId) as { count: number } | undefined;

    return result ? result.count > 0 : false;
  },
};
