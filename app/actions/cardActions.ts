"use server";

import { prisma } from '@/lib/prisma';
import { emitToBoard } from '@/lib/socket';
import { MemberRole } from '@/types';
import { createNotification } from './notificationActions';

// Helper to get boardId from taskId
async function getBoardIdFromTask(taskId: string): Promise<string | null> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { list: { select: { boardId: true } } }
  });
  return task?.list.boardId || null;
}

// Helper to get user's role in the workspace that owns the board
async function getUserRoleInBoard(boardId: string, userId: string): Promise<MemberRole | null> {
  try {
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      include: {
        workspace: {
          include: {
            members: { where: { userId } }
          }
        }
      }
    });

    if (!board) return null;
    if (board.workspace.ownerId === userId) return 'ADMIN' as MemberRole;

    const member = board.workspace.members[0];
    return (member?.role as MemberRole) || null;
  } catch (error) {
    console.error("Failed to get user role:", error);
    return null;
  }
}

// Helper to get boardId and taskId from checklistId
async function getBoardAndTaskFromChecklist(checklistId: string): Promise<{ boardId: string; taskId: string } | null> {
  const checklist = await prisma.checklist.findUnique({
    where: { id: checklistId },
    include: { task: { include: { list: { select: { boardId: true } } } } }
  });
  if (!checklist) return null;
  return { boardId: checklist.task.list.boardId, taskId: checklist.taskId };
}

// Helper to get boardId and taskId from checklistItemId
async function getBoardAndTaskFromChecklistItem(itemId: string): Promise<{ boardId: string; taskId: string; checklistId: string } | null> {
  const item = await prisma.checklistItem.findUnique({
    where: { id: itemId },
    include: { checklist: { include: { task: { include: { list: { select: { boardId: true } } } } } } }
  });
  if (!item) return null;
  return {
    boardId: item.checklist.task.list.boardId,
    taskId: item.checklist.taskId,
    checklistId: item.checklistId
  };
}

// =====================
// TASK DETAILS
// =====================

export async function getTaskDetails(taskId: string) {
  try {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignees: {
          include: {
            user: { select: { id: true, name: true, email: true } }
          }
        },
        labels: {
          include: {
            label: true
          }
        },
        checklists: {
          include: {
            items: { orderBy: { order: 'asc' } }
          },
          orderBy: { createdAt: 'asc' }
        },
        comments: {
          include: {
            user: { select: { id: true, name: true, email: true } }
          },
          orderBy: { createdAt: 'desc' }
        },
        list: {
          include: {
            board: {
              include: {
                labels: true,
                workspace: {
                  include: {
                    members: {
                      include: {
                        user: { select: { id: true, name: true, email: true } }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
    return task;
  } catch (error) {
    console.error("Failed to fetch task details:", error);
    return null;
  }
}

export async function updateTaskDetails(
  taskId: string,
  data: {
    title?: string;
    description?: string;
    startDate?: Date | null;
    dueDate?: Date | null;
  },
  userId: string
) {
  try {
    const boardId = await getBoardIdFromTask(taskId);
    if (!boardId) return { success: false };

    const role = await getUserRoleInBoard(boardId, userId);

    if (!role) return { success: false, error: "You don't have access to this board" };
    if (role === 'VIEWER') return { success: false, error: "Viewers cannot update tasks" };

    const task = await prisma.task.update({
      where: { id: taskId },
      data,
      include: { list: { select: { boardId: true } } }
    });

    // Emit real-time event
    emitToBoard(task.list.boardId, 'task:updated', { boardId: task.list.boardId, taskId, data });

    return { success: true, task };
  } catch (error) {
    console.error("Failed to update task:", error);
    return { success: false };
  }
}

// =====================
// ASSIGNEES
// =====================

export async function addAssignee(taskId: string, assigneeUserId: string, currentUserId: string) {
  try {
    const boardId = await getBoardIdFromTask(taskId);
    if (!boardId) return { success: false };

    const role = await getUserRoleInBoard(boardId, currentUserId);

    if (!role) return { success: false, error: "You don't have access to this board" };
    if (role === 'VIEWER') return { success: false, error: "Viewers cannot add assignees" };

    await prisma.taskAssignee.create({
      data: { taskId, userId: assigneeUserId }
    });

    emitToBoard(boardId, 'task:assignee-added', { boardId, taskId, userId: assigneeUserId });

    // Create notification for the assigned user (skip self-assignment)
    if (assigneeUserId !== currentUserId) {
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        select: {
          title: true,
          list: { select: { board: { select: { title: true } } } }
        }
      });

      if (task) {
        await createNotification({
          type: 'TASK_ASSIGNED',
          message: `Vous avez été assigné à "${task.title}" (Board: ${task.list.board.title})`,
          userId: assigneeUserId,
          taskId,
          actorId: currentUserId,
        });
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to add assignee:", error);
    return { success: false };
  }
}

export async function removeAssignee(taskId: string, assigneeUserId: string, currentUserId: string) {
  try {
    const boardId = await getBoardIdFromTask(taskId);
    if (!boardId) return { success: false };

    const role = await getUserRoleInBoard(boardId, currentUserId);

    if (!role) return { success: false, error: "You don't have access to this board" };
    if (role === 'VIEWER') return { success: false, error: "Viewers cannot remove assignees" };

    await prisma.taskAssignee.deleteMany({
      where: { taskId, userId: assigneeUserId }
    });

    emitToBoard(boardId, 'task:assignee-removed', { boardId, taskId, userId: assigneeUserId });

    return { success: true };
  } catch (error) {
    console.error("Failed to remove assignee:", error);
    return { success: false };
  }
}

// =====================
// LABELS
// =====================

export async function addLabelToTask(taskId: string, labelId: string, userId: string) {
  try {
    const boardId = await getBoardIdFromTask(taskId);
    if (!boardId) return { success: false };

    const role = await getUserRoleInBoard(boardId, userId);

    if (!role) return { success: false, error: "You don't have access to this board" };
    if (role === 'VIEWER') return { success: false, error: "Viewers cannot add labels" };

    const taskLabel = await prisma.taskLabel.create({
      data: { taskId, labelId },
      include: { label: true }
    });

    emitToBoard(boardId, 'task:label-added', { boardId, taskId, labelId, label: taskLabel.label });

    return { success: true };
  } catch (error) {
    console.error("Failed to add label to task:", error);
    return { success: false };
  }
}

export async function removeLabelFromTask(taskId: string, labelId: string, userId: string) {
  try {
    const boardId = await getBoardIdFromTask(taskId);
    if (!boardId) return { success: false };

    const role = await getUserRoleInBoard(boardId, userId);

    if (!role) return { success: false, error: "You don't have access to this board" };
    if (role === 'VIEWER') return { success: false, error: "Viewers cannot remove labels" };

    await prisma.taskLabel.deleteMany({
      where: { taskId, labelId }
    });

    emitToBoard(boardId, 'task:label-removed', { boardId, taskId, labelId });

    return { success: true };
  } catch (error) {
    console.error("Failed to remove label from task:", error);
    return { success: false };
  }
}

// =====================
// BOARD LABELS (Types)
// =====================

export async function getBoardLabels(boardId: string) {
  try {
    const labels = await prisma.boardLabel.findMany({
      where: { boardId },
      orderBy: { createdAt: 'asc' }
    });
    return labels;
  } catch (error) {
    console.error("Failed to fetch board labels:", error);
    return [];
  }
}

export async function createBoardLabel(boardId: string, name: string, color: string, userId: string) {
  try {
    const role = await getUserRoleInBoard(boardId, userId);

    if (!role) return { success: false, error: "You don't have access to this board" };
    if (role === 'VIEWER') return { success: false, error: "Viewers cannot create labels" };

    const label = await prisma.boardLabel.create({
      data: { boardId, name, color }
    });

    emitToBoard(boardId, 'board:label-created', { boardId, label });

    return { success: true, label };
  } catch (error) {
    console.error("Failed to create board label:", error);
    return { success: false };
  }
}

export async function updateBoardLabel(labelId: string, data: { name?: string; color?: string }, userId: string) {
  try {
    const existingLabel = await prisma.boardLabel.findUnique({ where: { id: labelId } });
    if (!existingLabel) return { success: false };

    const role = await getUserRoleInBoard(existingLabel.boardId, userId);

    if (!role) return { success: false, error: "You don't have access to this board" };
    if (role === 'VIEWER') return { success: false, error: "Viewers cannot update labels" };

    const label = await prisma.boardLabel.update({
      where: { id: labelId },
      data
    });

    emitToBoard(label.boardId, 'board:label-updated', { boardId: label.boardId, label });

    return { success: true, label };
  } catch (error) {
    console.error("Failed to update board label:", error);
    return { success: false };
  }
}

export async function deleteBoardLabel(labelId: string, userId: string) {
  try {
    const label = await prisma.boardLabel.findUnique({ where: { id: labelId } });
    if (!label) return { success: false };

    const role = await getUserRoleInBoard(label.boardId, userId);

    if (!role) return { success: false, error: "You don't have access to this board" };
    if (role === 'VIEWER') return { success: false, error: "Viewers cannot delete labels" };

    await prisma.boardLabel.delete({ where: { id: labelId } });

    emitToBoard(label.boardId, 'board:label-deleted', { boardId: label.boardId, labelId });

    return { success: true };
  } catch (error) {
    console.error("Failed to delete board label:", error);
    return { success: false };
  }
}

// =====================
// CHECKLISTS
// =====================

export async function createChecklist(taskId: string, title: string, userId: string) {
  try {
    const boardId = await getBoardIdFromTask(taskId);
    if (!boardId) return { success: false };

    const role = await getUserRoleInBoard(boardId, userId);

    if (!role) return { success: false, error: "You don't have access to this board" };
    if (role === 'VIEWER') return { success: false, error: "Viewers cannot create checklists" };

    const checklist = await prisma.checklist.create({
      data: { taskId, title },
      include: { items: true }
    });

    emitToBoard(boardId, 'task:checklist-created', { boardId, taskId, checklist });

    return { success: true, checklist };
  } catch (error) {
    console.error("Failed to create checklist:", error);
    return { success: false };
  }
}

export async function deleteChecklist(checklistId: string, userId: string) {
  try {
    const info = await getBoardAndTaskFromChecklist(checklistId);
    if (!info) return { success: false };

    const role = await getUserRoleInBoard(info.boardId, userId);

    if (!role) return { success: false, error: "You don't have access to this board" };
    if (role === 'VIEWER') return { success: false, error: "Viewers cannot delete checklists" };

    await prisma.checklist.delete({ where: { id: checklistId } });

    emitToBoard(info.boardId, 'task:checklist-deleted', { boardId: info.boardId, taskId: info.taskId, checklistId });

    return { success: true };
  } catch (error) {
    console.error("Failed to delete checklist:", error);
    return { success: false };
  }
}

export async function addChecklistItem(checklistId: string, title: string, userId: string) {
  try {
    const info = await getBoardAndTaskFromChecklist(checklistId);
    if (!info) return { success: false };

    const role = await getUserRoleInBoard(info.boardId, userId);

    if (!role) return { success: false, error: "You don't have access to this board" };
    if (role === 'VIEWER') return { success: false, error: "Viewers cannot add checklist items" };

    const lastItem = await prisma.checklistItem.findFirst({
      where: { checklistId },
      orderBy: { order: 'desc' }
    });
    const newOrder = lastItem ? lastItem.order + 1 : 0;

    const item = await prisma.checklistItem.create({
      data: { checklistId, title, order: newOrder }
    });

    emitToBoard(info.boardId, 'task:checklist-item-added', { boardId: info.boardId, taskId: info.taskId, checklistId, item });

    return { success: true, item };
  } catch (error) {
    console.error("Failed to add checklist item:", error);
    return { success: false };
  }
}

export async function updateChecklistItem(itemId: string, data: { title?: string; isChecked?: boolean }, userId: string) {
  try {
    const info = await getBoardAndTaskFromChecklistItem(itemId);
    if (!info) return { success: false };

    const role = await getUserRoleInBoard(info.boardId, userId);

    if (!role) return { success: false, error: "You don't have access to this board" };
    if (role === 'VIEWER') return { success: false, error: "Viewers cannot update checklist items" };

    const item = await prisma.checklistItem.update({
      where: { id: itemId },
      data
    });

    emitToBoard(info.boardId, 'task:checklist-item-updated', { boardId: info.boardId, taskId: info.taskId, checklistId: info.checklistId, itemId, data });

    return { success: true, item };
  } catch (error) {
    console.error("Failed to update checklist item:", error);
    return { success: false };
  }
}

export async function deleteChecklistItem(itemId: string, userId: string) {
  try {
    const info = await getBoardAndTaskFromChecklistItem(itemId);
    if (!info) return { success: false };

    const role = await getUserRoleInBoard(info.boardId, userId);

    if (!role) return { success: false, error: "You don't have access to this board" };
    if (role === 'VIEWER') return { success: false, error: "Viewers cannot delete checklist items" };

    await prisma.checklistItem.delete({ where: { id: itemId } });

    emitToBoard(info.boardId, 'task:checklist-item-deleted', { boardId: info.boardId, taskId: info.taskId, checklistId: info.checklistId, itemId });

    return { success: true };
  } catch (error) {
    console.error("Failed to delete checklist item:", error);
    return { success: false };
  }
}

// =====================
// COMMENTS
// =====================

export async function addComment(taskId: string, userId: string, text: string) {
  try {
    const boardId = await getBoardIdFromTask(taskId);
    
    const comment = await prisma.comment.create({
      data: { taskId, userId, text },
      include: {
        user: { select: { id: true, name: true, email: true } }
      }
    });
    
    if (boardId) {
      emitToBoard(boardId, 'task:comment-added', { boardId, taskId, comment });
    }
    
    return { success: true, comment };
  } catch (error) {
    console.error("Failed to add comment:", error);
    return { success: false };
  }
}

export async function deleteComment(commentId: string, userId: string) {
  try {
    // Only allow deleting own comments
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: { task: { include: { list: { select: { boardId: true } } } } }
    });
    
    if (!comment || comment.userId !== userId) {
      return { success: false, error: "Cannot delete this comment" };
    }

    await prisma.comment.delete({ where: { id: commentId } });
    
    const boardId = comment.task.list.boardId;
    emitToBoard(boardId, 'task:comment-deleted', { boardId, taskId: comment.taskId, commentId });
    
    return { success: true };
  } catch (error) {
    console.error("Failed to delete comment:", error);
    return { success: false };
  }
}

// =====================
// BOARD SETTINGS
// =====================

export async function updateBoardSettings(
  boardId: string,
  data: {
    title?: string;
    color?: string;
    backgroundImage?: string | null;
  },
  userId: string
) {
  try {
    const role = await getUserRoleInBoard(boardId, userId);

    if (!role) return { success: false, error: "You don't have access to this board" };
    if (role === 'VIEWER' || role === 'MEMBER') {
      return { success: false, error: "Only admins can change board settings" };
    }

    const board = await prisma.board.update({
      where: { id: boardId },
      data
    });

    emitToBoard(boardId, 'board:settings-changed', { boardId, data });

    return { success: true, board };
  } catch (error) {
    console.error("Failed to update board settings:", error);
    return { success: false };
  }
}

export async function getBoardWithLabels(boardId: string) {
  try {
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      include: {
        labels: { orderBy: { createdAt: 'asc' } },
        workspace: {
          include: {
            members: {
              include: {
                user: { select: { id: true, name: true, email: true } }
              }
            }
          }
        }
      }
    });
    return board;
  } catch (error) {
    console.error("Failed to fetch board with labels:", error);
    return null;
  }
}
