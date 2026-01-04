import db from './database';

export interface BoardMemberRow {
  id: string;
  board_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  created_at: number;
}

export interface BoardMemberUser {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  role: 'owner' | 'admin' | 'member';
}

export const boardMemberDb = {
  findMembersByBoardId(boardId: string): BoardMemberUser[] {
    const stmt = db.prepare(`
      SELECT u.id as id, u.email as email, u.name as name, u.avatar as avatar, bm.role as role
      FROM board_members bm
      JOIN users u ON u.id = bm.user_id
      WHERE bm.board_id = ?
      ORDER BY bm.created_at ASC
    `);

    return stmt.all(boardId) as BoardMemberUser[];
  },
};
