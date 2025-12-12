'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { supabaseClient } from '@/config/supabase';
import { createBoardSchema, type CreateBoardInput } from '@/lib/validations/board';
import type { Board } from '@/types/board';

async function getUserIdFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('sb-access-token')?.value;
  
  if (!token) return null;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.sub;
  } catch {
    return null;
  }
}

export async function getUserBoards(userId: string): Promise<Board[]> {
  try {
    const { data: boards, error } = await supabaseClient
      .from('boards')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching boards:', error);
      return [];
    }

    return boards || [];
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
    const { data: board, error } = await supabaseClient
      .from('boards')
      .insert({
        name: validated.name,
        description: validated.description || null,
        background: validated.background || null,
        visibility: validated.visibility || 'private',
        owner_id: userId,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating board:', error);
      throw new Error('Failed to create board');
    }

    revalidatePath('/boards');
    return board;
  } catch (error) {
    console.error('Error in createBoard:', error);
    throw error;
  }
}

export async function getBoard(boardId: string): Promise<Board | null> {
  try {
    const { data: board, error } = await supabaseClient
      .from('boards')
      .select('*')
      .eq('id', boardId)
      .single();

    if (error) {
      console.error('Error fetching board:', error);
      return null;
    }

    return board;
  } catch (error) {
    console.error('Error in getBoard:', error);
    return null;
  }
}

export async function updateBoard(
  boardId: string,
  data: Partial<CreateBoardInput>
): Promise<Board> {
  try {
    const userId = await getUserIdFromCookies();
    if (!userId) {
      throw new Error('Unauthorized');
    }

    const { data: board, error } = await supabaseClient
      .from('boards')
      .update(data)
      .eq('id', boardId)
      .eq('owner_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating board:', error);
      throw new Error('Failed to update board');
    }

    revalidatePath(`/boards/${boardId}`);
    return board;
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

    const { error } = await supabaseClient
      .from('boards')
      .delete()
      .eq('id', boardId)
      .eq('owner_id', userId);

    if (error) {
      console.error('Error deleting board:', error);
      throw new Error('Failed to delete board');
    }

    revalidatePath('/boards');
  } catch (error) {
    console.error('Error in deleteBoard:', error);
    throw error;
  }
}
