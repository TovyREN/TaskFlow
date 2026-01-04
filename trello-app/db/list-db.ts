import db, { generateCuid, timestampToDate } from './database';

export interface ListRow {
  id: string;
  board_id: string;
  title: string;
  background: string | null;
  position: number;
  created_at: number;
  updated_at: number;
}

export interface List {
  id: string;
  board_id: string;
  title: string;
  background: string | null;
  position: number;
  created_at: Date;
  updated_at: Date;
}

export interface CardRow {
  id: string;
  list_id: string;
  title: string;
  description: string | null;
  position: number;
  due_date: number | null;
  created_at: number;
  updated_at: number;
}

export interface Card {
  id: string;
  list_id: string;
  title: string;
  description: string | null;
  position: number;
  due_date: Date | null;
  created_at: Date;
  updated_at: Date;
}

function rowToList(row: ListRow): List {
  return {
    id: row.id,
    board_id: row.board_id,
    title: row.title,
    background: row.background,
    position: row.position,
    created_at: timestampToDate(row.created_at)!,
    updated_at: timestampToDate(row.updated_at)!,
  };
}

function rowToCard(row: CardRow): Card {
  return {
    id: row.id,
    list_id: row.list_id,
    title: row.title,
    description: row.description,
    position: row.position,
    due_date: row.due_date ? timestampToDate(row.due_date) : null,
    created_at: timestampToDate(row.created_at)!,
    updated_at: timestampToDate(row.updated_at)!,
  };
}

export const listDb = {
  create(boardId: string, title: string, position: number): List {
    const id = generateCuid();
    const now = Math.floor(Date.now() / 1000);

    const stmt = db.prepare(`
      INSERT INTO lists (id, board_id, title, background, position, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, boardId, title, null, position, now, now);

    return {
      id,
      board_id: boardId,
      title,
      background: null,
      position,
      created_at: new Date(now * 1000),
      updated_at: new Date(now * 1000),
    };
  },

  findById(id: string): List | null {
    const stmt = db.prepare('SELECT * FROM lists WHERE id = ?');
    const row = stmt.get(id) as ListRow | undefined;

    return row ? rowToList(row) : null;
  },

  findByBoardId(boardId: string): List[] {
    const stmt = db.prepare('SELECT * FROM lists WHERE board_id = ? ORDER BY position ASC');
    const rows = stmt.all(boardId) as ListRow[];

    return rows.map(rowToList);
  },

  update(id: string, data: Partial<Pick<List, 'title' | 'background' | 'position'>>): List | null {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.title !== undefined) {
      updates.push('title = ?');
      values.push(data.title);
    }

    if (data.background !== undefined) {
      updates.push('background = ?');
      values.push(data.background);
    }

    if (data.position !== undefined) {
      updates.push('position = ?');
      values.push(data.position);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    // Toujours mettre à jour updated_at
    updates.push('updated_at = ?');
    const now = Math.floor(Date.now() / 1000);
    values.push(now);

    values.push(id);

    const stmt = db.prepare(`
      UPDATE lists 
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values);

    return this.findById(id);
  },

  delete(id: string): boolean {
    const stmt = db.prepare('DELETE FROM lists WHERE id = ?');
    const result = stmt.run(id);

    return result.changes > 0;
  },
};

export const cardDb = {
  create(
    listId: string,
    title: string,
    position: number,
    description?: string | null
  ): Card {
    const id = generateCuid();
    const now = Math.floor(Date.now() / 1000);

    const stmt = db.prepare(`
      INSERT INTO cards (id, list_id, title, description, position, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, listId, title, description, position, now, now);

    return {
      id,
      list_id: listId,
      title,
      description: description || null,
      position,
      due_date: null,
      created_at: new Date(now * 1000),
      updated_at: new Date(now * 1000),
    };
  },

  findById(id: string): Card | null {
    const stmt = db.prepare('SELECT * FROM cards WHERE id = ?');
    const row = stmt.get(id) as CardRow | undefined;

    return row ? rowToCard(row) : null;
  },

  findByListId(listId: string): Card[] {
    const stmt = db.prepare('SELECT * FROM cards WHERE list_id = ? ORDER BY position ASC');
    const rows = stmt.all(listId) as CardRow[];

    return rows.map(rowToCard);
  },

  update(
    id: string,
    data: Partial<Pick<Card, 'title' | 'description' | 'position' | 'list_id'>>
  ): Card | null {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.title !== undefined) {
      updates.push('title = ?');
      values.push(data.title);
    }

    if (data.description !== undefined) {
      updates.push('description = ?');
      values.push(data.description);
    }

    if (data.position !== undefined) {
      updates.push('position = ?');
      values.push(data.position);
    }

    if (data.list_id !== undefined) {
      updates.push('list_id = ?');
      values.push(data.list_id);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    // Toujours mettre à jour updated_at
    updates.push('updated_at = ?');
    const now = Math.floor(Date.now() / 1000);
    values.push(now);

    values.push(id);

    const stmt = db.prepare(`
      UPDATE cards 
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values);

    return this.findById(id);
  },

  delete(id: string): boolean {
    const stmt = db.prepare('DELETE FROM cards WHERE id = ?');
    const result = stmt.run(id);

    return result.changes > 0;
  },
};
