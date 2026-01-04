'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { verifyToken } from '@/lib/jwt';
import { labelDb } from '@/db/label-db';
import { checklistDb } from '@/db/checklist-db';
import { commentDb } from '@/db/comment-db';
import { boardMemberDb } from '@/db/board-member-db';
import { cardAssigneeDb } from '@/db/card-assignee-db';
import { listDb, cardDb } from '@/db/list-db';
import { boardDb } from '@/db/board-db';

async function getUserIdFromCookies(): Promise<string> {
  const cookieStore = await cookies();
  const token = cookieStore.get('sb-access-token')?.value;
  if (!token) throw new Error('Unauthorized');

  const payload = verifyToken(token);
  if (!payload?.userId) throw new Error('Unauthorized');

  return payload.userId;
}

function canAccessBoard(boardId: string, userId: string): boolean {
  const board = boardDb.findById(boardId);
  if (board && board.owner_id === userId) return true;
  const members = boardMemberDb.findMembersByBoardId(boardId);
  return members.some((m) => m.id === userId);
}

export async function getBoardLabels(boardId: string) {
  const labels = labelDb.findByBoardId(boardId);
  return labels.map((l) => ({
    ...l,
    created_at: l.created_at.toISOString(),
  }));
}

export async function createBoardLabel(boardId: string, name: string, color: string) {
  const userId = await getUserIdFromCookies();
  if (!canAccessBoard(boardId, userId)) throw new Error('Unauthorized');

  const label = labelDb.create(boardId, name.trim(), color);
  revalidatePath(`/boards/${boardId}`);
  return {
    ...label,
    created_at: label.created_at.toISOString(),
  };
}

export async function toggleCardLabel(boardId: string, cardId: string, labelId: string) {
  const userId = await getUserIdFromCookies();
  if (!canAccessBoard(boardId, userId)) throw new Error('Unauthorized');

  const has = labelDb.isLabelOnCard(cardId, labelId);
  if (has) {
    labelDb.removeLabelFromCard(cardId, labelId);
  } else {
    labelDb.addLabelToCard(cardId, labelId);
  }

  revalidatePath(`/boards/${boardId}`);
  return { added: !has };
}

export async function getBoardMembers(boardId: string) {
  const userId = await getUserIdFromCookies();
  if (!canAccessBoard(boardId, userId)) throw new Error('Unauthorized');
  return boardMemberDb.findMembersByBoardId(boardId);
}

export async function toggleCardAssignee(boardId: string, cardId: string, userId: string) {
  const callerId = await getUserIdFromCookies();
  if (!canAccessBoard(boardId, callerId)) throw new Error('Unauthorized');
  const members = boardMemberDb.findMembersByBoardId(boardId);
  const targetIsMember = members.some((m) => m.id === userId) || boardDb.findById(boardId)?.owner_id === userId;
  if (!targetIsMember) throw new Error('Unauthorized');

  const isAssigned = cardAssigneeDb.isAssigned(cardId, userId);
  if (isAssigned) {
    cardAssigneeDb.unassign(cardId, userId);
  } else {
    cardAssigneeDb.assign(cardId, userId);
  }

  revalidatePath(`/boards/${boardId}`);
  return { assigned: !isAssigned };
}

export async function getCardChecklists(cardId: string) {
  const userId = await getUserIdFromCookies();
  // Validate access via board membership
  const card = cardDb.findById(cardId);
  if (!card) throw new Error('Card not found');
  const list = listDb.findById(card.list_id);
  if (!list) throw new Error('List not found');
  if (!canAccessBoard(list.board_id, userId)) throw new Error('Unauthorized');

  const checklists = checklistDb.findByCardId(cardId);
  return checklists.map((c) => ({
    ...c,
    created_at: c.created_at.toISOString(),
    updated_at: c.updated_at.toISOString(),
    items: c.items.map((i) => ({
      ...i,
      created_at: i.created_at.toISOString(),
      updated_at: i.updated_at.toISOString(),
    })),
  }));
}

export async function createChecklist(boardId: string, cardId: string, title: string) {
  const callerId = await getUserIdFromCookies();
  if (!canAccessBoard(boardId, callerId)) throw new Error('Unauthorized');

  const checklist = checklistDb.createChecklist(cardId, title.trim());
  revalidatePath(`/boards/${boardId}`);
  return {
    ...checklist,
    created_at: checklist.created_at.toISOString(),
    updated_at: checklist.updated_at.toISOString(),
  };
}

export async function addChecklistItem(boardId: string, checklistId: string, title: string) {
  const callerId = await getUserIdFromCookies();
  if (!canAccessBoard(boardId, callerId)) throw new Error('Unauthorized');

  const item = checklistDb.addItem(checklistId, title.trim());
  revalidatePath(`/boards/${boardId}`);
  return {
    ...item,
    created_at: item.created_at.toISOString(),
    updated_at: item.updated_at.toISOString(),
  };
}

export async function toggleChecklistItem(boardId: string, itemId: string, completed: boolean) {
  const callerId = await getUserIdFromCookies();
  if (!canAccessBoard(boardId, callerId)) throw new Error('Unauthorized');

  checklistDb.toggleItem(itemId, completed);
  revalidatePath(`/boards/${boardId}`);
}

export async function deleteChecklistItem(boardId: string, itemId: string) {
  const callerId = await getUserIdFromCookies();
  if (!canAccessBoard(boardId, callerId)) throw new Error('Unauthorized');

  checklistDb.deleteItem(itemId);
  revalidatePath(`/boards/${boardId}`);
}

export async function deleteChecklist(boardId: string, checklistId: string) {
  const callerId = await getUserIdFromCookies();
  if (!canAccessBoard(boardId, callerId)) throw new Error('Unauthorized');

  checklistDb.deleteChecklist(checklistId);
  revalidatePath(`/boards/${boardId}`);
}

export async function getCardComments(cardId: string) {
  const userId = await getUserIdFromCookies();
  const card = cardDb.findById(cardId);
  if (!card) throw new Error('Card not found');
  const list = listDb.findById(card.list_id);
  if (!list) throw new Error('List not found');
  if (!canAccessBoard(list.board_id, userId)) throw new Error('Unauthorized');

  const comments = commentDb.findByCardId(cardId);
  return comments.map((c) => ({
    ...c,
    created_at: c.created_at.toISOString(),
    updated_at: c.updated_at.toISOString(),
  }));
}

export async function addCardComment(boardId: string, cardId: string, content: string) {
  const userId = await getUserIdFromCookies();
  if (!canAccessBoard(boardId, userId)) throw new Error('Unauthorized');

  const comment = commentDb.create(cardId, userId, content.trim());
  revalidatePath(`/boards/${boardId}`);
  return {
    ...comment,
    created_at: comment.created_at.toISOString(),
    updated_at: comment.updated_at.toISOString(),
  };
}
