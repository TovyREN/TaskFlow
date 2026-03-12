"use server";

import { prisma } from '@/lib/prisma';
import { emitToBoard } from '@/lib/socket';
import { MemberRole } from '@/types';

// NOTE: getBoards and createBoard have been moved to workspaceActions.ts
// since boards now belong to workspaces, not users directly

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

// Fetch a single board with its lists and tasks
export async function getBoardDetails(boardId: string) {
  try {
    const board = await prisma.board.findUnique({
      where: { id: boardId },
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
        },
        lists: {
          orderBy: { order: 'asc' },
          include: {
            tasks: {
              orderBy: { order: 'asc' },
              include: {
                assignees: {
                  include: {
                    user: { select: { id: true, name: true, email: true } }
                  }
                },
                labels: {
                  include: { label: true }
                },
                checklists: {
                  include: { items: true }
                },
                _count: { select: { comments: true } }
              }
            },
          },
        },
      },
    });
    return board;
  } catch (error) {
    console.error("Failed to fetch board details:", error);
    return null;
  }
}

export async function createList(boardId: string, title: string, userId: string) {
  try {
    const role = await getUserRoleInBoard(boardId, userId);

    if (!role) return { success: false, error: "You don't have access to this board" };
    if (role === 'VIEWER') return { success: false, error: "Viewers cannot create lists" };

    // Find last order to append to the end
    const lastList = await prisma.taskList.findFirst({
      where: { boardId },
      orderBy: { order: 'desc' },
    });
    const newOrder = lastList ? lastList.order + 1 : 0;

    const list = await prisma.taskList.create({
      data: {
        title,
        boardId,
        order: newOrder,
      },
      include: { tasks: true } // Return with empty tasks array for UI
    });

    // Emit real-time event
    emitToBoard(boardId, 'list:created', { boardId, list });

    return { success: true, list };
  } catch (error) {
    console.error("Failed to create list:", error);
    return { success: false };
  }
}

// Update a list (rename, change header color)
export async function updateList(listId: string, data: { title?: string; headerColor?: string }, userId: string) {
  try {
    const list = await prisma.taskList.findUnique({
      where: { id: listId },
      select: { boardId: true }
    });

    if (!list) return { success: false, error: "List not found" };

    const role = await getUserRoleInBoard(list.boardId, userId);
    if (!role) return { success: false, error: "You don't have access to this board" };
    if (role === 'VIEWER') return { success: false, error: "Viewers cannot update lists" };

    const updated = await prisma.taskList.update({
      where: { id: listId },
      data,
      include: { tasks: true }
    });

    emitToBoard(list.boardId, 'list:updated', { boardId: list.boardId, list: updated });

    return { success: true, list: updated };
  } catch (error) {
    console.error("Failed to update list:", error);
    return { success: false, error: "Failed to update list" };
  }
}

// Delete a list and all its tasks
export async function deleteList(listId: string, userId: string) {
  try {
    const list = await prisma.taskList.findUnique({
      where: { id: listId },
      select: { boardId: true }
    });

    if (!list) return { success: false, error: "List not found" };

    const role = await getUserRoleInBoard(list.boardId, userId);
    if (!role) return { success: false, error: "You don't have access to this board" };
    if (role === 'VIEWER') return { success: false, error: "Viewers cannot delete lists" };

    await prisma.taskList.delete({ where: { id: listId } });

    emitToBoard(list.boardId, 'list:deleted', { boardId: list.boardId, listId });

    return { success: true };
  } catch (error) {
    console.error("Failed to delete list:", error);
    return { success: false, error: "Failed to delete list" };
  }
}

// Clear all tasks in a list
export async function clearListTasks(listId: string, userId: string) {
  try {
    const list = await prisma.taskList.findUnique({
      where: { id: listId },
      select: { boardId: true }
    });

    if (!list) return { success: false, error: "List not found" };

    const role = await getUserRoleInBoard(list.boardId, userId);
    if (!role) return { success: false, error: "You don't have access to this board" };
    if (role === 'VIEWER') return { success: false, error: "Viewers cannot clear tasks" };

    await prisma.task.deleteMany({ where: { listId } });

    emitToBoard(list.boardId, 'list:updated', { boardId: list.boardId, list: { ...list, id: listId, tasks: [] } });

    return { success: true };
  } catch (error) {
    console.error("Failed to clear list tasks:", error);
    return { success: false, error: "Failed to clear tasks" };
  }
}

// Create a new task in a list
export async function createTask(listId: string, title: string, userId: string) {
  try {
    // Get the list to find the boardId
    const list = await prisma.taskList.findUnique({
      where: { id: listId },
      select: { boardId: true }
    });

    if (!list) return { success: false };

    const role = await getUserRoleInBoard(list.boardId, userId);

    if (!role) return { success: false, error: "You don't have access to this board" };
    if (role === 'VIEWER') return { success: false, error: "Viewers cannot create tasks" };

    // Find last order to append to the end
    const lastTask = await prisma.task.findFirst({
      where: { listId },
      orderBy: { order: 'desc' },
    });
    const newOrder = lastTask ? lastTask.order + 1 : 0;

    const task = await prisma.task.create({
      data: {
        title,
        listId,
        order: newOrder,
      },
      include: {
        assignees: {
          include: {
            user: { select: { id: true, name: true, email: true } }
          }
        },
        labels: {
          include: { label: true }
        },
        checklists: {
          include: { items: true }
        },
        _count: { select: { comments: true } }
      }
    });

    // Emit real-time event
    emitToBoard(list.boardId, 'task:created', { boardId: list.boardId, listId, task });

    return { success: true, task };
  } catch (error) {
    console.error("Failed to create task:", error);
    return { success: false };
  }
}

// Update a task (title, description)
export async function updateTask(taskId: string, data: { title?: string; description?: string }, userId: string) {
  try {
    // Get boardId first
    const taskInfo = await prisma.task.findUnique({
      where: { id: taskId },
      include: { list: { select: { boardId: true } } }
    });

    if (!taskInfo) return { success: false };

    const role = await getUserRoleInBoard(taskInfo.list.boardId, userId);

    if (!role) return { success: false, error: "You don't have access to this board" };
    if (role === 'VIEWER') return { success: false, error: "Viewers cannot update tasks" };

    const task = await prisma.task.update({
      where: { id: taskId },
      data,
      include: {
        list: { select: { boardId: true } }
      }
    });

    // Emit real-time event
    emitToBoard(task.list.boardId, 'task:updated', { boardId: task.list.boardId, task });

    return { success: true, task };
  } catch (error) {
    console.error("Failed to update task:", error);
    return { success: false };
  }
}

// Delete a task
export async function deleteTask(taskId: string, userId: string) {
  try {
    // Get task info before deleting
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { list: { select: { boardId: true } } }
    });

    if (!task) return { success: false };

    const role = await getUserRoleInBoard(task.list.boardId, userId);

    if (!role) return { success: false, error: "You don't have access to this board" };
    if (role === 'VIEWER') return { success: false, error: "Viewers cannot delete tasks" };

    await prisma.task.delete({
      where: { id: taskId },
    });

    // Emit real-time event
    emitToBoard(task.list.boardId, 'task:deleted', { boardId: task.list.boardId, taskId, listId: task.listId });

    return { success: true };
  } catch (error) {
    console.error("Failed to delete task:", error);
    return { success: false };
  }
}

// Move task within same list (reorder)
export async function reorderTasksInList(listId: string, taskIds: string[], userId: string) {
  try {
    // Get the list to find boardId
    const list = await prisma.taskList.findUnique({
      where: { id: listId },
      select: { boardId: true }
    });

    if (!list) return { success: false };

    const role = await getUserRoleInBoard(list.boardId, userId);

    if (!role) return { success: false, error: "You don't have access to this board" };
    if (role === 'VIEWER') return { success: false, error: "Viewers cannot reorder tasks" };

    // Update all tasks with their new order
    await prisma.$transaction(
      taskIds.map((taskId, index) =>
        prisma.task.update({
          where: { id: taskId },
          data: { order: index },
        })
      )
    );

    // Emit real-time event
    emitToBoard(list.boardId, 'task:reordered', { boardId: list.boardId, listId, taskIds });

    return { success: true };
  } catch (error) {
    console.error("Failed to reorder tasks:", error);
    return { success: false };
  }
}

// Move task to a different list
export async function moveTaskToList(taskId: string, targetListId: string, newOrder: number, userId: string) {
  try {
    // Get the target list to find boardId
    const targetList = await prisma.taskList.findUnique({
      where: { id: targetListId },
      select: { boardId: true }
    });

    // Get the source list info
    const sourceTask = await prisma.task.findUnique({
      where: { id: taskId },
      select: { listId: true }
    });

    if (!targetList || !sourceTask) return { success: false };

    const role = await getUserRoleInBoard(targetList.boardId, userId);

    if (!role) return { success: false, error: "You don't have access to this board" };
    if (role === 'VIEWER') return { success: false, error: "Viewers cannot move tasks" };

    // Update the task's listId and order
    const task = await prisma.task.update({
      where: { id: taskId },
      data: {
        listId: targetListId,
        order: newOrder,
      },
      include: {
        assignees: {
          include: {
            user: { select: { id: true, name: true, email: true } }
          }
        },
        labels: {
          include: { label: true }
        },
        checklists: {
          include: { items: true }
        },
        _count: { select: { comments: true } }
      }
    });

    // Emit real-time event
    emitToBoard(targetList.boardId, 'task:moved', {
      boardId: targetList.boardId,
      taskId,
      sourceListId: sourceTask.listId,
      targetListId,
      newOrder,
      task
    });

    return { success: true, task };
  } catch (error) {
    console.error("Failed to move task:", error);
    return { success: false };
  }
}

// Reorder lists on a board
export async function reorderLists(boardId: string, listIds: string[], userId: string) {
  try {
    const role = await getUserRoleInBoard(boardId, userId);

    if (!role) return { success: false, error: "You don't have access to this board" };
    if (role === 'VIEWER') return { success: false, error: "Viewers cannot reorder lists" };

    await prisma.$transaction(
      listIds.map((listId, index) =>
        prisma.taskList.update({
          where: { id: listId },
          data: { order: index },
        })
      )
    );

    // Emit real-time event
    emitToBoard(boardId, 'list:reordered', { boardId, listIds });

    return { success: true };
  } catch (error) {
    console.error("Failed to reorder lists:", error);
    return { success: false };
  }
}

// Get all boards in a workspace
export async function getWorkspaceBoards(workspaceId: string, userId: string) {
  try {
    // Verify user has access to workspace
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        members: { where: { userId } },
        owner: true
      }
    });

    if (!workspace) return [];

    const isOwner = workspace.ownerId === userId;
    const isMember = workspace.members.length > 0;

    if (!isOwner && !isMember) return [];

    // Fetch all boards in workspace
    const boards = await prisma.board.findMany({
      where: { workspaceId },
      select: {
        id: true,
        title: true,
        color: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return boards;
  } catch (error) {
    console.error("Failed to fetch workspace boards:", error);
    return [];
  }
}