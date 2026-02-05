"use server";

import { prisma } from '@/lib/prisma';

export async function getBoards(userId: string) {
  try {
    return await prisma.board.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  } catch (error) {
    console.error("Failed to fetch boards:", error);
    return [];
  }
}

export async function createBoard(title: string, userId: string) {
  try {
    const board = await prisma.board.create({
      data: {
        title,
        userId,
        color: '#3b82f6',
      },
    });
    return { success: true, board };
  } catch (error) {
    console.error("Failed to create board:", error);
    return { success: false };
  }
}

// Fetch a single board with its lists and tasks
export async function getBoardDetails(boardId: string) {
  try {
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      include: {
        lists: {
          orderBy: { order: 'asc' },
          include: {
            tasks: {
              orderBy: { order: 'asc' },
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
    return { success: true, list };
  } catch (error) {
    console.error("Failed to create list:", error);
    return { success: false };
  }
}