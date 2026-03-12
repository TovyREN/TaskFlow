import { prisma } from '@/lib/prisma';
import { emitToBoard } from '@/lib/socket';
import {
  getTaskDetails,
  updateTaskDetails,
  addAssignee,
  removeAssignee,
  addLabelToTask,
  removeLabelFromTask,
  getBoardLabels,
  createBoardLabel,
  updateBoardLabel,
  deleteBoardLabel,
  createChecklist,
  deleteChecklist,
  addChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
  addComment,
  deleteComment,
  updateBoardSettings,
  getBoardWithLabels,
} from '@/app/actions/cardActions';

jest.mock('../../app/actions/notificationActions', () => ({
  createNotification: jest.fn().mockResolvedValue({ success: true }),
}));

// Typed mock references
const mockTask = prisma.task as unknown as {
  findUnique: jest.Mock;
  update: jest.Mock;
};
const mockBoard = prisma.board as unknown as {
  findUnique: jest.Mock;
  update: jest.Mock;
};
const mockTaskAssignee = prisma.taskAssignee as unknown as {
  create: jest.Mock;
  deleteMany: jest.Mock;
};
const mockTaskLabel = prisma.taskLabel as unknown as {
  create: jest.Mock;
  deleteMany: jest.Mock;
};
const mockBoardLabel = prisma.boardLabel as unknown as {
  findMany: jest.Mock;
  findUnique: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
};
const mockChecklist = prisma.checklist as unknown as {
  findUnique: jest.Mock;
  create: jest.Mock;
  delete: jest.Mock;
};
const mockChecklistItem = prisma.checklistItem as unknown as {
  findUnique: jest.Mock;
  findFirst: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
};
const mockComment = prisma.comment as unknown as {
  findUnique: jest.Mock;
  create: jest.Mock;
  delete: jest.Mock;
};
const mockEmitToBoard = emitToBoard as jest.Mock;

// Helper: build board object for getUserRoleInBoard
function boardWithRole(role: 'ADMIN' | 'MEMBER' | 'VIEWER', userId = 'user1') {
  const isOwner = role === 'ADMIN';
  return {
    id: 'board1',
    workspaceId: 'ws1',
    workspace: {
      ownerId: isOwner ? userId : 'otherOwner',
      members: [{ userId, role }],
    },
  };
}

// Helper: task with list.boardId (for getBoardIdFromTask)
function taskWithBoard(taskId = 'task1', boardId = 'board1') {
  return { id: taskId, list: { boardId } };
}

// Helper: checklist with nested task (for getBoardAndTaskFromChecklist)
function checklistWithBoard(checklistId = 'cl1', taskId = 'task1', boardId = 'board1') {
  return { id: checklistId, taskId, task: { list: { boardId } } };
}

// Helper: checklist item with nested checklist (for getBoardAndTaskFromChecklistItem)
function checklistItemWithBoard(itemId = 'item1', checklistId = 'cl1', taskId = 'task1', boardId = 'board1') {
  return { id: itemId, checklistId, checklist: { taskId, task: { list: { boardId } } } };
}

beforeEach(() => {
  jest.clearAllMocks();
});

// =====================
// getTaskDetails
// =====================
describe('getTaskDetails', () => {
  it('should return task details on success', async () => {
    const taskData = { id: 'task1', title: 'Test Task', assignees: [], labels: [], checklists: [], comments: [], list: {} };
    mockTask.findUnique.mockResolvedValue(taskData);

    const result = await getTaskDetails('task1');
    expect(result).toEqual(taskData);
    expect(mockTask.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'task1' } })
    );
  });

  it('should return null on error', async () => {
    mockTask.findUnique.mockRejectedValue(new Error('DB error'));
    const result = await getTaskDetails('task1');
    expect(result).toBeNull();
  });
});

// =====================
// updateTaskDetails
// =====================
describe('updateTaskDetails', () => {
  it('should update task when user has ADMIN role', async () => {
    mockTask.findUnique.mockResolvedValue(taskWithBoard());
    mockBoard.findUnique.mockResolvedValue(boardWithRole('ADMIN'));
    const updatedTask = { id: 'task1', title: 'Updated', list: { boardId: 'board1' } };
    mockTask.update.mockResolvedValue(updatedTask);

    const result = await updateTaskDetails('task1', { title: 'Updated' }, 'user1');
    expect(result).toEqual({ success: true, task: updatedTask });
    expect(mockEmitToBoard).toHaveBeenCalledWith('board1', 'task:updated', expect.any(Object), 'user1');
  });

  it('should fail when task not found', async () => {
    mockTask.findUnique.mockResolvedValue(null);
    const result = await updateTaskDetails('task1', { title: 'x' }, 'user1');
    expect(result).toEqual({ success: false });
  });

  it('should deny VIEWER role', async () => {
    mockTask.findUnique.mockResolvedValue(taskWithBoard());
    mockBoard.findUnique.mockResolvedValue(boardWithRole('VIEWER'));

    const result = await updateTaskDetails('task1', { title: 'x' }, 'user1');
    expect(result).toEqual({ success: false, error: 'Viewers cannot update tasks' });
  });
});

// =====================
// addAssignee
// =====================
describe('addAssignee', () => {
  it('should add assignee and create notification for different user', async () => {
    mockTask.findUnique
      .mockResolvedValueOnce(taskWithBoard())     // getBoardIdFromTask
      .mockResolvedValueOnce({ title: 'My Task', list: { board: { title: 'My Board' } } }); // notification lookup
    mockBoard.findUnique.mockResolvedValue(boardWithRole('ADMIN'));
    mockTaskAssignee.create.mockResolvedValue({});

    const result = await addAssignee('task1', 'user2', 'user1');
    expect(result).toEqual({ success: true });
    expect(mockTaskAssignee.create).toHaveBeenCalled();
    expect(mockEmitToBoard).toHaveBeenCalledWith('board1', 'task:assignee-added', expect.any(Object), 'user1');

    const { createNotification } = require('../../app/actions/notificationActions');
    expect(createNotification).toHaveBeenCalledWith(expect.objectContaining({
      type: 'TASK_ASSIGNED',
      userId: 'user2',
    }));
  });

  it('should skip notification on self-assignment', async () => {
    mockTask.findUnique.mockResolvedValue(taskWithBoard());
    mockBoard.findUnique.mockResolvedValue(boardWithRole('ADMIN'));
    mockTaskAssignee.create.mockResolvedValue({});

    const result = await addAssignee('task1', 'user1', 'user1');
    expect(result).toEqual({ success: true });

    const { createNotification } = require('../../app/actions/notificationActions');
    expect(createNotification).not.toHaveBeenCalled();
  });

  it('should deny VIEWER role', async () => {
    mockTask.findUnique.mockResolvedValue(taskWithBoard());
    mockBoard.findUnique.mockResolvedValue(boardWithRole('VIEWER'));

    const result = await addAssignee('task1', 'user2', 'user1');
    expect(result).toEqual({ success: false, error: 'Viewers cannot add assignees' });
  });
});

// =====================
// removeAssignee
// =====================
describe('removeAssignee', () => {
  it('should remove assignee successfully', async () => {
    mockTask.findUnique.mockResolvedValue(taskWithBoard());
    mockBoard.findUnique.mockResolvedValue(boardWithRole('MEMBER'));
    mockTaskAssignee.deleteMany.mockResolvedValue({ count: 1 });

    const result = await removeAssignee('task1', 'user2', 'user1');
    expect(result).toEqual({ success: true });
    expect(mockTaskAssignee.deleteMany).toHaveBeenCalledWith({ where: { taskId: 'task1', userId: 'user2' } });
    expect(mockEmitToBoard).toHaveBeenCalled();
  });

  it('should fail when task not found', async () => {
    mockTask.findUnique.mockResolvedValue(null);
    const result = await removeAssignee('task1', 'user2', 'user1');
    expect(result).toEqual({ success: false });
  });
});

// =====================
// addLabelToTask
// =====================
describe('addLabelToTask', () => {
  it('should add label to task', async () => {
    mockTask.findUnique.mockResolvedValue(taskWithBoard());
    mockBoard.findUnique.mockResolvedValue(boardWithRole('ADMIN'));
    mockTaskLabel.create.mockResolvedValue({ taskId: 'task1', labelId: 'label1', label: { id: 'label1', name: 'Bug' } });

    const result = await addLabelToTask('task1', 'label1', 'user1');
    expect(result).toEqual({ success: true });
    expect(mockEmitToBoard).toHaveBeenCalledWith('board1', 'task:label-added', expect.any(Object), 'user1');
  });

  it('should deny VIEWER role', async () => {
    mockTask.findUnique.mockResolvedValue(taskWithBoard());
    mockBoard.findUnique.mockResolvedValue(boardWithRole('VIEWER'));

    const result = await addLabelToTask('task1', 'label1', 'user1');
    expect(result).toEqual({ success: false, error: 'Viewers cannot add labels' });
  });
});

// =====================
// removeLabelFromTask
// =====================
describe('removeLabelFromTask', () => {
  it('should remove label from task', async () => {
    mockTask.findUnique.mockResolvedValue(taskWithBoard());
    mockBoard.findUnique.mockResolvedValue(boardWithRole('MEMBER'));
    mockTaskLabel.deleteMany.mockResolvedValue({ count: 1 });

    const result = await removeLabelFromTask('task1', 'label1', 'user1');
    expect(result).toEqual({ success: true });
    expect(mockEmitToBoard).toHaveBeenCalledWith('board1', 'task:label-removed', expect.any(Object), 'user1');
  });
});

// =====================
// getBoardLabels
// =====================
describe('getBoardLabels', () => {
  it('should return labels', async () => {
    const labels = [{ id: 'l1', name: 'Bug', color: 'red' }];
    mockBoardLabel.findMany.mockResolvedValue(labels);

    const result = await getBoardLabels('board1');
    expect(result).toEqual(labels);
  });

  it('should return empty array on error', async () => {
    mockBoardLabel.findMany.mockRejectedValue(new Error('DB error'));
    const result = await getBoardLabels('board1');
    expect(result).toEqual([]);
  });
});

// =====================
// createBoardLabel
// =====================
describe('createBoardLabel', () => {
  it('should create label when ADMIN', async () => {
    mockBoard.findUnique.mockResolvedValue(boardWithRole('ADMIN'));
    const label = { id: 'l1', boardId: 'board1', name: 'Feature', color: 'blue' };
    mockBoardLabel.create.mockResolvedValue(label);

    const result = await createBoardLabel('board1', 'Feature', 'blue', 'user1');
    expect(result).toEqual({ success: true, label });
    expect(mockEmitToBoard).toHaveBeenCalledWith('board1', 'board:label-created', expect.any(Object), 'user1');
  });

  it('should deny VIEWER role', async () => {
    mockBoard.findUnique.mockResolvedValue(boardWithRole('VIEWER'));
    const result = await createBoardLabel('board1', 'Feature', 'blue', 'user1');
    expect(result).toEqual({ success: false, error: 'Viewers cannot create labels' });
  });
});

// =====================
// updateBoardLabel
// =====================
describe('updateBoardLabel', () => {
  it('should update label when ADMIN', async () => {
    mockBoardLabel.findUnique.mockResolvedValue({ id: 'l1', boardId: 'board1' });
    mockBoard.findUnique.mockResolvedValue(boardWithRole('ADMIN'));
    const updated = { id: 'l1', boardId: 'board1', name: 'Updated', color: 'green' };
    mockBoardLabel.update.mockResolvedValue(updated);

    const result = await updateBoardLabel('l1', { name: 'Updated', color: 'green' }, 'user1');
    expect(result).toEqual({ success: true, label: updated });
  });

  it('should fail when label not found', async () => {
    mockBoardLabel.findUnique.mockResolvedValue(null);
    const result = await updateBoardLabel('l1', { name: 'x' }, 'user1');
    expect(result).toEqual({ success: false });
  });
});

// =====================
// deleteBoardLabel
// =====================
describe('deleteBoardLabel', () => {
  it('should delete label when ADMIN', async () => {
    mockBoardLabel.findUnique.mockResolvedValue({ id: 'l1', boardId: 'board1' });
    mockBoard.findUnique.mockResolvedValue(boardWithRole('ADMIN'));
    mockBoardLabel.delete.mockResolvedValue({});

    const result = await deleteBoardLabel('l1', 'user1');
    expect(result).toEqual({ success: true });
    expect(mockEmitToBoard).toHaveBeenCalledWith('board1', 'board:label-deleted', expect.any(Object), 'user1');
  });

  it('should fail when label not found', async () => {
    mockBoardLabel.findUnique.mockResolvedValue(null);
    const result = await deleteBoardLabel('l1', 'user1');
    expect(result).toEqual({ success: false });
  });

  it('should deny VIEWER role', async () => {
    mockBoardLabel.findUnique.mockResolvedValue({ id: 'l1', boardId: 'board1' });
    mockBoard.findUnique.mockResolvedValue(boardWithRole('VIEWER'));

    const result = await deleteBoardLabel('l1', 'user1');
    expect(result).toEqual({ success: false, error: 'Viewers cannot delete labels' });
  });
});

// =====================
// createChecklist
// =====================
describe('createChecklist', () => {
  it('should create checklist when ADMIN', async () => {
    mockTask.findUnique.mockResolvedValue(taskWithBoard());
    mockBoard.findUnique.mockResolvedValue(boardWithRole('ADMIN'));
    const checklist = { id: 'cl1', taskId: 'task1', title: 'My Checklist', items: [] };
    mockChecklist.create.mockResolvedValue(checklist);

    const result = await createChecklist('task1', 'My Checklist', 'user1');
    expect(result).toEqual({ success: true, checklist });
    expect(mockEmitToBoard).toHaveBeenCalledWith('board1', 'task:checklist-created', expect.any(Object), 'user1');
  });

  it('should fail when task not found', async () => {
    mockTask.findUnique.mockResolvedValue(null);
    const result = await createChecklist('task1', 'My Checklist', 'user1');
    expect(result).toEqual({ success: false });
  });
});

// =====================
// deleteChecklist
// =====================
describe('deleteChecklist', () => {
  it('should delete checklist when ADMIN', async () => {
    mockChecklist.findUnique.mockResolvedValue(checklistWithBoard());
    mockBoard.findUnique.mockResolvedValue(boardWithRole('ADMIN'));
    mockChecklist.delete.mockResolvedValue({});

    const result = await deleteChecklist('cl1', 'user1');
    expect(result).toEqual({ success: true });
    expect(mockEmitToBoard).toHaveBeenCalledWith('board1', 'task:checklist-deleted', expect.any(Object), 'user1');
  });

  it('should fail when checklist not found', async () => {
    mockChecklist.findUnique.mockResolvedValue(null);
    const result = await deleteChecklist('cl1', 'user1');
    expect(result).toEqual({ success: false });
  });
});

// =====================
// addChecklistItem
// =====================
describe('addChecklistItem', () => {
  it('should add checklist item with correct order', async () => {
    mockChecklist.findUnique.mockResolvedValue(checklistWithBoard());
    mockBoard.findUnique.mockResolvedValue(boardWithRole('ADMIN'));
    mockChecklistItem.findFirst.mockResolvedValue({ order: 2 }); // last item has order 2
    const newItem = { id: 'item1', checklistId: 'cl1', title: 'New item', order: 3 };
    mockChecklistItem.create.mockResolvedValue(newItem);

    const result = await addChecklistItem('cl1', 'New item', 'user1');
    expect(result).toEqual({ success: true, item: newItem });
    expect(mockChecklistItem.create).toHaveBeenCalledWith({
      data: { checklistId: 'cl1', title: 'New item', order: 3 },
    });
  });

  it('should start at order 0 when no items exist', async () => {
    mockChecklist.findUnique.mockResolvedValue(checklistWithBoard());
    mockBoard.findUnique.mockResolvedValue(boardWithRole('ADMIN'));
    mockChecklistItem.findFirst.mockResolvedValue(null);
    const newItem = { id: 'item1', checklistId: 'cl1', title: 'First item', order: 0 };
    mockChecklistItem.create.mockResolvedValue(newItem);

    const result = await addChecklistItem('cl1', 'First item', 'user1');
    expect(result).toEqual({ success: true, item: newItem });
    expect(mockChecklistItem.create).toHaveBeenCalledWith({
      data: { checklistId: 'cl1', title: 'First item', order: 0 },
    });
  });

  it('should deny VIEWER role', async () => {
    mockChecklist.findUnique.mockResolvedValue(checklistWithBoard());
    mockBoard.findUnique.mockResolvedValue(boardWithRole('VIEWER'));

    const result = await addChecklistItem('cl1', 'New item', 'user1');
    expect(result).toEqual({ success: false, error: 'Viewers cannot add checklist items' });
  });
});

// =====================
// updateChecklistItem
// =====================
describe('updateChecklistItem', () => {
  it('should update checklist item', async () => {
    mockChecklistItem.findUnique.mockResolvedValue(checklistItemWithBoard());
    mockBoard.findUnique.mockResolvedValue(boardWithRole('ADMIN'));
    const updated = { id: 'item1', title: 'Updated', isChecked: true };
    mockChecklistItem.update.mockResolvedValue(updated);

    const result = await updateChecklistItem('item1', { isChecked: true }, 'user1');
    expect(result).toEqual({ success: true, item: updated });
    expect(mockEmitToBoard).toHaveBeenCalledWith('board1', 'task:checklist-item-updated', expect.any(Object), 'user1');
  });

  it('should fail when item not found', async () => {
    mockChecklistItem.findUnique.mockResolvedValue(null);
    const result = await updateChecklistItem('item1', { isChecked: true }, 'user1');
    expect(result).toEqual({ success: false });
  });
});

// =====================
// deleteChecklistItem
// =====================
describe('deleteChecklistItem', () => {
  it('should delete checklist item', async () => {
    mockChecklistItem.findUnique.mockResolvedValue(checklistItemWithBoard());
    mockBoard.findUnique.mockResolvedValue(boardWithRole('ADMIN'));
    mockChecklistItem.delete.mockResolvedValue({});

    const result = await deleteChecklistItem('item1', 'user1');
    expect(result).toEqual({ success: true });
    expect(mockEmitToBoard).toHaveBeenCalledWith('board1', 'task:checklist-item-deleted', expect.any(Object), 'user1');
  });

  it('should deny VIEWER role', async () => {
    mockChecklistItem.findUnique.mockResolvedValue(checklistItemWithBoard());
    mockBoard.findUnique.mockResolvedValue(boardWithRole('VIEWER'));

    const result = await deleteChecklistItem('item1', 'user1');
    expect(result).toEqual({ success: false, error: 'Viewers cannot delete checklist items' });
  });
});

// =====================
// addComment
// =====================
describe('addComment', () => {
  it('should add comment without role check', async () => {
    mockTask.findUnique.mockResolvedValue(taskWithBoard());
    const comment = { id: 'c1', taskId: 'task1', userId: 'user1', text: 'Hello', user: { id: 'user1', name: 'User', email: 'u@e.com' } };
    mockComment.create.mockResolvedValue(comment);

    const result = await addComment('task1', 'user1', 'Hello');
    expect(result).toEqual({ success: true, comment });
    expect(mockEmitToBoard).toHaveBeenCalledWith('board1', 'task:comment-added', expect.any(Object), 'user1');
    // Should NOT call board.findUnique (no role check)
    expect(mockBoard.findUnique).not.toHaveBeenCalled();
  });

  it('should still succeed even if boardId is null', async () => {
    mockTask.findUnique.mockResolvedValue(null); // getBoardIdFromTask returns null
    const comment = { id: 'c1', taskId: 'task1', userId: 'user1', text: 'Hello', user: { id: 'user1', name: 'User', email: 'u@e.com' } };
    mockComment.create.mockResolvedValue(comment);

    const result = await addComment('task1', 'user1', 'Hello');
    expect(result).toEqual({ success: true, comment });
    expect(mockEmitToBoard).not.toHaveBeenCalled();
  });
});

// =====================
// deleteComment
// =====================
describe('deleteComment', () => {
  it('should delete own comment', async () => {
    mockComment.findUnique.mockResolvedValue({
      id: 'c1', userId: 'user1', taskId: 'task1',
      task: { list: { boardId: 'board1' } },
    });
    mockComment.delete.mockResolvedValue({});

    const result = await deleteComment('c1', 'user1');
    expect(result).toEqual({ success: true });
    expect(mockEmitToBoard).toHaveBeenCalledWith('board1', 'task:comment-deleted', expect.any(Object), 'user1');
  });

  it('should reject deleting other users comment', async () => {
    mockComment.findUnique.mockResolvedValue({
      id: 'c1', userId: 'otherUser', taskId: 'task1',
      task: { list: { boardId: 'board1' } },
    });

    const result = await deleteComment('c1', 'user1');
    expect(result).toEqual({ success: false, error: 'Cannot delete this comment' });
    expect(mockComment.delete).not.toHaveBeenCalled();
  });

  it('should fail when comment not found', async () => {
    mockComment.findUnique.mockResolvedValue(null);
    const result = await deleteComment('c1', 'user1');
    expect(result).toEqual({ success: false, error: 'Cannot delete this comment' });
  });
});

// =====================
// updateBoardSettings
// =====================
describe('updateBoardSettings', () => {
  it('should update settings when ADMIN', async () => {
    mockBoard.findUnique.mockResolvedValue(boardWithRole('ADMIN'));
    const updatedBoard = { id: 'board1', title: 'New Title' };
    mockBoard.update.mockResolvedValue(updatedBoard);

    const result = await updateBoardSettings('board1', { title: 'New Title' }, 'user1');
    expect(result).toEqual({ success: true, board: updatedBoard });
    expect(mockEmitToBoard).toHaveBeenCalledWith('board1', 'board:settings-changed', expect.any(Object), 'user1');
  });

  it('should deny MEMBER role', async () => {
    mockBoard.findUnique.mockResolvedValue(boardWithRole('MEMBER'));
    const result = await updateBoardSettings('board1', { title: 'x' }, 'user1');
    expect(result).toEqual({ success: false, error: 'Only admins can change board settings' });
  });

  it('should deny VIEWER role', async () => {
    mockBoard.findUnique.mockResolvedValue(boardWithRole('VIEWER'));
    const result = await updateBoardSettings('board1', { title: 'x' }, 'user1');
    expect(result).toEqual({ success: false, error: 'Only admins can change board settings' });
  });

  it('should fail when no access', async () => {
    mockBoard.findUnique.mockResolvedValue(null);
    const result = await updateBoardSettings('board1', { title: 'x' }, 'user1');
    expect(result).toEqual({ success: false, error: "You don't have access to this board" });
  });
});

// =====================
// getBoardWithLabels
// =====================
describe('getBoardWithLabels', () => {
  it('should return board with labels and members', async () => {
    const board = {
      id: 'board1',
      labels: [{ id: 'l1', name: 'Bug' }],
      workspace: { members: [{ user: { id: 'user1', name: 'User', email: 'u@e.com' } }] },
    };
    mockBoard.findUnique.mockResolvedValue(board);

    const result = await getBoardWithLabels('board1');
    expect(result).toEqual(board);
  });

  it('should return null on error', async () => {
    mockBoard.findUnique.mockRejectedValue(new Error('DB error'));
    const result = await getBoardWithLabels('board1');
    expect(result).toBeNull();
  });
});

// =====================
// Error path tests (catch blocks)
// =====================

describe('updateTaskDetails - error path', () => {
  it('returns {success: false} on database error', async () => {
    mockTask.findUnique.mockRejectedValue(new Error('DB error'));
    const result = await updateTaskDetails('task1', { title: 'x' }, 'user1');
    expect(result).toEqual({ success: false });
  });
});

describe('addAssignee - error path', () => {
  it('returns {success: false} on database error', async () => {
    mockTask.findUnique.mockRejectedValue(new Error('DB error'));
    const result = await addAssignee('task1', 'user2', 'user1');
    expect(result).toEqual({ success: false });
  });
});

describe('removeAssignee - error path', () => {
  it('returns {success: false} on database error', async () => {
    mockTask.findUnique.mockRejectedValue(new Error('DB error'));
    const result = await removeAssignee('task1', 'user2', 'user1');
    expect(result).toEqual({ success: false });
  });
});

describe('addLabelToTask - error path', () => {
  it('returns {success: false} on database error', async () => {
    mockTask.findUnique.mockRejectedValue(new Error('DB error'));
    const result = await addLabelToTask('task1', 'label1', 'user1');
    expect(result).toEqual({ success: false });
  });
});

describe('removeLabelFromTask - error path', () => {
  it('returns {success: false} on database error', async () => {
    mockTask.findUnique.mockRejectedValue(new Error('DB error'));
    const result = await removeLabelFromTask('task1', 'label1', 'user1');
    expect(result).toEqual({ success: false });
  });
});

describe('createBoardLabel - error path', () => {
  it('returns {success: false} on database error', async () => {
    mockBoard.findUnique.mockResolvedValue(boardWithRole('ADMIN'));
    mockBoardLabel.create.mockRejectedValue(new Error('DB error'));
    const result = await createBoardLabel('board1', 'Bug', 'red', 'user1');
    expect(result).toEqual({ success: false });
  });
});

describe('updateBoardLabel - error path', () => {
  it('returns {success: false} on database error', async () => {
    mockBoardLabel.findUnique.mockRejectedValue(new Error('DB error'));
    const result = await updateBoardLabel('l1', { name: 'x' }, 'user1');
    expect(result).toEqual({ success: false });
  });
});

describe('deleteBoardLabel - error path', () => {
  it('returns {success: false} on database error', async () => {
    mockBoardLabel.findUnique.mockRejectedValue(new Error('DB error'));
    const result = await deleteBoardLabel('l1', 'user1');
    expect(result).toEqual({ success: false });
  });
});

describe('createChecklist - error path', () => {
  it('returns {success: false} on database error', async () => {
    mockTask.findUnique.mockRejectedValue(new Error('DB error'));
    const result = await createChecklist('task1', 'Checklist', 'user1');
    expect(result).toEqual({ success: false });
  });
});

describe('deleteChecklist - error path', () => {
  it('returns {success: false} on database error', async () => {
    mockChecklist.findUnique.mockRejectedValue(new Error('DB error'));
    const result = await deleteChecklist('cl1', 'user1');
    expect(result).toEqual({ success: false });
  });
});

describe('addChecklistItem - error path', () => {
  it('returns {success: false} on database error', async () => {
    mockChecklist.findUnique.mockRejectedValue(new Error('DB error'));
    const result = await addChecklistItem('cl1', 'Item', 'user1');
    expect(result).toEqual({ success: false });
  });
});

describe('updateChecklistItem - error path', () => {
  it('returns {success: false} on database error', async () => {
    mockChecklistItem.findUnique.mockRejectedValue(new Error('DB error'));
    const result = await updateChecklistItem('item1', { isChecked: true }, 'user1');
    expect(result).toEqual({ success: false });
  });
});

describe('deleteChecklistItem - error path', () => {
  it('returns {success: false} on database error', async () => {
    mockChecklistItem.findUnique.mockRejectedValue(new Error('DB error'));
    const result = await deleteChecklistItem('item1', 'user1');
    expect(result).toEqual({ success: false });
  });
});

describe('addComment - error path', () => {
  it('returns {success: false} on database error', async () => {
    mockTask.findUnique.mockRejectedValue(new Error('DB error'));
    const result = await addComment('task1', 'user1', 'Hello');
    expect(result).toEqual({ success: false });
  });
});

describe('deleteComment - error path', () => {
  it('returns {success: false} on database error', async () => {
    mockComment.findUnique.mockRejectedValue(new Error('DB error'));
    const result = await deleteComment('c1', 'user1');
    expect(result).toEqual({ success: false });
  });
});

describe('updateBoardSettings - error path', () => {
  it('returns {success: false} on database error', async () => {
    mockBoard.findUnique.mockResolvedValue(boardWithRole('ADMIN'));
    mockBoard.update.mockRejectedValue(new Error('DB error'));
    const result = await updateBoardSettings('board1', { title: 'x' }, 'user1');
    expect(result).toEqual({ success: false });
  });
});

describe('getUserRoleInBoard (cardActions) - error path', () => {
  it('returns no-access error when getUserRoleInBoard catch block triggers', async () => {
    mockTask.findUnique.mockResolvedValue(taskWithBoard());
    mockBoard.findUnique.mockRejectedValue(new Error('DB error'));

    const result = await updateTaskDetails('task1', { title: 'x' }, 'user1');
    expect(result).toEqual({ success: false, error: "You don't have access to this board" });
  });

  it('returns null role when member has falsy role (|| null branch)', async () => {
    mockTask.findUnique.mockResolvedValue(taskWithBoard());
    mockBoard.findUnique.mockResolvedValue({
      id: 'board1',
      workspace: {
        ownerId: 'otherOwner',
        members: [{ userId: 'user1', role: undefined }],
      },
    });

    const result = await updateTaskDetails('task1', { title: 'x' }, 'user1');
    expect(result).toEqual({ success: false, error: "You don't have access to this board" });
  });
});

// =====================
// Additional branch coverage tests
// =====================

describe('addAssignee - branch coverage', () => {
  it('returns error when boardId not found', async () => {
    mockTask.findUnique.mockResolvedValue(null); // getBoardIdFromTask returns null

    const result = await addAssignee('task1', 'user2', 'user1');
    expect(result).toEqual({ success: false });
  });

  it('returns error when no role (no access)', async () => {
    mockTask.findUnique.mockResolvedValue(taskWithBoard());
    mockBoard.findUnique.mockResolvedValue(null);

    const result = await addAssignee('task1', 'user2', 'user1');
    expect(result).toEqual({ success: false, error: "You don't have access to this board" });
  });

  it('skips notification when task not found after assignment', async () => {
    mockTask.findUnique
      .mockResolvedValueOnce(taskWithBoard())     // getBoardIdFromTask
      .mockResolvedValueOnce(null);               // task lookup for notification returns null
    mockBoard.findUnique.mockResolvedValue(boardWithRole('ADMIN'));
    mockTaskAssignee.create.mockResolvedValue({});

    const result = await addAssignee('task1', 'user2', 'user1');
    expect(result).toEqual({ success: true });
    const { createNotification } = require('../../app/actions/notificationActions');
    expect(createNotification).not.toHaveBeenCalled();
  });
});

describe('removeAssignee - branch coverage', () => {
  it('returns error when no role (no access)', async () => {
    mockTask.findUnique.mockResolvedValue(taskWithBoard());
    mockBoard.findUnique.mockResolvedValue(null);

    const result = await removeAssignee('task1', 'user2', 'user1');
    expect(result).toEqual({ success: false, error: "You don't have access to this board" });
  });

  it('returns error for VIEWER role', async () => {
    mockTask.findUnique.mockResolvedValue(taskWithBoard());
    mockBoard.findUnique.mockResolvedValue(boardWithRole('VIEWER'));

    const result = await removeAssignee('task1', 'user2', 'user1');
    expect(result).toEqual({ success: false, error: 'Viewers cannot remove assignees' });
  });
});

describe('addLabelToTask - branch coverage', () => {
  it('returns error when boardId not found', async () => {
    mockTask.findUnique.mockResolvedValue(null);

    const result = await addLabelToTask('task1', 'label1', 'user1');
    expect(result).toEqual({ success: false });
  });

  it('returns error when no role (no access)', async () => {
    mockTask.findUnique.mockResolvedValue(taskWithBoard());
    mockBoard.findUnique.mockResolvedValue(null);

    const result = await addLabelToTask('task1', 'label1', 'user1');
    expect(result).toEqual({ success: false, error: "You don't have access to this board" });
  });
});

describe('removeLabelFromTask - branch coverage', () => {
  it('returns error when no role (no access)', async () => {
    mockTask.findUnique.mockResolvedValue(taskWithBoard());
    mockBoard.findUnique.mockResolvedValue(null);

    const result = await removeLabelFromTask('task1', 'label1', 'user1');
    expect(result).toEqual({ success: false, error: "You don't have access to this board" });
  });

  it('returns error for VIEWER role', async () => {
    mockTask.findUnique.mockResolvedValue(taskWithBoard());
    mockBoard.findUnique.mockResolvedValue(boardWithRole('VIEWER'));

    const result = await removeLabelFromTask('task1', 'label1', 'user1');
    expect(result).toEqual({ success: false, error: 'Viewers cannot remove labels' });
  });

  it('returns error when task not found (no boardId)', async () => {
    mockTask.findUnique.mockResolvedValue(null);

    const result = await removeLabelFromTask('task1', 'label1', 'user1');
    expect(result).toEqual({ success: false });
  });
});

describe('createBoardLabel - branch coverage', () => {
  it('returns error when no role (no access)', async () => {
    mockBoard.findUnique.mockResolvedValue(null);

    const result = await createBoardLabel('board1', 'Bug', 'red', 'user1');
    expect(result).toEqual({ success: false, error: "You don't have access to this board" });
  });
});

describe('updateBoardLabel - branch coverage', () => {
  it('returns error when no role (no access)', async () => {
    mockBoardLabel.findUnique.mockResolvedValue({ id: 'l1', boardId: 'board1' });
    mockBoard.findUnique.mockResolvedValue(null);

    const result = await updateBoardLabel('l1', { name: 'x' }, 'user1');
    expect(result).toEqual({ success: false, error: "You don't have access to this board" });
  });

  it('returns error for VIEWER role', async () => {
    mockBoardLabel.findUnique.mockResolvedValue({ id: 'l1', boardId: 'board1' });
    mockBoard.findUnique.mockResolvedValue(boardWithRole('VIEWER'));

    const result = await updateBoardLabel('l1', { name: 'x' }, 'user1');
    expect(result).toEqual({ success: false, error: 'Viewers cannot update labels' });
  });
});

describe('deleteBoardLabel - branch coverage', () => {
  it('returns error when no role (no access)', async () => {
    mockBoardLabel.findUnique.mockResolvedValue({ id: 'l1', boardId: 'board1' });
    mockBoard.findUnique.mockResolvedValue(null);

    const result = await deleteBoardLabel('l1', 'user1');
    expect(result).toEqual({ success: false, error: "You don't have access to this board" });
  });
});

describe('createChecklist - branch coverage', () => {
  it('returns error when no role (no access)', async () => {
    mockTask.findUnique.mockResolvedValue(taskWithBoard());
    mockBoard.findUnique.mockResolvedValue(null);

    const result = await createChecklist('task1', 'Checklist', 'user1');
    expect(result).toEqual({ success: false, error: "You don't have access to this board" });
  });

  it('returns error for VIEWER role', async () => {
    mockTask.findUnique.mockResolvedValue(taskWithBoard());
    mockBoard.findUnique.mockResolvedValue(boardWithRole('VIEWER'));

    const result = await createChecklist('task1', 'Checklist', 'user1');
    expect(result).toEqual({ success: false, error: 'Viewers cannot create checklists' });
  });
});

describe('deleteChecklist - branch coverage', () => {
  it('returns error when no role (no access)', async () => {
    mockChecklist.findUnique.mockResolvedValue(checklistWithBoard());
    mockBoard.findUnique.mockResolvedValue(null);

    const result = await deleteChecklist('cl1', 'user1');
    expect(result).toEqual({ success: false, error: "You don't have access to this board" });
  });

  it('returns error for VIEWER role', async () => {
    mockChecklist.findUnique.mockResolvedValue(checklistWithBoard());
    mockBoard.findUnique.mockResolvedValue(boardWithRole('VIEWER'));

    const result = await deleteChecklist('cl1', 'user1');
    expect(result).toEqual({ success: false, error: 'Viewers cannot delete checklists' });
  });
});

describe('addChecklistItem - branch coverage', () => {
  it('returns error when checklist not found', async () => {
    mockChecklist.findUnique.mockResolvedValue(null);

    const result = await addChecklistItem('cl1', 'Item', 'user1');
    expect(result).toEqual({ success: false });
  });

  it('returns error when no role (no access)', async () => {
    mockChecklist.findUnique.mockResolvedValue(checklistWithBoard());
    mockBoard.findUnique.mockResolvedValue(null);

    const result = await addChecklistItem('cl1', 'Item', 'user1');
    expect(result).toEqual({ success: false, error: "You don't have access to this board" });
  });
});

describe('updateChecklistItem - branch coverage', () => {
  it('returns error when no role (no access)', async () => {
    mockChecklistItem.findUnique.mockResolvedValue(checklistItemWithBoard());
    mockBoard.findUnique.mockResolvedValue(null);

    const result = await updateChecklistItem('item1', { isChecked: true }, 'user1');
    expect(result).toEqual({ success: false, error: "You don't have access to this board" });
  });

  it('returns error for VIEWER role', async () => {
    mockChecklistItem.findUnique.mockResolvedValue(checklistItemWithBoard());
    mockBoard.findUnique.mockResolvedValue(boardWithRole('VIEWER'));

    const result = await updateChecklistItem('item1', { isChecked: true }, 'user1');
    expect(result).toEqual({ success: false, error: 'Viewers cannot update checklist items' });
  });
});

describe('deleteChecklistItem - branch coverage', () => {
  it('returns error when item not found', async () => {
    mockChecklistItem.findUnique.mockResolvedValue(null);

    const result = await deleteChecklistItem('item1', 'user1');
    expect(result).toEqual({ success: false });
  });

  it('returns error when no role (no access)', async () => {
    mockChecklistItem.findUnique.mockResolvedValue(checklistItemWithBoard());
    mockBoard.findUnique.mockResolvedValue(null);

    const result = await deleteChecklistItem('item1', 'user1');
    expect(result).toEqual({ success: false, error: "You don't have access to this board" });
  });
});
