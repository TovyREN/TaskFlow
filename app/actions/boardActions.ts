"use server";

import { prisma } from '@/lib/prisma';
import { emitToBoard } from '@/lib/socket';

// NOTE: getBoards and createBoard have been moved to workspaceActions.ts
// since boards now belong to workspaces, not users directly

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

export async function createList(boardId: string, title: string) {
  try {
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

// Create a new task in a list
export async function createTask(listId: string, title: string) {
  try {
    // Get the list to find the boardId
    const list = await prisma.taskList.findUnique({
      where: { id: listId },
      select: { boardId: true }
    });
    
    if (!list) return { success: false };
    
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
export async function updateTask(taskId: string, data: { title?: string; description?: string }) {
  try {
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
export async function deleteTask(taskId: string) {
  try {
    // Get task info before deleting
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { list: { select: { boardId: true } } }
    });
    
    if (!task) return { success: false };
    
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
export async function reorderTasksInList(listId: string, taskIds: string[]) {
  try {
    // Get the list to find boardId
    const list = await prisma.taskList.findUnique({
      where: { id: listId },
      select: { boardId: true }
    });
    
    if (!list) return { success: false };
    
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
export async function moveTaskToList(taskId: string, targetListId: string, newOrder: number) {
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
export async function reorderLists(boardId: string, listIds: string[]) {
  try {
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