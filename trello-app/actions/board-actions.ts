'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { boardDb } from '@/db/board-db';
import { verifyToken } from '@/lib/jwt';
import { createBoardSchema, type CreateBoardInput } from '@/lib/validations/board';
import type { Board } from '@/types/board';

async function getUserIdFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('sb-access-token')?.value;
  
  if (!token) return null;
  
  try {
    const payload = verifyToken(token);
    return payload?.userId || null;
  } catch {
    return null;
  }
}

export async function getUserBoards(userId: string): Promise<Board[]> {
  try {
    const boards = boardDb.findByUserId(userId);
    return boards.map(board => ({
      ...board,
      created_at: board.created_at.toISOString(),
      updated_at: board.updated_at.toISOString(),
    })) as any;
  } catch (error) {
    console.error('Error in getUserBoards:', error);
    return [];
  }
}

export async function createBoard(input: CreateBoardInput): Promise<Board> {
  try {
    const userId = await getUserIdFromCookies();
    if (!userId) {
      throw new Error('Unauthorized');
    }

    // Validation
    const validated = createBoardSchema.parse(input);

    // Create board
    const board = boardDb.create(
      validated.name,
      userId,
      validated.description || null,
      validated.background || null,
      validated.visibility || 'private'
    );

    revalidatePath('/boards');
    
    return {
      ...board,
      created_at: board.created_at.toISOString(),
      updated_at: board.updated_at.toISOString(),
    } as any;
  } catch (error) {
    console.error('Error in createBoard:', error);
    throw error;
  }
}

export async function getBoard(boardId: string): Promise<Board | null> {
  try {
    const board = boardDb.findById(boardId);
    
    if (!board) return null;

    return {
      ...board,
      created_at: board.created_at.toISOString(),
      updated_at: board.updated_at.toISOString(),
    } as any;
  } catch (error) {
    console.error('Error in getBoard:', error);
    return null;
  }
}

export async function updateBoard(
  boardId: string,
  data: Partial<Omit<CreateBoardInput, 'description' | 'background'>> & {
    description?: string | null;
    background?: string | null;
  }
): Promise<Board> {
  try {
    const userId = await getUserIdFromCookies();
    if (!userId) {
      throw new Error('Unauthorized');
    }

    const board = boardDb.update(boardId, {
      name: data.name,
      description: data.description,
      background: data.background,
      visibility: data.visibility,
    });

    if (!board) {
      throw new Error('Board not found or unauthorized');
    }

    revalidatePath(`/boards/${boardId}`);
    
    return {
      ...board,
      created_at: board.created_at.toISOString(),
      updated_at: board.updated_at.toISOString(),
    } as any;
  } catch (error) {
    console.error('Error in updateBoard:', error);
    throw error;
  }
}

export async function deleteBoard(boardId: string): Promise<void> {
  try {
    const userId = await getUserIdFromCookies();
    if (!userId) {
      throw new Error('Unauthorized');
    }

    const deleted = boardDb.delete(boardId);

    if (!deleted) {
      throw new Error('Failed to delete board');
    }

    revalidatePath('/boards');
  } catch (error) {
    console.error('Error in deleteBoard:', error);
    throw error;
  }
}
