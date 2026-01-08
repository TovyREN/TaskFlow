'use server';

import { revalidatePath } from 'next/cache';
import { listDb, cardDb } from '@/db/list-db';
import { labelDb } from '@/db/label-db';
import { cardAssigneeDb } from '@/db/card-assignee-db';
import { commentDb } from '@/db/comment-db';
import { checklistDb } from '@/db/checklist-db';
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

    const cardIds = cards.map((c) => c.id);

    const labelsByCard = new Map<string, Array<{ id: string; name: string; color: string }>>();
    for (const row of labelDb.findByCardIds(cardIds)) {
      const arr = labelsByCard.get(row.card_id) || [];
      arr.push({
        id: row.label.id,
        name: row.label.name,
        color: row.label.color,
      });
      labelsByCard.set(row.card_id, arr);
    }

    const assigneesByCard = new Map<string, Array<{ id: string; email: string; name: string | null; avatar: string | null }>>();
    for (const row of cardAssigneeDb.findByCardIds(cardIds)) {
      const arr = assigneesByCard.get(row.card_id) || [];
      arr.push({ id: row.id, email: row.email, name: row.name, avatar: row.avatar });
      assigneesByCard.set(row.card_id, arr);
    }

    const commentsCountByCard = new Map<string, number>();
    for (const row of commentDb.countByCardIds(cardIds)) {
      commentsCountByCard.set(row.card_id, row.count);
    }

    const checklistByCard = new Map<string, { total: number; completed: number }>();
    for (const row of checklistDb.getSummaryByCardIds(cardIds)) {
      checklistByCard.set(row.card_id, { total: row.total, completed: row.completed });
    }

    return cards.map(card => ({
      ...card,
      due_date: card.due_date?.toISOString() || null,
      created_at: card.created_at.toISOString(),
      updated_at: card.updated_at.toISOString(),
      labels: labelsByCard.get(card.id) || [],
      assignees: assigneesByCard.get(card.id) || [],
      commentsCount: commentsCountByCard.get(card.id) || 0,
      checklist: checklistByCard.get(card.id) || { total: 0, completed: 0 },
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
  data: { title?: string; description?: string; due_date?: string | null }
): Promise<Card | null> {
  try {
    const updateData: any = {
      title: data.title,
      description: data.description,
    };

    if (data.due_date !== undefined) {
      updateData.due_date = data.due_date ? new Date(data.due_date) : null;
    }

    const card = cardDb.update(cardId, updateData);
    
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

    const oldListId = card.list_id;
    const oldList = listDb.findById(oldListId);
    const targetList = listDb.findById(targetListId);

    if (!targetList) {
      throw new Error('Target list not found');
    }

    const boardId = (oldList || targetList).board_id;

    type CardUpdateData = Parameters<typeof cardDb.update>[1];

    // IMPORTANT: toujours réindexer toutes les cartes concernées.
    // Sinon plusieurs cartes partagent la même position et le rendu serveur
    // peut revenir à l'ordre initial après l'action.
    if (oldListId === targetListId) {
      const cards = cardDb.findByListId(targetListId);
      const oldIndex = cards.findIndex((c) => c.id === cardId);

      if (oldIndex === -1) {
        throw new Error('Card not found in list');
      }

      const clampedIndex = Math.max(0, Math.min(newPosition, cards.length - 1));
      if (oldIndex === clampedIndex) {
        return;
      }

      const reordered = [...cards];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(clampedIndex, 0, moved);

      for (let index = 0; index < reordered.length; index++) {
        const current = reordered[index];
        if (current.position !== index) {
          cardDb.update(current.id, { position: index });
        }
      }
    } else {
      const sourceCards = cardDb.findByListId(oldListId);
      const targetCards = cardDb.findByListId(targetListId);

      const sourceIndex = sourceCards.findIndex((c) => c.id === cardId);
      if (sourceIndex === -1) {
        throw new Error('Card not found in source list');
      }

      const [moved] = sourceCards.splice(sourceIndex, 1);
      const clampedIndex = Math.max(0, Math.min(newPosition, targetCards.length));
      targetCards.splice(clampedIndex, 0, { ...moved, list_id: targetListId });

      // Mettre à jour les positions de la liste source
      for (let index = 0; index < sourceCards.length; index++) {
        const current = sourceCards[index];
        if (current.position !== index) {
          cardDb.update(current.id, { position: index });
        }
      }

      // Mettre à jour les positions (et list_id) de la liste cible
      for (let index = 0; index < targetCards.length; index++) {
        const current = targetCards[index];
        const updateData: CardUpdateData = {};

        // Forcer l'update de list_id pour la carte déplacée
        if (current.id === cardId) {
          updateData.list_id = targetListId;
        }

        if (current.position !== index) {
          updateData.position = index;
        }

        if (updateData.list_id !== undefined || updateData.position !== undefined) {
          cardDb.update(current.id, updateData);
        }
      }
    }

    revalidatePath(`/boards/${boardId}`);
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
