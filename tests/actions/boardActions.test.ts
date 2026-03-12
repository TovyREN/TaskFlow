import { prisma } from '@/lib/prisma';
import { emitToBoard } from '@/lib/socket';
import {
  getBoardDetails,
  createList,
  createTask,
  updateTask,
  deleteTask,
  reorderTasksInList,
  moveTaskToList,
  reorderLists,
  getWorkspaceBoards,
  updateList,
  deleteList,
  clearListTasks,
} from '@/app/actions/boardActions';

// Typed mock references
const mockBoard = prisma.board as unknown as {
  findUnique: jest.Mock;
  findMany: jest.Mock;
};
const mockTaskList = prisma.taskList as unknown as {
  findUnique: jest.Mock;
  findFirst: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
};
const mockTask = prisma.task as unknown as {
  findUnique: jest.Mock;
  findFirst: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  deleteMany: jest.Mock;
};
const mockWorkspace = prisma.workspace as unknown as {
  findUnique: jest.Mock;
};
const mockTransaction = prisma.$transaction as jest.Mock;
const mockEmitToBoard = emitToBoard as jest.Mock;

// Helper to build the board object that satisfies getUserRoleInBoard
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

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ─── getBoardDetails ─────────────────────────────────────────────────

describe('getBoardDetails', () => {
  it('returns board with all details', async () => {
    const fullBoard = {
      id: 'board1',
      title: 'My Board',
      labels: [],
      workspace: { members: [] },
      lists: [{ id: 'list1', tasks: [] }],
    };
    mockBoard.findUnique.mockResolvedValue(fullBoard);

    const result = await getBoardDetails('board1');

    expect(result).toEqual(fullBoard);
    expect(mockBoard.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'board1' } })
    );
  });

  it('returns null when board not found', async () => {
    mockBoard.findUnique.mockResolvedValue(null);

    const result = await getBoardDetails('nonexistent');

    expect(result).toBeNull();
  });

  it('throws on error', async () => {
    mockBoard.findUnique.mockRejectedValue(new Error('DB error'));

    await expect(getBoardDetails('board1')).rejects.toThrow('DB error');
  });
});

// ─── createList ──────────────────────────────────────────────────────

describe('createList', () => {
  it('creates list successfully for ADMIN', async () => {
    // First call: getUserRoleInBoard
    mockBoard.findUnique.mockResolvedValueOnce(boardWithRole('ADMIN'));
    // findFirst for last list order
    mockTaskList.findFirst.mockResolvedValue({ order: 2 });
    // taskList.create
    const createdList = { id: 'list1', title: 'New List', boardId: 'board1', order: 3, tasks: [] };
    mockTaskList.create.mockResolvedValue(createdList);

    const result = await createList('board1', 'New List', 'user1');

    expect(result).toEqual({ success: true, list: createdList });
    expect(mockTaskList.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { title: 'New List', boardId: 'board1', order: 3 },
      })
    );
    expect(mockEmitToBoard).toHaveBeenCalledWith('board1', 'list:created', {
      boardId: 'board1',
      list: createdList,
    }, 'user1');
  });

  it('returns error when board not found (no access)', async () => {
    mockBoard.findUnique.mockResolvedValueOnce(null);

    const result = await createList('board1', 'New List', 'user1');

    expect(result).toEqual({ success: false, error: "You don't have access to this board" });
  });

  it('returns error for VIEWER role', async () => {
    mockBoard.findUnique.mockResolvedValueOnce(boardWithRole('VIEWER'));

    const result = await createList('board1', 'New List', 'user1');

    expect(result).toEqual({ success: false, error: 'Viewers cannot create lists' });
  });

  it('handles empty board with no existing lists (newOrder=0)', async () => {
    mockBoard.findUnique.mockResolvedValueOnce(boardWithRole('ADMIN'));
    mockTaskList.findFirst.mockResolvedValue(null);
    const createdList = { id: 'list1', title: 'First List', boardId: 'board1', order: 0, tasks: [] };
    mockTaskList.create.mockResolvedValue(createdList);

    const result = await createList('board1', 'First List', 'user1');

    expect(result).toEqual({ success: true, list: createdList });
    expect(mockTaskList.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { title: 'First List', boardId: 'board1', order: 0 },
      })
    );
  });
});

// ─── createTask ──────────────────────────────────────────────────────

describe('createTask', () => {
  it('creates task successfully', async () => {
    // taskList.findUnique to get boardId
    mockTaskList.findUnique.mockResolvedValue({ boardId: 'board1' });
    // board.findUnique for role check
    mockBoard.findUnique.mockResolvedValueOnce(boardWithRole('ADMIN'));
    // task.findFirst for last order
    mockTask.findFirst.mockResolvedValue({ order: 4 });
    // task.create
    const createdTask = { id: 'task1', title: 'New Task', listId: 'list1', order: 5 };
    mockTask.create.mockResolvedValue(createdTask);

    const result = await createTask('list1', 'New Task', 'user1');

    expect(result).toEqual({ success: true, task: createdTask });
    expect(mockEmitToBoard).toHaveBeenCalledWith('board1', 'task:created', {
      boardId: 'board1',
      listId: 'list1',
      task: createdTask,
    }, 'user1');
  });

  it('returns error when list not found', async () => {
    mockTaskList.findUnique.mockResolvedValue(null);

    const result = await createTask('nonexistent', 'New Task', 'user1');

    expect(result).toEqual({ success: false });
  });

  it('returns error for VIEWER role', async () => {
    mockTaskList.findUnique.mockResolvedValue({ boardId: 'board1' });
    mockBoard.findUnique.mockResolvedValueOnce(boardWithRole('VIEWER'));

    const result = await createTask('list1', 'New Task', 'user1');

    expect(result).toEqual({ success: false, error: 'Viewers cannot create tasks' });
  });
});

// ─── updateTask ──────────────────────────────────────────────────────

describe('updateTask', () => {
  it('updates task successfully', async () => {
    // task.findUnique to get boardId
    mockTask.findUnique.mockResolvedValue({
      id: 'task1',
      list: { boardId: 'board1' },
    });
    // board.findUnique for role check
    mockBoard.findUnique.mockResolvedValueOnce(boardWithRole('ADMIN'));
    // task.update
    const updatedTask = {
      id: 'task1',
      title: 'Updated Title',
      list: { boardId: 'board1' },
    };
    mockTask.update.mockResolvedValue(updatedTask);

    const result = await updateTask('task1', { title: 'Updated Title' }, 'user1');

    expect(result).toEqual({ success: true, task: updatedTask });
    expect(mockEmitToBoard).toHaveBeenCalledWith('board1', 'task:updated', {
      boardId: 'board1',
      task: updatedTask,
    }, 'user1');
  });

  it('returns error when task not found', async () => {
    mockTask.findUnique.mockResolvedValue(null);

    const result = await updateTask('nonexistent', { title: 'x' }, 'user1');

    expect(result).toEqual({ success: false });
  });
});

// ─── deleteTask ──────────────────────────────────────────────────────

describe('deleteTask', () => {
  it('deletes task successfully', async () => {
    // task.findUnique to get task info
    mockTask.findUnique.mockResolvedValue({
      id: 'task1',
      listId: 'list1',
      list: { boardId: 'board1' },
    });
    // board.findUnique for role check
    mockBoard.findUnique.mockResolvedValueOnce(boardWithRole('ADMIN'));
    // task.delete
    mockTask.delete.mockResolvedValue({ id: 'task1' });

    const result = await deleteTask('task1', 'user1');

    expect(result).toEqual({ success: true });
    expect(mockTask.delete).toHaveBeenCalledWith({ where: { id: 'task1' } });
    expect(mockEmitToBoard).toHaveBeenCalledWith('board1', 'task:deleted', {
      boardId: 'board1',
      taskId: 'task1',
      listId: 'list1',
    }, 'user1');
  });

  it('returns error when task not found', async () => {
    mockTask.findUnique.mockResolvedValue(null);

    const result = await deleteTask('nonexistent', 'user1');

    expect(result).toEqual({ success: false });
  });
});

// ─── reorderTasksInList ──────────────────────────────────────────────

describe('reorderTasksInList', () => {
  it('reorders tasks with $transaction', async () => {
    // taskList.findUnique to get boardId
    mockTaskList.findUnique.mockResolvedValue({ boardId: 'board1' });
    // board.findUnique for role check
    mockBoard.findUnique.mockResolvedValueOnce(boardWithRole('ADMIN'));
    // $transaction resolves
    mockTransaction.mockResolvedValue([]);
    // task.update is called inside the transaction map
    mockTask.update.mockResolvedValue({});

    const taskIds = ['t1', 't2', 't3'];
    const result = await reorderTasksInList('list1', taskIds, 'user1');

    expect(result).toEqual({ success: true });
    expect(mockTransaction).toHaveBeenCalled();
    expect(mockEmitToBoard).toHaveBeenCalledWith('board1', 'task:reordered', {
      boardId: 'board1',
      listId: 'list1',
      taskIds,
    }, 'user1');
  });

  it('returns error when list not found', async () => {
    mockTaskList.findUnique.mockResolvedValue(null);

    const result = await reorderTasksInList('nonexistent', ['t1'], 'user1');

    expect(result).toEqual({ success: false });
  });
});

// ─── moveTaskToList ──────────────────────────────────────────────────

describe('moveTaskToList', () => {
  it('moves task successfully', async () => {
    // taskList.findUnique for target list
    mockTaskList.findUnique.mockResolvedValue({ boardId: 'board1' });
    // task.findUnique for source task
    mockTask.findUnique.mockResolvedValue({ listId: 'list1' });
    // board.findUnique for role check
    mockBoard.findUnique.mockResolvedValueOnce(boardWithRole('ADMIN'));
    // task.update
    const movedTask = { id: 'task1', listId: 'list2', order: 0 };
    mockTask.update.mockResolvedValue(movedTask);

    const result = await moveTaskToList('task1', 'list2', 0, 'user1');

    expect(result).toEqual({ success: true, task: movedTask });
    expect(mockEmitToBoard).toHaveBeenCalledWith('board1', 'task:moved', {
      boardId: 'board1',
      taskId: 'task1',
      sourceListId: 'list1',
      targetListId: 'list2',
      newOrder: 0,
      task: movedTask,
    }, 'user1');
  });

  it('returns error when target list or source task not found', async () => {
    mockTaskList.findUnique.mockResolvedValue(null);
    mockTask.findUnique.mockResolvedValue(null);

    const result = await moveTaskToList('task1', 'nonexistent', 0, 'user1');

    expect(result).toEqual({ success: false });
  });
});

// ─── reorderLists ────────────────────────────────────────────────────

describe('reorderLists', () => {
  it('reorders lists with $transaction', async () => {
    // board.findUnique for role check
    mockBoard.findUnique.mockResolvedValueOnce(boardWithRole('ADMIN'));
    // $transaction resolves
    mockTransaction.mockResolvedValue([]);
    mockTaskList.update.mockResolvedValue({});

    const listIds = ['l1', 'l2', 'l3'];
    const result = await reorderLists('board1', listIds, 'user1');

    expect(result).toEqual({ success: true });
    expect(mockTransaction).toHaveBeenCalled();
    expect(mockEmitToBoard).toHaveBeenCalledWith('board1', 'list:reordered', {
      boardId: 'board1',
      listIds,
    }, 'user1');
  });

  it('returns error for VIEWER role', async () => {
    mockBoard.findUnique.mockResolvedValueOnce(boardWithRole('VIEWER'));

    const result = await reorderLists('board1', ['l1', 'l2'], 'user1');

    expect(result).toEqual({ success: false, error: 'Viewers cannot reorder lists' });
  });
});

// ─── getWorkspaceBoards ──────────────────────────────────────────────

describe('getWorkspaceBoards', () => {
  it('returns boards for workspace owner', async () => {
    mockWorkspace.findUnique.mockResolvedValue({
      id: 'ws1',
      ownerId: 'user1',
      members: [],
      owner: { id: 'user1' },
    });
    const boards = [
      { id: 'b1', title: 'Board 1', color: '#fff', createdAt: new Date() },
      { id: 'b2', title: 'Board 2', color: '#000', createdAt: new Date() },
    ];
    mockBoard.findMany.mockResolvedValue(boards);

    const result = await getWorkspaceBoards('ws1', 'user1');

    expect(result).toEqual(boards);
    expect(mockBoard.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { workspaceId: 'ws1' } })
    );
  });

  it('returns empty array for non-member', async () => {
    mockWorkspace.findUnique.mockResolvedValue({
      id: 'ws1',
      ownerId: 'otherOwner',
      members: [],
      owner: { id: 'otherOwner' },
    });

    const result = await getWorkspaceBoards('ws1', 'user1');

    expect(result).toEqual([]);
    expect(mockBoard.findMany).not.toHaveBeenCalled();
  });

  it('returns empty array on database error', async () => {
    mockWorkspace.findUnique.mockRejectedValue(new Error('DB error'));

    const result = await getWorkspaceBoards('ws1', 'user1');

    expect(result).toEqual([]);
  });
});

// ─── Error path tests (catch blocks) ─────────────────────────────────

describe('createList - error path', () => {
  it('returns {success: false} on database error', async () => {
    mockBoard.findUnique.mockResolvedValueOnce(boardWithRole('ADMIN'));
    mockTaskList.findFirst.mockRejectedValue(new Error('DB error'));

    const result = await createList('board1', 'New List', 'user1');

    expect(result).toEqual({ success: false });
  });
});

describe('createTask - error path', () => {
  it('returns {success: false} on database error', async () => {
    mockTaskList.findUnique.mockRejectedValue(new Error('DB error'));

    const result = await createTask('list1', 'New Task', 'user1');

    expect(result).toEqual({ success: false });
  });
});

describe('updateTask - error path', () => {
  it('returns {success: false} on database error', async () => {
    mockTask.findUnique.mockRejectedValue(new Error('DB error'));

    const result = await updateTask('task1', { title: 'x' }, 'user1');

    expect(result).toEqual({ success: false });
  });
});

describe('deleteTask - error path', () => {
  it('returns {success: false} on database error', async () => {
    mockTask.findUnique.mockRejectedValue(new Error('DB error'));

    const result = await deleteTask('task1', 'user1');

    expect(result).toEqual({ success: false });
  });
});

describe('reorderTasksInList - error path', () => {
  it('returns {success: false} on database error', async () => {
    mockTaskList.findUnique.mockRejectedValue(new Error('DB error'));

    const result = await reorderTasksInList('list1', ['t1'], 'user1');

    expect(result).toEqual({ success: false });
  });
});

describe('moveTaskToList - error path', () => {
  it('returns {success: false} on database error', async () => {
    mockTaskList.findUnique.mockRejectedValue(new Error('DB error'));

    const result = await moveTaskToList('task1', 'list2', 0, 'user1');

    expect(result).toEqual({ success: false });
  });
});

describe('reorderLists - error path', () => {
  it('returns {success: false} on database error', async () => {
    mockBoard.findUnique.mockResolvedValueOnce(boardWithRole('ADMIN'));
    mockTransaction.mockRejectedValue(new Error('DB error'));

    const result = await reorderLists('board1', ['l1'], 'user1');

    expect(result).toEqual({ success: false });
  });
});

describe('getUserRoleInBoard - error path', () => {
  it('returns null (no access) when getUserRoleInBoard throws', async () => {
    mockBoard.findUnique.mockRejectedValueOnce(new Error('DB error'));

    const result = await createList('board1', 'New List', 'user1');

    expect(result).toEqual({ success: false, error: "You don't have access to this board" });
  });

  it('returns null when member has no role (falsy role branch)', async () => {
    // member?.role is undefined, so || null kicks in
    mockBoard.findUnique.mockResolvedValueOnce({
      id: 'board1',
      workspace: {
        ownerId: 'otherOwner',
        members: [{ userId: 'user1', role: undefined }],
      },
    });

    const result = await createList('board1', 'New List', 'user1');

    expect(result).toEqual({ success: false, error: "You don't have access to this board" });
  });
});

// ─── Additional branch coverage tests ────────────────────────────────

describe('createTask - branch coverage', () => {
  it('returns error when no role (no access)', async () => {
    mockTaskList.findUnique.mockResolvedValue({ boardId: 'board1' });
    mockBoard.findUnique.mockResolvedValueOnce(null); // no board => no role

    const result = await createTask('list1', 'Task', 'user1');

    expect(result).toEqual({ success: false, error: "You don't have access to this board" });
  });

  it('handles empty task list (newOrder=0)', async () => {
    mockTaskList.findUnique.mockResolvedValue({ boardId: 'board1' });
    mockBoard.findUnique.mockResolvedValueOnce(boardWithRole('ADMIN'));
    mockTask.findFirst.mockResolvedValue(null);
    const createdTask = { id: 'task1', title: 'Task', listId: 'list1', order: 0 };
    mockTask.create.mockResolvedValue(createdTask);

    const result = await createTask('list1', 'Task', 'user1');

    expect(result).toEqual({ success: true, task: createdTask });
  });
});

describe('updateTask - branch coverage', () => {
  it('returns error when no role (no access)', async () => {
    mockTask.findUnique.mockResolvedValue({ id: 'task1', list: { boardId: 'board1' } });
    mockBoard.findUnique.mockResolvedValueOnce(null);

    const result = await updateTask('task1', { title: 'x' }, 'user1');

    expect(result).toEqual({ success: false, error: "You don't have access to this board" });
  });

  it('returns error for VIEWER role', async () => {
    mockTask.findUnique.mockResolvedValue({ id: 'task1', list: { boardId: 'board1' } });
    mockBoard.findUnique.mockResolvedValueOnce(boardWithRole('VIEWER'));

    const result = await updateTask('task1', { title: 'x' }, 'user1');

    expect(result).toEqual({ success: false, error: 'Viewers cannot update tasks' });
  });
});

describe('deleteTask - branch coverage', () => {
  it('returns error when no role (no access)', async () => {
    mockTask.findUnique.mockResolvedValue({ id: 'task1', listId: 'list1', list: { boardId: 'board1' } });
    mockBoard.findUnique.mockResolvedValueOnce(null);

    const result = await deleteTask('task1', 'user1');

    expect(result).toEqual({ success: false, error: "You don't have access to this board" });
  });

  it('returns error for VIEWER role', async () => {
    mockTask.findUnique.mockResolvedValue({ id: 'task1', listId: 'list1', list: { boardId: 'board1' } });
    mockBoard.findUnique.mockResolvedValueOnce(boardWithRole('VIEWER'));

    const result = await deleteTask('task1', 'user1');

    expect(result).toEqual({ success: false, error: 'Viewers cannot delete tasks' });
  });
});

describe('reorderTasksInList - branch coverage', () => {
  it('returns error when no role (no access)', async () => {
    mockTaskList.findUnique.mockResolvedValue({ boardId: 'board1' });
    mockBoard.findUnique.mockResolvedValueOnce(null);

    const result = await reorderTasksInList('list1', ['t1'], 'user1');

    expect(result).toEqual({ success: false, error: "You don't have access to this board" });
  });

  it('returns error for VIEWER role', async () => {
    mockTaskList.findUnique.mockResolvedValue({ boardId: 'board1' });
    mockBoard.findUnique.mockResolvedValueOnce(boardWithRole('VIEWER'));

    const result = await reorderTasksInList('list1', ['t1'], 'user1');

    expect(result).toEqual({ success: false, error: 'Viewers cannot reorder tasks' });
  });
});

describe('moveTaskToList - branch coverage', () => {
  it('returns error when no role (no access)', async () => {
    mockTaskList.findUnique.mockResolvedValue({ boardId: 'board1' });
    mockTask.findUnique.mockResolvedValue({ listId: 'list1' });
    mockBoard.findUnique.mockResolvedValueOnce(null);

    const result = await moveTaskToList('task1', 'list2', 0, 'user1');

    expect(result).toEqual({ success: false, error: "You don't have access to this board" });
  });

  it('returns error for VIEWER role', async () => {
    mockTaskList.findUnique.mockResolvedValue({ boardId: 'board1' });
    mockTask.findUnique.mockResolvedValue({ listId: 'list1' });
    mockBoard.findUnique.mockResolvedValueOnce(boardWithRole('VIEWER'));

    const result = await moveTaskToList('task1', 'list2', 0, 'user1');

    expect(result).toEqual({ success: false, error: 'Viewers cannot move tasks' });
  });
});

describe('reorderLists - branch coverage', () => {
  it('returns error when no role (no access)', async () => {
    mockBoard.findUnique.mockResolvedValueOnce(null);

    const result = await reorderLists('board1', ['l1'], 'user1');

    expect(result).toEqual({ success: false, error: "You don't have access to this board" });
  });
});

describe('getWorkspaceBoards - branch coverage', () => {
  it('returns empty array when workspace not found', async () => {
    mockWorkspace.findUnique.mockResolvedValue(null);

    const result = await getWorkspaceBoards('ws1', 'user1');

    expect(result).toEqual([]);
  });
});

// ─── updateList ─────────────────────────────────────────────────────

describe('updateList', () => {
  beforeEach(() => jest.spyOn(console, 'error').mockImplementation(() => {}));
  afterEach(() => jest.restoreAllMocks());

  it('updates list successfully', async () => {
    mockTaskList.findUnique.mockResolvedValue({ boardId: 'board1' });
    mockBoard.findUnique.mockResolvedValue(boardWithRole('ADMIN'));
    const updated = { id: 'list1', title: 'New Title', tasks: [] };
    mockTaskList.update.mockResolvedValue(updated);

    const result = await updateList('list1', { title: 'New Title' }, 'user1');

    expect(result).toEqual({ success: true, list: updated });
    expect(mockEmitToBoard).toHaveBeenCalledWith('board1', 'list:updated', expect.anything(), 'user1');
  });

  it('returns error when list not found', async () => {
    mockTaskList.findUnique.mockResolvedValue(null);

    const result = await updateList('bad', { title: 'x' }, 'user1');

    expect(result).toEqual({ success: false, error: 'List not found' });
  });

  it('returns error when no access', async () => {
    mockTaskList.findUnique.mockResolvedValue({ boardId: 'board1' });
    mockBoard.findUnique.mockResolvedValue(null);

    const result = await updateList('list1', { title: 'x' }, 'user1');

    expect(result).toEqual({ success: false, error: "You don't have access to this board" });
  });

  it('returns error for VIEWER role', async () => {
    mockTaskList.findUnique.mockResolvedValue({ boardId: 'board1' });
    mockBoard.findUnique.mockResolvedValue(boardWithRole('VIEWER'));

    const result = await updateList('list1', { title: 'x' }, 'user1');

    expect(result).toEqual({ success: false, error: 'Viewers cannot update lists' });
  });

  it('handles errors gracefully', async () => {
    mockTaskList.findUnique.mockRejectedValue(new Error('DB error'));

    const result = await updateList('list1', { title: 'x' }, 'user1');

    expect(result).toEqual({ success: false, error: 'Failed to update list' });
  });
});

// ─── deleteList ─────────────────────────────────────────────────────

describe('deleteList', () => {
  beforeEach(() => jest.spyOn(console, 'error').mockImplementation(() => {}));
  afterEach(() => jest.restoreAllMocks());

  it('deletes list successfully', async () => {
    mockTaskList.findUnique.mockResolvedValue({ boardId: 'board1' });
    mockBoard.findUnique.mockResolvedValue(boardWithRole('ADMIN'));
    mockTaskList.delete.mockResolvedValue({});

    const result = await deleteList('list1', 'user1');

    expect(result).toEqual({ success: true });
    expect(mockEmitToBoard).toHaveBeenCalledWith('board1', 'list:deleted', expect.anything(), 'user1');
  });

  it('returns error when list not found', async () => {
    mockTaskList.findUnique.mockResolvedValue(null);

    const result = await deleteList('bad', 'user1');

    expect(result).toEqual({ success: false, error: 'List not found' });
  });

  it('returns error when no access', async () => {
    mockTaskList.findUnique.mockResolvedValue({ boardId: 'board1' });
    mockBoard.findUnique.mockResolvedValue(null);

    const result = await deleteList('list1', 'user1');

    expect(result).toEqual({ success: false, error: "You don't have access to this board" });
  });

  it('returns error for VIEWER role', async () => {
    mockTaskList.findUnique.mockResolvedValue({ boardId: 'board1' });
    mockBoard.findUnique.mockResolvedValue(boardWithRole('VIEWER'));

    const result = await deleteList('list1', 'user1');

    expect(result).toEqual({ success: false, error: 'Viewers cannot delete lists' });
  });

  it('handles errors gracefully', async () => {
    mockTaskList.findUnique.mockRejectedValue(new Error('DB error'));

    const result = await deleteList('list1', 'user1');

    expect(result).toEqual({ success: false, error: 'Failed to delete list' });
  });
});

// ─── clearListTasks ─────────────────────────────────────────────────

describe('clearListTasks', () => {
  beforeEach(() => jest.spyOn(console, 'error').mockImplementation(() => {}));
  afterEach(() => jest.restoreAllMocks());

  it('clears tasks successfully', async () => {
    mockTaskList.findUnique.mockResolvedValue({ boardId: 'board1' });
    mockBoard.findUnique.mockResolvedValue(boardWithRole('ADMIN'));
    mockTask.deleteMany.mockResolvedValue({ count: 5 });

    const result = await clearListTasks('list1', 'user1');

    expect(result).toEqual({ success: true });
    expect(mockTask.deleteMany).toHaveBeenCalledWith({ where: { listId: 'list1' } });
    expect(mockEmitToBoard).toHaveBeenCalledWith('board1', 'list:updated', expect.anything(), 'user1');
  });

  it('returns error when list not found', async () => {
    mockTaskList.findUnique.mockResolvedValue(null);

    const result = await clearListTasks('bad', 'user1');

    expect(result).toEqual({ success: false, error: 'List not found' });
  });

  it('returns error when no access', async () => {
    mockTaskList.findUnique.mockResolvedValue({ boardId: 'board1' });
    mockBoard.findUnique.mockResolvedValue(null);

    const result = await clearListTasks('list1', 'user1');

    expect(result).toEqual({ success: false, error: "You don't have access to this board" });
  });

  it('returns error for VIEWER role', async () => {
    mockTaskList.findUnique.mockResolvedValue({ boardId: 'board1' });
    mockBoard.findUnique.mockResolvedValue(boardWithRole('VIEWER'));

    const result = await clearListTasks('list1', 'user1');

    expect(result).toEqual({ success: false, error: 'Viewers cannot clear tasks' });
  });

  it('handles errors gracefully', async () => {
    mockTaskList.findUnique.mockRejectedValue(new Error('DB error'));

    const result = await clearListTasks('list1', 'user1');

    expect(result).toEqual({ success: false, error: 'Failed to clear tasks' });
  });
});
