'use server';

import { revalidatePath } from 'next/cache';
import { listDb, cardDb } from '@/db/list-db';
import type { List, Card } from '@/types/list';

export async function getBoardLists(boardId: string): Promise<List[]> {
  try {
    const lists = listDb.findByBoardId(boardId);
    return lists.map(list => ({
      ...list,
      created_at: list.created_at.toISOString(),
      updated_at: list.updated_at.toISOString(),
    })) as any;
  } catch (error) {
    console.error('Error in getBoardLists:', error);
    return [];
  }
}

export async function createList(boardId: string, title: string): Promise<List> {
  try {
    const existingLists = listDb.findByBoardId(boardId);
    const position = existingLists.length;

    const list = listDb.create(boardId, title, position);

    revalidatePath(`/boards/${boardId}`);
    
    return {
      ...list,
      created_at: list.created_at.toISOString(),
      updated_at: list.updated_at.toISOString(),
    } as any;
  } catch (error) {
    console.error('Error in createList:', error);
    throw error;
  }
}

export async function updateList(listId: string, title: string, background?: string | null): Promise<List | null> {
  try {
    const updateData: any = { title };
    if (background !== undefined) {
      updateData.background = background;
    }
    
    const list = listDb.update(listId, updateData);
    
    if (!list) return null;

    const boardId = list.board_id;
    revalidatePath(`/boards/${boardId}`);
    
    return {
      ...list,
      created_at: list.created_at.toISOString(),
      updated_at: list.updated_at.toISOString(),
    } as any;
  } catch (error) {
    console.error('Error in updateList:', error);
    throw error;
  }
}

export async function deleteList(listId: string): Promise<void> {
  try {
    const list = listDb.findById(listId);
    if (!list) throw new Error('List not found');

    const boardId = list.board_id;
    listDb.delete(listId);

    revalidatePath(`/boards/${boardId}`);
  } catch (error) {
    console.error('Error in deleteList:', error);
    throw error;
  }
}

export async function getListCards(listId: string): Promise<Card[]> {
  try {
    const cards = cardDb.findByListId(listId);
    return cards.map(card => ({
      ...card,
      due_date: card.due_date?.toISOString() || null,
      created_at: card.created_at.toISOString(),
      updated_at: card.updated_at.toISOString(),
    })) as any;
  } catch (error) {
    console.error('Error in getListCards:', error);
    return [];
  }
}

export async function createCard(listId: string, title: string): Promise<Card> {
  try {
    const existingCards = cardDb.findByListId(listId);
    const position = existingCards.length;

    const card = cardDb.create(listId, title, position);

    const list = listDb.findById(listId);
    if (list) {
      revalidatePath(`/boards/${list.board_id}`);
    }
    
    return {
      ...card,
      due_date: null,
      created_at: card.created_at.toISOString(),
      updated_at: card.updated_at.toISOString(),
    } as any;
  } catch (error) {
    console.error('Error in createCard:', error);
    throw error;
  }
}

export async function updateCard(
  cardId: string,
  data: { title?: string; description?: string }
): Promise<Card | null> {
  try {
    const card = cardDb.update(cardId, data);
    
    if (!card) return null;

    const list = listDb.findById(card.list_id);
    if (list) {
      revalidatePath(`/boards/${list.board_id}`);
    }
    
    return {
      ...card,
      due_date: card.due_date?.toISOString() || null,
      created_at: card.created_at.toISOString(),
      updated_at: card.updated_at.toISOString(),
    } as any;
  } catch (error) {
    console.error('Error in updateCard:', error);
    throw error;
  }
}

export async function deleteCard(cardId: string): Promise<void> {
  try {
    const card = cardDb.findById(cardId);
    if (!card) throw new Error('Card not found');

    const list = listDb.findById(card.list_id);
    cardDb.delete(cardId);

    if (list) {
      revalidatePath(`/boards/${list.board_id}`);
    }
  } catch (error) {
    console.error('Error in deleteCard:', error);
    throw error;
  }
}

export async function moveCard(
  cardId: string,
  targetListId: string,
  newPosition: number
): Promise<void> {
  try {
    const card = cardDb.findById(cardId);
    if (!card) throw new Error('Card not found');

    const oldList = listDb.findById(card.list_id);
    
    cardDb.update(cardId, { list_id: targetListId, position: newPosition });

    if (oldList) {
      revalidatePath(`/boards/${oldList.board_id}`);
    }
  } catch (error) {
    console.error('Error in moveCard:', error);
    throw error;
  }
}

export async function moveList(
  listId: string,
  newPosition: number
): Promise<void> {
  try {
    const list = listDb.findById(listId);
    if (!list) throw new Error('List not found');

    const boardId = list.board_id;
    const lists = listDb.findByBoardId(boardId);
    const oldIndex = lists.findIndex(l => l.id === listId);

    if (oldIndex === -1) {
      throw new Error('List not found in board');
    }

    const targetIndex = Math.max(0, Math.min(newPosition, lists.length - 1));
    if (oldIndex === targetIndex) {
      return;
    }

    const reordered = [...lists];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    // IMPORTANT: mettre à jour la position de toutes les listes.
    // Sinon plusieurs listes partagent la même position et le rendu serveur
    // peut revenir à l'ordre initial après l'action.
    for (let index = 0; index < reordered.length; index++) {
      const current = reordered[index];
      if (current.position !== index) {
        listDb.update(current.id, { position: index });
      }
    }

    revalidatePath(`/boards/${boardId}`);
  } catch (error) {
    console.error('Error in moveList:', error);
    throw error;
  }
}
