import { prisma } from '@/lib/prisma';
import { emitToWorkspace } from '@/lib/socket';
import {
  getWorkspaces,
  getWorkspaceDetails,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  getUserRole,
  updateMemberRole,
  removeMember,
  createInvitation,
  getPendingInvitations,
  respondToInvitation,
  cancelInvitation,
  getWorkspaceBoards,
  createBoardInWorkspace,
  deleteBoardFromWorkspace,
} from '../../app/actions/workspaceActions';

jest.mock('../../app/actions/notificationActions', () => ({
  createNotification: jest.fn().mockResolvedValue({ success: true }),
}));

const mockWorkspace = prisma.workspace as unknown as {
  findUnique: jest.Mock;
  findMany: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
};
const mockWorkspaceMember = prisma.workspaceMember as unknown as {
  updateMany: jest.Mock;
  deleteMany: jest.Mock;
};
const mockInvitation = prisma.workspaceInvitation as unknown as {
  findFirst: jest.Mock;
  findUnique: jest.Mock;
  findMany: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
};
const mockUser = prisma.user as unknown as {
  findUnique: jest.Mock;
};
const mockBoard = prisma.board as unknown as {
  findUnique: jest.Mock;
  findMany: jest.Mock;
  create: jest.Mock;
  delete: jest.Mock;
};
const mockTransaction = prisma.$transaction as jest.Mock;
const mockEmitToWorkspace = emitToWorkspace as jest.Mock;

// Helper workspace objects
function ownerWorkspace(userId = 'user1') {
  return {
    id: 'ws1',
    name: 'Test Workspace',
    ownerId: userId,
    members: [
      { userId, role: 'ADMIN', user: { id: userId, name: 'Owner', email: 'owner@test.com' } },
    ],
  };
}

function memberWorkspace(ownerId = 'owner1', memberId = 'user2', memberRole = 'MEMBER') {
  return {
    id: 'ws1',
    name: 'Test Workspace',
    ownerId,
    members: [
      { userId: ownerId, role: 'ADMIN', user: { id: ownerId, name: 'Owner', email: 'owner@test.com' } },
      { userId: memberId, role: memberRole, user: { id: memberId, name: 'Member', email: 'member@test.com' } },
    ],
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

// =====================
// getWorkspaces
// =====================
describe('getWorkspaces', () => {
  it('returns workspaces for user', async () => {
    const workspaces = [{ id: 'ws1', name: 'WS1' }];
    mockWorkspace.findMany.mockResolvedValue(workspaces);

    const result = await getWorkspaces('user1');
    expect(result).toEqual(workspaces);
    expect(mockWorkspace.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { OR: [{ ownerId: 'user1' }, { members: { some: { userId: 'user1' } } }] },
      }),
    );
  });

  it('returns empty array on error', async () => {
    mockWorkspace.findMany.mockRejectedValue(new Error('DB error'));
    const result = await getWorkspaces('user1');
    expect(result).toEqual([]);
  });
});

// =====================
// getWorkspaceDetails
// =====================
describe('getWorkspaceDetails', () => {
  it('returns workspace when user is owner', async () => {
    const ws = ownerWorkspace('user1');
    mockWorkspace.findUnique.mockResolvedValue(ws);

    const result = await getWorkspaceDetails('ws1', 'user1');
    expect(result).toEqual(ws);
  });

  it('returns workspace when user is member', async () => {
    const ws = memberWorkspace('owner1', 'user2');
    mockWorkspace.findUnique.mockResolvedValue(ws);

    const result = await getWorkspaceDetails('ws1', 'user2');
    expect(result).toEqual(ws);
  });

  it('returns null if workspace not found', async () => {
    mockWorkspace.findUnique.mockResolvedValue(null);
    const result = await getWorkspaceDetails('ws1', 'user1');
    expect(result).toBeNull();
  });

  it('returns null if user has no access', async () => {
    const ws = ownerWorkspace('owner1');
    mockWorkspace.findUnique.mockResolvedValue(ws);

    const result = await getWorkspaceDetails('ws1', 'stranger');
    expect(result).toBeNull();
  });
});

// =====================
// createWorkspace
// =====================
describe('createWorkspace', () => {
  it('creates workspace with owner as ADMIN member', async () => {
    const ws = { id: 'ws1', name: 'New WS', ownerId: 'user1' };
    mockWorkspace.create.mockResolvedValue(ws);

    const result = await createWorkspace('New WS', 'user1', 'desc', '#ff0000');
    expect(result).toEqual({ success: true, workspace: ws });
    expect(mockWorkspace.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'New WS',
          ownerId: 'user1',
          description: 'desc',
          color: '#ff0000',
          members: { create: { userId: 'user1', role: 'ADMIN' } },
        }),
      }),
    );
  });

  it('uses default color when none provided', async () => {
    mockWorkspace.create.mockResolvedValue({ id: 'ws1' });
    await createWorkspace('WS', 'user1');
    expect(mockWorkspace.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ color: '#3b82f6' }),
      }),
    );
  });

  it('returns error on failure', async () => {
    mockWorkspace.create.mockRejectedValue(new Error('fail'));
    const result = await createWorkspace('WS', 'user1');
    expect(result.success).toBe(false);
  });
});

// =====================
// updateWorkspace
// =====================
describe('updateWorkspace', () => {
  it('updates workspace as owner', async () => {
    mockWorkspace.findUnique.mockResolvedValue(ownerWorkspace('user1'));
    mockWorkspace.update.mockResolvedValue({ id: 'ws1', name: 'Updated' });

    const result = await updateWorkspace('ws1', 'user1', { name: 'Updated' });
    expect(result).toEqual({ success: true, workspace: { id: 'ws1', name: 'Updated' } });
  });

  it('returns error if not owner or admin', async () => {
    mockWorkspace.findUnique.mockResolvedValue(memberWorkspace('owner1', 'user2', 'VIEWER'));
    const result = await updateWorkspace('ws1', 'user2', { name: 'X' });
    expect(result.success).toBe(false);
    expect(result.error).toContain('permission');
  });

  it('returns error if workspace not found', async () => {
    mockWorkspace.findUnique.mockResolvedValue(null);
    const result = await updateWorkspace('ws1', 'user1', { name: 'X' });
    expect(result).toEqual({ success: false, error: 'Workspace not found' });
  });
});

// =====================
// deleteWorkspace
// =====================
describe('deleteWorkspace', () => {
  it('deletes workspace as owner', async () => {
    mockWorkspace.findUnique.mockResolvedValue({ id: 'ws1', ownerId: 'user1' });
    mockWorkspace.delete.mockResolvedValue({});

    const result = await deleteWorkspace('ws1', 'user1');
    expect(result).toEqual({ success: true });
  });

  it('returns error if not owner', async () => {
    mockWorkspace.findUnique.mockResolvedValue({ id: 'ws1', ownerId: 'owner1' });
    const result = await deleteWorkspace('ws1', 'user2');
    expect(result.success).toBe(false);
    expect(result.error).toContain('owner');
  });

  it('returns error if workspace not found', async () => {
    mockWorkspace.findUnique.mockResolvedValue(null);
    const result = await deleteWorkspace('ws1', 'user1');
    expect(result).toEqual({ success: false, error: 'Workspace not found' });
  });
});

// =====================
// getUserRole
// =====================
describe('getUserRole', () => {
  it('returns ADMIN for owner', async () => {
    mockWorkspace.findUnique.mockResolvedValue({ id: 'ws1', ownerId: 'user1', members: [] });
    const result = await getUserRole('ws1', 'user1');
    expect(result).toBe('ADMIN');
  });

  it('returns member role', async () => {
    mockWorkspace.findUnique.mockResolvedValue({
      id: 'ws1',
      ownerId: 'owner1',
      members: [{ userId: 'user2', role: 'MEMBER' }],
    });
    const result = await getUserRole('ws1', 'user2');
    expect(result).toBe('MEMBER');
  });

  it('returns null if workspace not found', async () => {
    mockWorkspace.findUnique.mockResolvedValue(null);
    const result = await getUserRole('ws1', 'user1');
    expect(result).toBeNull();
  });
});

// =====================
// updateMemberRole
// =====================
describe('updateMemberRole', () => {
  it('updates role as owner', async () => {
    mockWorkspace.findUnique.mockResolvedValue(memberWorkspace('user1', 'user2', 'MEMBER'));
    mockWorkspaceMember.updateMany.mockResolvedValue({ count: 1 });

    const result = await updateMemberRole('ws1', 'user2', 'ADMIN', 'user1');
    expect(result).toEqual({ success: true });
    expect(mockEmitToWorkspace).toHaveBeenCalledWith('ws1', 'workspace:member-role-changed', expect.any(Object));
  });

  it('returns error if not owner or admin', async () => {
    mockWorkspace.findUnique.mockResolvedValue(memberWorkspace('owner1', 'user2', 'VIEWER'));
    const result = await updateMemberRole('ws1', 'user3', 'MEMBER', 'user2');
    expect(result.success).toBe(false);
    expect(result.error).toContain('permission');
  });

  it('cannot change owner role', async () => {
    mockWorkspace.findUnique.mockResolvedValue(ownerWorkspace('owner1'));
    const result = await updateMemberRole('ws1', 'owner1', 'MEMBER', 'owner1');
    expect(result.success).toBe(false);
    expect(result.error).toContain("owner's role");
  });

  it('only owner can promote to ADMIN', async () => {
    // admin (non-owner) tries to promote
    const ws = memberWorkspace('owner1', 'admin1', 'ADMIN');
    ws.members.push({ userId: 'user3', role: 'MEMBER', user: { id: 'user3', name: 'U3', email: 'u3@test.com' } });
    mockWorkspace.findUnique.mockResolvedValue(ws);

    const result = await updateMemberRole('ws1', 'user3', 'ADMIN', 'admin1');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Only the owner');
  });
});

// =====================
// removeMember
// =====================
describe('removeMember', () => {
  it('owner removes a member', async () => {
    mockWorkspace.findUnique.mockResolvedValue(memberWorkspace('user1', 'user2'));
    mockWorkspaceMember.deleteMany.mockResolvedValue({ count: 1 });

    const result = await removeMember('ws1', 'user2', 'user1');
    expect(result).toEqual({ success: true });
    expect(mockEmitToWorkspace).toHaveBeenCalledWith('ws1', 'workspace:member-removed', expect.any(Object));
  });

  it('member removes self', async () => {
    mockWorkspace.findUnique.mockResolvedValue(memberWorkspace('owner1', 'user2'));
    mockWorkspaceMember.deleteMany.mockResolvedValue({ count: 1 });

    const result = await removeMember('ws1', 'user2', 'user2');
    expect(result).toEqual({ success: true });
  });

  it('cannot remove owner', async () => {
    mockWorkspace.findUnique.mockResolvedValue(ownerWorkspace('owner1'));
    const result = await removeMember('ws1', 'owner1', 'owner1');
    expect(result.success).toBe(false);
    expect(result.error).toContain('owner');
  });

  it('non-admin cannot remove others', async () => {
    mockWorkspace.findUnique.mockResolvedValue(memberWorkspace('owner1', 'user2', 'VIEWER'));
    const result = await removeMember('ws1', 'user3', 'user2');
    expect(result.success).toBe(false);
    expect(result.error).toContain('permission');
  });
});

// =====================
// createInvitation
// =====================
describe('createInvitation', () => {
  it('creates invitation as owner', async () => {
    mockWorkspace.findUnique.mockResolvedValue(ownerWorkspace('user1'));
    mockInvitation.findFirst.mockResolvedValue(null);
    mockUser.findUnique.mockResolvedValue({ id: 'invitee1', email: 'invitee@test.com' });
    mockInvitation.create.mockResolvedValue({
      id: 'inv1',
      workspace: { name: 'Test Workspace' },
      inviter: { id: 'user1', name: 'Owner', email: 'owner@test.com' },
      invitee: { id: 'invitee1', name: 'Invitee', email: 'invitee@test.com' },
    });

    const result = await createInvitation('ws1', 'invitee@test.com', 'MEMBER', 'user1');
    expect(result.success).toBe(true);
    expect(result.invitation).toBeDefined();
  });

  it('returns error if not admin/owner', async () => {
    mockWorkspace.findUnique.mockResolvedValue(memberWorkspace('owner1', 'user2', 'VIEWER'));
    const result = await createInvitation('ws1', 'x@test.com', 'MEMBER', 'user2');
    expect(result.success).toBe(false);
    expect(result.error).toContain('permission');
  });

  it('only owner can invite as ADMIN', async () => {
    mockWorkspace.findUnique.mockResolvedValue(memberWorkspace('owner1', 'admin1', 'ADMIN'));
    const result = await createInvitation('ws1', 'x@test.com', 'ADMIN', 'admin1');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Only the owner');
  });

  it('returns error if already a member', async () => {
    const ws = ownerWorkspace('user1');
    ws.members.push({ userId: 'existing', role: 'MEMBER', user: { id: 'existing', name: 'E', email: 'existing@test.com' } });
    mockWorkspace.findUnique.mockResolvedValue(ws);

    const result = await createInvitation('ws1', 'existing@test.com', 'MEMBER', 'user1');
    expect(result.success).toBe(false);
    expect(result.error).toContain('already a member');
  });

  it('returns error if pending invitation exists', async () => {
    mockWorkspace.findUnique.mockResolvedValue(ownerWorkspace('user1'));
    mockInvitation.findFirst.mockResolvedValue({ id: 'inv-existing' });

    const result = await createInvitation('ws1', 'new@test.com', 'MEMBER', 'user1');
    expect(result.success).toBe(false);
    expect(result.error).toContain('already been sent');
  });
});

// =====================
// getPendingInvitations
// =====================
describe('getPendingInvitations', () => {
  it('returns pending invitations', async () => {
    mockUser.findUnique.mockResolvedValue({ id: 'user1', email: 'user@test.com' });
    const invitations = [{ id: 'inv1' }];
    mockInvitation.findMany.mockResolvedValue(invitations);

    const result = await getPendingInvitations('user1');
    expect(result).toEqual(invitations);
  });

  it('returns empty array if user not found', async () => {
    mockUser.findUnique.mockResolvedValue(null);
    const result = await getPendingInvitations('user1');
    expect(result).toEqual([]);
  });
});

// =====================
// respondToInvitation
// =====================
describe('respondToInvitation', () => {
  const pendingInvitation = {
    id: 'inv1',
    inviteeId: 'user1',
    inviteeEmail: 'user@test.com',
    status: 'PENDING',
    role: 'MEMBER',
    workspaceId: 'ws1',
    workspace: { id: 'ws1' },
    expiresAt: new Date(Date.now() + 86400000), // tomorrow
  };

  it('accepts invitation', async () => {
    mockInvitation.findUnique.mockResolvedValue(pendingInvitation);
    mockUser.findUnique.mockResolvedValue({ id: 'user1', email: 'user@test.com' });
    mockTransaction.mockResolvedValue([{}, {}]);

    const result = await respondToInvitation('inv1', 'user1', true);
    expect(result).toEqual({ success: true });
    expect(mockTransaction).toHaveBeenCalled();
    expect(mockEmitToWorkspace).toHaveBeenCalledWith('ws1', 'workspace:member-added', expect.any(Object));
  });

  it('declines invitation', async () => {
    mockInvitation.findUnique.mockResolvedValue(pendingInvitation);
    mockUser.findUnique.mockResolvedValue({ id: 'user1', email: 'user@test.com' });

    const result = await respondToInvitation('inv1', 'user1', false);
    expect(result).toEqual({ success: true });
    expect(mockInvitation.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'DECLINED' } }),
    );
    expect(mockEmitToWorkspace).not.toHaveBeenCalled();
  });

  it('returns error if invitation not found', async () => {
    mockInvitation.findUnique.mockResolvedValue(null);
    const result = await respondToInvitation('inv1', 'user1', true);
    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });

  it('returns error if invitation not for user', async () => {
    mockInvitation.findUnique.mockResolvedValue({ ...pendingInvitation, inviteeId: 'other', inviteeEmail: 'other@test.com' });
    mockUser.findUnique.mockResolvedValue({ id: 'user1', email: 'user@test.com' });

    const result = await respondToInvitation('inv1', 'user1', true);
    expect(result.success).toBe(false);
    expect(result.error).toContain('not for you');
  });

  it('returns error if already processed', async () => {
    mockInvitation.findUnique.mockResolvedValue({ ...pendingInvitation, status: 'ACCEPTED' });
    mockUser.findUnique.mockResolvedValue({ id: 'user1', email: 'user@test.com' });

    const result = await respondToInvitation('inv1', 'user1', true);
    expect(result.success).toBe(false);
    expect(result.error).toContain('already been processed');
  });

  it('returns error if expired', async () => {
    mockInvitation.findUnique.mockResolvedValue({
      ...pendingInvitation,
      expiresAt: new Date(Date.now() - 86400000), // yesterday
    });
    mockUser.findUnique.mockResolvedValue({ id: 'user1', email: 'user@test.com' });

    const result = await respondToInvitation('inv1', 'user1', true);
    expect(result.success).toBe(false);
    expect(result.error).toContain('expired');
  });
});

// =====================
// cancelInvitation
// =====================
describe('cancelInvitation', () => {
  it('cancels invitation as owner', async () => {
    mockInvitation.findUnique.mockResolvedValue({
      id: 'inv1',
      inviterId: 'other',
      workspace: { ownerId: 'user1', members: [{ userId: 'user1', role: 'ADMIN' }] },
    });
    mockInvitation.delete.mockResolvedValue({});

    const result = await cancelInvitation('inv1', 'user1');
    expect(result).toEqual({ success: true });
  });

  it('cancels invitation as inviter', async () => {
    mockInvitation.findUnique.mockResolvedValue({
      id: 'inv1',
      inviterId: 'user1',
      workspace: { ownerId: 'owner1', members: [{ userId: 'owner1', role: 'ADMIN' }] },
    });
    mockInvitation.delete.mockResolvedValue({});

    const result = await cancelInvitation('inv1', 'user1');
    expect(result).toEqual({ success: true });
  });

  it('returns error if no permission', async () => {
    mockInvitation.findUnique.mockResolvedValue({
      id: 'inv1',
      inviterId: 'other',
      workspace: { ownerId: 'owner1', members: [{ userId: 'owner1', role: 'ADMIN' }] },
    });

    const result = await cancelInvitation('inv1', 'stranger');
    expect(result.success).toBe(false);
    expect(result.error).toContain('permission');
  });

  it('returns error if invitation not found', async () => {
    mockInvitation.findUnique.mockResolvedValue(null);
    const result = await cancelInvitation('inv1', 'user1');
    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });
});

// =====================
// getWorkspaceBoards
// =====================
describe('getWorkspaceBoards', () => {
  it('returns boards for member', async () => {
    // getUserRole is called internally, which calls prisma.workspace.findUnique
    mockWorkspace.findUnique.mockResolvedValue({ id: 'ws1', ownerId: 'user1', members: [] });
    const boards = [{ id: 'b1', title: 'Board 1' }];
    mockBoard.findMany.mockResolvedValue(boards);

    const result = await getWorkspaceBoards('ws1', 'user1');
    expect(result).toEqual(boards);
  });

  it('returns empty array if no role', async () => {
    mockWorkspace.findUnique.mockResolvedValue(null);
    const result = await getWorkspaceBoards('ws1', 'user1');
    expect(result).toEqual([]);
  });
});

// =====================
// createBoardInWorkspace
// =====================
describe('createBoardInWorkspace', () => {
  it('creates board as member', async () => {
    mockWorkspace.findUnique.mockResolvedValue({
      id: 'ws1',
      ownerId: 'owner1',
      members: [{ userId: 'user1', role: 'MEMBER' }],
    });
    const board = { id: 'b1', title: 'New Board' };
    mockBoard.create.mockResolvedValue(board);

    const result = await createBoardInWorkspace('ws1', 'New Board', 'user1');
    expect(result).toEqual({ success: true, board });
    expect(mockEmitToWorkspace).toHaveBeenCalledWith('ws1', 'board:created', expect.any(Object));
  });

  it('denies viewer', async () => {
    mockWorkspace.findUnique.mockResolvedValue({
      id: 'ws1',
      ownerId: 'owner1',
      members: [{ userId: 'user1', role: 'VIEWER' }],
    });

    const result = await createBoardInWorkspace('ws1', 'Board', 'user1');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Viewers');
  });

  it('returns error if no access', async () => {
    mockWorkspace.findUnique.mockResolvedValue(null);
    const result = await createBoardInWorkspace('ws1', 'Board', 'user1');
    expect(result.success).toBe(false);
    expect(result.error).toContain('access');
  });
});

// =====================
// deleteBoardFromWorkspace
// =====================
describe('deleteBoardFromWorkspace', () => {
  it('deletes board as admin', async () => {
    mockBoard.findUnique.mockResolvedValue({
      id: 'b1',
      workspaceId: 'ws1',
      workspace: { ownerId: 'user1', members: [{ userId: 'user1', role: 'ADMIN' }] },
    });
    mockBoard.delete.mockResolvedValue({});

    const result = await deleteBoardFromWorkspace('b1', 'user1');
    expect(result).toEqual({ success: true });
    expect(mockEmitToWorkspace).toHaveBeenCalledWith('ws1', 'board:deleted', { workspaceId: 'ws1', boardId: 'b1' });
  });

  it('returns error if not admin', async () => {
    mockBoard.findUnique.mockResolvedValue({
      id: 'b1',
      workspaceId: 'ws1',
      workspace: { ownerId: 'owner1', members: [{ userId: 'user2', role: 'MEMBER' }] },
    });

    const result = await deleteBoardFromWorkspace('b1', 'user2');
    expect(result.success).toBe(false);
    expect(result.error).toContain('admin');
  });

  it('returns error if board not found', async () => {
    mockBoard.findUnique.mockResolvedValue(null);
    const result = await deleteBoardFromWorkspace('b1', 'user1');
    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });
});

// =====================
// Error path tests (catch blocks)
// =====================

describe('getWorkspaceDetails - error path', () => {
  it('returns null on database error', async () => {
    mockWorkspace.findUnique.mockRejectedValue(new Error('DB error'));
    const result = await getWorkspaceDetails('ws1', 'user1');
    expect(result).toBeNull();
  });
});

describe('updateWorkspace - error path', () => {
  it('returns error on database error', async () => {
    mockWorkspace.findUnique.mockResolvedValue(ownerWorkspace('user1'));
    mockWorkspace.update.mockRejectedValue(new Error('DB error'));
    const result = await updateWorkspace('ws1', 'user1', { name: 'X' });
    expect(result.success).toBe(false);
  });
});

describe('deleteWorkspace - error path', () => {
  it('returns error on database error', async () => {
    mockWorkspace.findUnique.mockResolvedValue({ id: 'ws1', ownerId: 'user1' });
    mockWorkspace.delete.mockRejectedValue(new Error('DB error'));
    const result = await deleteWorkspace('ws1', 'user1');
    expect(result.success).toBe(false);
  });
});

describe('getUserRole - error path', () => {
  it('returns null on database error', async () => {
    mockWorkspace.findUnique.mockRejectedValue(new Error('DB error'));
    const result = await getUserRole('ws1', 'user1');
    expect(result).toBeNull();
  });
});

describe('updateMemberRole - error path', () => {
  it('returns error on database error', async () => {
    mockWorkspace.findUnique.mockResolvedValue(memberWorkspace('user1', 'user2', 'MEMBER'));
    mockWorkspaceMember.updateMany.mockRejectedValue(new Error('DB error'));
    const result = await updateMemberRole('ws1', 'user2', 'ADMIN', 'user1');
    expect(result.success).toBe(false);
  });
});

describe('removeMember - error path', () => {
  it('returns error on database error', async () => {
    mockWorkspace.findUnique.mockResolvedValue(memberWorkspace('user1', 'user2'));
    mockWorkspaceMember.deleteMany.mockRejectedValue(new Error('DB error'));
    const result = await removeMember('ws1', 'user2', 'user1');
    expect(result.success).toBe(false);
  });
});

describe('createInvitation - error path', () => {
  it('returns error on database error', async () => {
    mockWorkspace.findUnique.mockRejectedValue(new Error('DB error'));
    const result = await createInvitation('ws1', 'x@test.com', 'MEMBER', 'user1');
    expect(result.success).toBe(false);
  });
});

describe('getPendingInvitations - error path', () => {
  it('returns empty array on database error', async () => {
    mockUser.findUnique.mockRejectedValue(new Error('DB error'));
    const result = await getPendingInvitations('user1');
    expect(result).toEqual([]);
  });
});

describe('respondToInvitation - error path', () => {
  it('returns error on database error', async () => {
    mockInvitation.findUnique.mockRejectedValue(new Error('DB error'));
    const result = await respondToInvitation('inv1', 'user1', true);
    expect(result.success).toBe(false);
  });
});

describe('cancelInvitation - error path', () => {
  it('returns error on database error', async () => {
    mockInvitation.findUnique.mockRejectedValue(new Error('DB error'));
    const result = await cancelInvitation('inv1', 'user1');
    expect(result.success).toBe(false);
  });
});

describe('getWorkspaceBoards - error path', () => {
  it('returns empty array on database error', async () => {
    mockWorkspace.findUnique.mockRejectedValue(new Error('DB error'));
    const result = await getWorkspaceBoards('ws1', 'user1');
    expect(result).toEqual([]);
  });
});

describe('createBoardInWorkspace - error path', () => {
  it('returns error on database error', async () => {
    mockWorkspace.findUnique.mockRejectedValue(new Error('DB error'));
    const result = await createBoardInWorkspace('ws1', 'Board', 'user1');
    expect(result.success).toBe(false);
  });
});

describe('deleteBoardFromWorkspace - error path', () => {
  it('returns error on database error', async () => {
    mockBoard.findUnique.mockRejectedValue(new Error('DB error'));
    const result = await deleteBoardFromWorkspace('b1', 'user1');
    expect(result.success).toBe(false);
  });
});

// =====================
// Additional branch coverage tests
// =====================

describe('getUserRole - branch coverage', () => {
  it('returns null when member has falsy role (|| null branch)', async () => {
    mockWorkspace.findUnique.mockResolvedValue({
      id: 'ws1',
      ownerId: 'otherOwner',
      members: [{ userId: 'user1', role: undefined }],
    });
    const result = await getUserRole('ws1', 'user1');
    expect(result).toBeNull();
  });
});

describe('updateMemberRole - branch coverage', () => {
  it('returns error when workspace not found', async () => {
    mockWorkspace.findUnique.mockResolvedValue(null);
    const result = await updateMemberRole('ws1', 'user2', 'MEMBER', 'user1');
    expect(result).toEqual({ success: false, error: 'Workspace not found' });
  });
});

describe('removeMember - branch coverage', () => {
  it('returns error when workspace not found', async () => {
    mockWorkspace.findUnique.mockResolvedValue(null);
    const result = await removeMember('ws1', 'user2', 'user1');
    expect(result).toEqual({ success: false, error: 'Workspace not found' });
  });
});

describe('createInvitation - branch coverage', () => {
  it('returns error when workspace not found', async () => {
    mockWorkspace.findUnique.mockResolvedValue(null);
    const result = await createInvitation('ws1', 'x@test.com', 'MEMBER', 'user1');
    expect(result).toEqual({ success: false, error: 'Workspace not found' });
  });

  it('skips notification when invitee user does not exist', async () => {
    mockWorkspace.findUnique.mockResolvedValue(ownerWorkspace('user1'));
    mockInvitation.findFirst.mockResolvedValue(null);
    mockUser.findUnique.mockResolvedValue(null); // invitee doesn't exist
    mockInvitation.create.mockResolvedValue({
      id: 'inv1',
      workspace: { name: 'Test Workspace' },
      inviter: { id: 'user1', name: 'Owner', email: 'owner@test.com' },
      invitee: null,
    });

    const result = await createInvitation('ws1', 'nonexistent@test.com', 'MEMBER', 'user1');
    expect(result.success).toBe(true);
    const { createNotification } = require('../../app/actions/notificationActions');
    expect(createNotification).not.toHaveBeenCalled();
  });
});

describe('respondToInvitation - branch coverage', () => {
  it('returns error when user not found', async () => {
    mockInvitation.findUnique.mockResolvedValue({
      id: 'inv1',
      inviteeId: 'user1',
      inviteeEmail: 'user@test.com',
      status: 'PENDING',
      role: 'MEMBER',
      workspaceId: 'ws1',
      workspace: { id: 'ws1' },
      expiresAt: new Date(Date.now() + 86400000),
    });
    mockUser.findUnique.mockResolvedValue(null);

    const result = await respondToInvitation('inv1', 'user1', true);
    expect(result).toEqual({ success: false, error: 'User not found' });
  });
});
