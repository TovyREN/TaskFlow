"use server";

import { prisma } from '@/lib/prisma';
import { MemberRole } from '@/types';
import { emitToWorkspace } from '@/lib/socket';

// Type for workspace member with user
type WorkspaceMemberWithUser = {
  id: string;
  userId: string;
  role: string;
  user?: { id: string; name: string | null; email: string } | null;
};

// =====================
// WORKSPACE CRUD
// =====================

export async function getWorkspaces(userId: string) {
  try {
    // Get workspaces where user is owner or member
    const workspaces = await prisma.workspace.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } }
        ]
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true }
        },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } }
          }
        },
        _count: { select: { boards: true, members: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    return workspaces;
  } catch (error) {
    console.error("Failed to fetch workspaces:", error);
    return [];
  }
}

export async function getWorkspaceDetails(workspaceId: string, userId: string) {
  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } }
          },
          orderBy: { joinedAt: 'asc' }
        },
        boards: { orderBy: { createdAt: 'desc' } },
        invitations: {
          where: { status: 'PENDING' },
          include: {
            inviter: { select: { id: true, name: true, email: true } },
            invitee: { select: { id: true, name: true, email: true } }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!workspace) return null;

    // Check if user has access
    const hasAccess = workspace.ownerId === userId || 
      workspace.members.some((m: WorkspaceMemberWithUser) => m.userId === userId);
    
    if (!hasAccess) return null;

    return workspace;
  } catch (error) {
    console.error("Failed to fetch workspace details:", error);
    return null;
  }
}

export async function createWorkspace(name: string, userId: string, description?: string, color?: string) {
  try {
    const workspace = await prisma.workspace.create({
      data: {
        name,
        description,
        color: color || '#3b82f6',
        ownerId: userId,
        // Automatically add owner as ADMIN member
        members: {
          create: {
            userId,
            role: 'ADMIN'
          }
        }
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } }
          }
        },
        _count: { select: { boards: true, members: true } }
      }
    });
    return { success: true, workspace };
  } catch (error) {
    console.error("Failed to create workspace:", error);
    return { success: false, error: "Failed to create workspace" };
  }
}

export async function updateWorkspace(
  workspaceId: string, 
  userId: string, 
  data: { name?: string; description?: string; color?: string }
) {
  try {
    // Check if user is owner or admin
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { members: true }
    });

    if (!workspace) return { success: false, error: "Workspace not found" };

    const isOwner = workspace.ownerId === userId;
    const isAdmin = workspace.members.some((m: WorkspaceMemberWithUser) => m.userId === userId && m.role === 'ADMIN');

    if (!isOwner && !isAdmin) {
      return { success: false, error: "You don't have permission to update this workspace" };
    }

    const updated = await prisma.workspace.update({
      where: { id: workspaceId },
      data
    });

    return { success: true, workspace: updated };
  } catch (error) {
    console.error("Failed to update workspace:", error);
    return { success: false, error: "Failed to update workspace" };
  }
}

export async function deleteWorkspace(workspaceId: string, userId: string) {
  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId }
    });

    if (!workspace) return { success: false, error: "Workspace not found" };
    if (workspace.ownerId !== userId) {
      return { success: false, error: "Only the owner can delete a workspace" };
    }

    await prisma.workspace.delete({ where: { id: workspaceId } });
    return { success: true };
  } catch (error) {
    console.error("Failed to delete workspace:", error);
    return { success: false, error: "Failed to delete workspace" };
  }
}

// =====================
// MEMBER MANAGEMENT
// =====================

export async function getUserRole(workspaceId: string, userId: string) {
  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { members: { where: { userId } } }
    });

    if (!workspace) return null;
    if (workspace.ownerId === userId) return 'ADMIN' as MemberRole;
    
    const member = workspace.members[0];
    return member?.role || null;
  } catch (error) {
    console.error("Failed to get user role:", error);
    return null;
  }
}

export async function updateMemberRole(
  workspaceId: string, 
  targetUserId: string, 
  newRole: MemberRole, 
  currentUserId: string
) {
  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { members: true }
    });

    if (!workspace) return { success: false, error: "Workspace not found" };

    // Check permissions
    const isOwner = workspace.ownerId === currentUserId;
    const isAdmin = workspace.members.some((m: WorkspaceMemberWithUser) => m.userId === currentUserId && m.role === 'ADMIN');

    if (!isOwner && !isAdmin) {
      return { success: false, error: "You don't have permission to change roles" };
    }

    // Can't change owner's role
    if (targetUserId === workspace.ownerId) {
      return { success: false, error: "Cannot change the owner's role" };
    }

    // Only owner can make someone admin
    if (newRole === 'ADMIN' && !isOwner) {
      return { success: false, error: "Only the owner can promote to admin" };
    }

    await prisma.workspaceMember.updateMany({
      where: { workspaceId, userId: targetUserId },
      data: { role: newRole }
    });

    // Emit real-time event
    emitToWorkspace(workspaceId, 'workspace:member-role-changed', {
      workspaceId,
      userId: targetUserId,
      newRole
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to update member role:", error);
    return { success: false, error: "Failed to update member role" };
  }
}

export async function removeMember(workspaceId: string, targetUserId: string, currentUserId: string) {
  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { members: true }
    });

    if (!workspace) return { success: false, error: "Workspace not found" };

    // Check permissions
    const isOwner = workspace.ownerId === currentUserId;
    const isAdmin = workspace.members.some((m: WorkspaceMemberWithUser) => m.userId === currentUserId && m.role === 'ADMIN');
    const isSelf = targetUserId === currentUserId;

    // Users can remove themselves (leave), admins/owners can remove others
    if (!isSelf && !isOwner && !isAdmin) {
      return { success: false, error: "You don't have permission to remove members" };
    }

    // Can't remove the owner
    if (targetUserId === workspace.ownerId) {
      return { success: false, error: "Cannot remove the workspace owner" };
    }

    await prisma.workspaceMember.deleteMany({
      where: { workspaceId, userId: targetUserId }
    });

    // Emit real-time event
    emitToWorkspace(workspaceId, 'workspace:member-removed', { workspaceId, userId: targetUserId });

    return { success: true };
  } catch (error) {
    console.error("Failed to remove member:", error);
    return { success: false, error: "Failed to remove member" };
  }
}

// =====================
// INVITATION MANAGEMENT
// =====================

export async function createInvitation(
  workspaceId: string, 
  inviteeEmail: string, 
  role: MemberRole, 
  inviterId: string
) {
  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { members: true }
    });

    if (!workspace) return { success: false, error: "Workspace not found" };

    // Check permissions (only admins and owners can invite)
    const isOwner = workspace.ownerId === inviterId;
    const isAdmin = workspace.members.some((m: WorkspaceMemberWithUser) => m.userId === inviterId && m.role === 'ADMIN');

    if (!isOwner && !isAdmin) {
      return { success: false, error: "You don't have permission to invite members" };
    }

    // Only owner can invite as admin
    if (role === 'ADMIN' && !isOwner) {
      return { success: false, error: "Only the owner can invite as admin" };
    }

    // Check if user is already a member
    const existingMember = workspace.members.find((m: WorkspaceMemberWithUser) => m.user?.email === inviteeEmail);
    if (existingMember) {
      return { success: false, error: "User is already a member of this workspace" };
    }

    // Check if there's already a pending invitation
    const existingInvitation = await prisma.workspaceInvitation.findFirst({
      where: { workspaceId, inviteeEmail, status: 'PENDING' }
    });

    if (existingInvitation) {
      return { success: false, error: "An invitation has already been sent to this email" };
    }

    // Check if user exists
    const invitee = await prisma.user.findUnique({ where: { email: inviteeEmail } });

    const invitation = await prisma.workspaceInvitation.create({
      data: {
        workspaceId,
        inviterId,
        inviteeId: invitee?.id,
        inviteeEmail,
        role,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      },
      include: {
        workspace: { select: { name: true } },
        inviter: { select: { id: true, name: true, email: true } },
        invitee: { select: { id: true, name: true, email: true } }
      }
    });

    return { success: true, invitation };
  } catch (error) {
    console.error("Failed to create invitation:", error);
    return { success: false, error: "Failed to create invitation" };
  }
}

export async function getPendingInvitations(userId: string) {
  try {
    // Get email of user
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return [];

    const invitations = await prisma.workspaceInvitation.findMany({
      where: {
        OR: [
          { inviteeId: userId },
          { inviteeEmail: user.email }
        ],
        status: 'PENDING'
      },
      include: {
        workspace: { select: { id: true, name: true, color: true } },
        inviter: { select: { id: true, name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return invitations;
  } catch (error) {
    console.error("Failed to fetch pending invitations:", error);
    return [];
  }
}

export async function respondToInvitation(
  invitationId: string, 
  userId: string, 
  accept: boolean
) {
  try {
    const invitation = await prisma.workspaceInvitation.findUnique({
      where: { id: invitationId },
      include: { workspace: true }
    });

    if (!invitation) return { success: false, error: "Invitation not found" };

    // Verify this invitation is for this user
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return { success: false, error: "User not found" };

    if (invitation.inviteeId !== userId && invitation.inviteeEmail !== user.email) {
      return { success: false, error: "This invitation is not for you" };
    }

    if (invitation.status !== 'PENDING') {
      return { success: false, error: "Invitation has already been processed" };
    }

    // Check if expired
    if (invitation.expiresAt && new Date() > invitation.expiresAt) {
      await prisma.workspaceInvitation.update({
        where: { id: invitationId },
        data: { status: 'DECLINED' }
      });
      return { success: false, error: "Invitation has expired" };
    }

    if (accept) {
      // Add user to workspace
      await prisma.$transaction([
        prisma.workspaceMember.create({
          data: {
            workspaceId: invitation.workspaceId,
            userId,
            role: invitation.role
          }
        }),
        prisma.workspaceInvitation.update({
          where: { id: invitationId },
          data: { status: 'ACCEPTED', inviteeId: userId }
        })
      ]);
      
      // Emit real-time event for member added
      emitToWorkspace(invitation.workspaceId, 'workspace:member-added', { 
        workspaceId: invitation.workspaceId, 
        userId, 
        role: invitation.role 
      });
    } else {
      await prisma.workspaceInvitation.update({
        where: { id: invitationId },
        data: { status: 'DECLINED' }
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to respond to invitation:", error);
    return { success: false, error: "Failed to process invitation" };
  }
}

export async function cancelInvitation(invitationId: string, userId: string) {
  try {
    const invitation = await prisma.workspaceInvitation.findUnique({
      where: { id: invitationId },
      include: {
        workspace: { include: { members: true } }
      }
    });

    if (!invitation) return { success: false, error: "Invitation not found" };

    // Check permissions
    const isOwner = invitation.workspace.ownerId === userId;
    const isAdmin = invitation.workspace.members.some((m: WorkspaceMemberWithUser) => m.userId === userId && m.role === 'ADMIN');
    const isInviter = invitation.inviterId === userId;

    if (!isOwner && !isAdmin && !isInviter) {
      return { success: false, error: "You don't have permission to cancel this invitation" };
    }

    await prisma.workspaceInvitation.delete({ where: { id: invitationId } });
    return { success: true };
  } catch (error) {
    console.error("Failed to cancel invitation:", error);
    return { success: false, error: "Failed to cancel invitation" };
  }
}

// =====================
// BOARD MANAGEMENT (within workspace)
// =====================

export async function getWorkspaceBoards(workspaceId: string, userId: string) {
  try {
    // Check if user has access to workspace
    const role = await getUserRole(workspaceId, userId);
    if (!role) return [];

    const boards = await prisma.board.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' }
    });

    return boards;
  } catch (error) {
    console.error("Failed to fetch workspace boards:", error);
    return [];
  }
}

export async function createBoardInWorkspace(
  workspaceId: string, 
  title: string, 
  userId: string, 
  color?: string
) {
  try {
    const role = await getUserRole(workspaceId, userId);
    
    if (!role) return { success: false, error: "You don't have access to this workspace" };
    if (role === 'VIEWER') return { success: false, error: "Viewers cannot create boards" };

    const board = await prisma.board.create({
      data: {
        title,
        color: color || '#3b82f6',
        workspaceId
      }
    });

    // Emit real-time event
    emitToWorkspace(workspaceId, 'board:created', { workspaceId, board });

    return { success: true, board };
  } catch (error) {
    console.error("Failed to create board:", error);
    return { success: false, error: "Failed to create board" };
  }
}

export async function deleteBoardFromWorkspace(boardId: string, userId: string) {
  try {
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      include: { workspace: { include: { members: true } } }
    });

    if (!board) return { success: false, error: "Board not found" };

    const isOwner = board.workspace.ownerId === userId;
    const isAdmin = board.workspace.members.some((m: WorkspaceMemberWithUser) => m.userId === userId && m.role === 'ADMIN');

    if (!isOwner && !isAdmin) {
      return { success: false, error: "Only admins can delete boards" };
    }

    const workspaceId = board.workspaceId;
    
    await prisma.board.delete({ where: { id: boardId } });
    
    // Emit real-time event
    emitToWorkspace(workspaceId, 'board:deleted', { workspaceId, boardId });
    
    return { success: true };
  } catch (error) {
    console.error("Failed to delete board:", error);
    return { success: false, error: "Failed to delete board" };
  }
}
