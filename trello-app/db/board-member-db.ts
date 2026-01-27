import db from './database';
import { generateCuid } from './database';

export interface BoardMemberRow {
  id: string;
  board_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member' | 'readonly';
  status: 'pending' | 'accepted' | 'rejected';
  created_at: number;
}

export interface BoardMemberUser {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  role: 'owner' | 'admin' | 'member' | 'readonly';
}

export const boardMemberDb = {
  findMembersByBoardId(boardId: string): BoardMemberUser[] {
    const stmt = db.prepare(`
      SELECT u.id as id, u.email as email, u.name as name, u.avatar as avatar, bm.role as role
      FROM board_members bm
      JOIN users u ON u.id = bm.user_id
      WHERE bm.board_id = ? AND bm.status = 'accepted'
      ORDER BY bm.created_at ASC
    `);

    return stmt.all(boardId) as BoardMemberUser[];
  },

  addMember(boardId: string, userId: string, role: 'owner' | 'admin' | 'member' | 'readonly' = 'member', status: 'pending' | 'accepted' = 'pending'): BoardMemberRow {
    const id = generateCuid();
    const now = Math.floor(Date.now() / 1000);

    const stmt = db.prepare(`
      INSERT INTO board_members (id, board_id, user_id, role, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, boardId, userId, role, status, now);

    return {
      id,
      board_id: boardId,
      user_id: userId,
      role,
      status,
      created_at: now,
    };
  },

  removeMember(boardId: string, userId: string): void {
    const stmt = db.prepare(`
      DELETE FROM board_members
      WHERE board_id = ? AND user_id = ?
    `);

    stmt.run(boardId, userId);
  },

  isMember(boardId: string, userId: string): boolean {
    const stmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM board_members
      WHERE board_id = ? AND user_id = ?
    `);

    const result = stmt.get(boardId, userId) as { count: number };
    return result.count > 0;
  },

  getMemberRole(boardId: string, userId: string): 'owner' | 'admin' | 'member' | 'readonly' | null {
    const stmt = db.prepare(`
      SELECT role
      FROM board_members
      WHERE board_id = ? AND user_id = ?
    `);

    const result = stmt.get(boardId, userId) as { role: 'owner' | 'admin' | 'member' | 'readonly' } | undefined;
    return result?.role || null;
  },

  updateMemberRole(boardId: string, userId: string, role: 'owner' | 'admin' | 'member' | 'readonly'): void {
    const stmt = db.prepare(`
      UPDATE board_members
      SET role = ?
      WHERE board_id = ? AND user_id = ?
    `);

    stmt.run(role, boardId, userId);
  },

  // Nouvelles fonctions pour les invitations
  findPendingInvitations(userId: string) {
    const stmt = db.prepare(`
      SELECT 
        bm.id as invitation_id,
        b.id as board_id,
        b.name as board_name,
        b.description as board_description,
        u.id as inviter_id,
        u.name as inviter_name,
        u.email as inviter_email,
        bm.role as role,
        bm.created_at as invited_at
      FROM board_members bm
      JOIN boards b ON b.id = bm.board_id
      JOIN users u ON u.id = b.owner_id
      WHERE bm.user_id = ? AND bm.status = 'pending'
      ORDER BY bm.created_at DESC
    `);

    return stmt.all(userId);
  },

  acceptInvitation(invitationId: string, userId: string): boolean {
    const stmt = db.prepare(`
      UPDATE board_members
      SET status = 'accepted'
      WHERE id = ? AND user_id = ? AND status = 'pending'
    `);

    const result = stmt.run(invitationId, userId);
    return result.changes > 0;
  },

  rejectInvitation(invitationId: string, userId: string): boolean {
    const stmt = db.prepare(`
      DELETE FROM board_members
      WHERE id = ? AND user_id = ? AND status = 'pending'
    `);

    const result = stmt.run(invitationId, userId);
    return result.changes > 0;
  },
};
