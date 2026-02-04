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