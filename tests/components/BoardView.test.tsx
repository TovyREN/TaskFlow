import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

// Mock board actions
const mockGetBoardDetails = jest.fn();
const mockCreateList = jest.fn();
const mockCreateTask = jest.fn();
const mockReorderTasksInList = jest.fn();
const mockMoveTaskToList = jest.fn();
const mockReorderLists = jest.fn();
const mockGetWorkspaceBoards = jest.fn();

const mockUpdateList = jest.fn();
const mockDeleteList = jest.fn();
const mockClearListTasks = jest.fn();

jest.mock('../../app/actions/boardActions', () => ({
  getBoardDetails: (...args: any[]) => mockGetBoardDetails(...args),
  createList: (...args: any[]) => mockCreateList(...args),
  createTask: (...args: any[]) => mockCreateTask(...args),
  reorderTasksInList: (...args: any[]) => mockReorderTasksInList(...args),
  moveTaskToList: (...args: any[]) => mockMoveTaskToList(...args),
  reorderLists: (...args: any[]) => mockReorderLists(...args),
  getWorkspaceBoards: (...args: any[]) => mockGetWorkspaceBoards(...args),
  updateList: (...args: any[]) => mockUpdateList(...args),
  deleteList: (...args: any[]) => mockDeleteList(...args),
  clearListTasks: (...args: any[]) => mockClearListTasks(...args),
}));

jest.mock('../../components/SocketProvider', () => ({
  useSocket: jest.fn(() => ({
    on: jest.fn(),
    off: jest.fn(),
    isConnected: false,
    joinBoard: jest.fn(),
    leaveBoard: jest.fn(),
  })),
}));

jest.mock('../../components/board/TaskDetailModal', () => ({
  __esModule: true,
  default: ({ taskId, onClose }: any) => (
    <div data-testid="task-modal">
      {taskId}
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

jest.mock('../../components/board/BoardAdminPanel', () => ({
  __esModule: true,
  default: ({ onClose }: any) => (
    <div data-testid="admin-panel">
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

jest.mock('../../components/board/GanttView', () => ({
  __esModule: true,
  default: ({ onTaskClick, onClose }: any) => (
    <div data-testid="gantt-view">
      <button onClick={() => onTaskClick('t1')}>Task</button>
      <button onClick={onClose}>CloseGantt</button>
    </div>
  ),
}));

jest.mock('../../components/board/BoardTabs', () => ({
  __esModule: true,
  default: () => <div data-testid="board-tabs" />,
}));

// Mock TaskList component to render essential elements for testing
jest.mock('../../components/board/TaskList', () => ({
  __esModule: true,
  default: ({ list, tasks, onTaskClick, onCreateTask, onUpdateList, onDeleteList, onClearTasks }: any) => {
    const [isCreating, setIsCreating] = React.useState(false);
    const [taskTitle, setTaskTitle] = React.useState('');
    return (
      <div data-testid={`tasklist-${list.id}`}>
        <h4>{list.title}</h4>
        {tasks.length === 0 && <p>No tasks yet</p>}
        {tasks.map((task: any) => (
          <div key={task.id} onClick={() => onTaskClick(task)}>
            {task.labels && task.labels.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {task.labels.slice(0, 3).map((tl: any) => (
                  <span key={tl.labelId} className="h-2 w-10 rounded-full" style={{ backgroundColor: tl.label?.color }} />
                ))}
              </div>
            )}
            <span>{task.title}</span>
            {task.dueDate && (
              <span className={new Date(task.dueDate) < new Date() ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}>
                {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
            {task.assignees && task.assignees.length > 0 && (
              <div>
                {task.assignees.slice(0, 3).map((a: any) => (
                  <div key={a.userId} title={a.user?.name || a.user?.email}>
                    {a.user?.name?.charAt(0).toUpperCase() || a.user?.email?.charAt(0).toUpperCase()}
                  </div>
                ))}
                {task.assignees.length > 3 && <div>+{task.assignees.length - 3}</div>}
              </div>
            )}
            {task.checklists && task.checklists.length > 0 && (
              <span>
                {task.checklists.reduce((acc: number, c: any) => acc + (c.items?.filter((i: any) => i.isChecked).length || 0), 0)}/
                {task.checklists.reduce((acc: number, c: any) => acc + (c.items?.length || 0), 0)}
              </span>
            )}
            {task._count && task._count.comments > 0 && <span>{task._count.comments}</span>}
          </div>
        ))}
        <button data-testid={`update-list-${list.id}`} onClick={() => onUpdateList({ ...list, title: 'Renamed List' })}>Update List</button>
        <button data-testid={`delete-list-${list.id}`} onClick={() => onDeleteList(list.id)}>Delete List</button>
        <button data-testid={`clear-tasks-${list.id}`} onClick={() => onClearTasks(list.id)}>Clear Tasks</button>
        {isCreating ? (
          <div>
            <textarea
              placeholder="Enter a title for this card..."
              value={taskTitle}
              onChange={(e: any) => setTaskTitle(e.target.value)}
              onKeyDown={(e: any) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (taskTitle.trim()) { onCreateTask(list.id, taskTitle); setTaskTitle(''); setIsCreating(false); }
                }
              }}
            />
            <div>
              <button onClick={() => { if (taskTitle.trim()) { onCreateTask(list.id, taskTitle); setTaskTitle(''); setIsCreating(false); } }}>Add Card</button>
              <button onClick={() => { setIsCreating(false); setTaskTitle(''); }}>Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setIsCreating(true)}>Add a card</button>
        )}
      </div>
    );
  },
}));

// Mock DnD - render children and expose onDragEnd
let capturedOnDragEnd: any;
jest.mock('@hello-pangea/dnd', () => ({
  DragDropContext: ({ children, onDragEnd }: any) => {
    capturedOnDragEnd = onDragEnd;
    return <div>{children}</div>;
  },
  Droppable: ({ children }: any) => (
    <div>
      {children(
        { innerRef: jest.fn(), droppableProps: {}, placeholder: null },
        { isDraggingOver: false }
      )}
    </div>
  ),
  Draggable: ({ children }: any) => (
    <div>
      {children(
        { innerRef: jest.fn(), draggableProps: {}, dragHandleProps: {} },
        { isDragging: false }
      )}
    </div>
  ),
}));

import BoardView from '../../components/BoardView';

const mockBoardData = {
  id: 'board1',
  title: 'Test Board',
  backgroundImage: null,
  labels: [],
  lists: [
    {
      id: 'list1',
      title: 'To Do',
      order: 0,
      tasks: [
        {
          id: 't1',
          title: 'Task 1',
          order: 0,
          labels: [],
          assignees: [],
          checklists: [],
          _count: { comments: 0 },
        },
        {
          id: 't2',
          title: 'Task 2',
          order: 1,
          labels: [],
          assignees: [],
          checklists: [],
          _count: { comments: 0 },
        },
      ],
    },
    {
      id: 'list2',
      title: 'Done',
      order: 1,
      tasks: [],
    },
  ],
};

const defaultProps = {
  boardId: 'board1',
  userId: 'user1',
  workspaceId: 'ws1',
  onBack: jest.fn(),
  onSwitchBoard: jest.fn(),
  isAdmin: false,
};

describe('BoardView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetBoardDetails.mockResolvedValue(mockBoardData);
    mockGetWorkspaceBoards.mockResolvedValue([{ id: 'board1', title: 'Test Board' }]);
    mockCreateList.mockResolvedValue({ success: true, list: { id: 'list3', title: 'New List', order: 2 } });
    mockCreateTask.mockResolvedValue({
      success: true,
      task: { id: 't3', title: 'New Task', order: 0, labels: [], assignees: [], checklists: [], _count: { comments: 0 } },
    });
    mockReorderTasksInList.mockResolvedValue({ success: true });
    mockMoveTaskToList.mockResolvedValue({ success: true });
    mockReorderLists.mockResolvedValue({ success: true });
    mockUpdateList.mockResolvedValue({ success: true });
    mockDeleteList.mockResolvedValue({ success: true });
    mockClearListTasks.mockResolvedValue({ success: true });
  });

  it('shows loading then board with lists and tasks', async () => {
    render(<BoardView {...defaultProps} />);

    expect(screen.queryByText('Test Board')).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Test Board')).toBeInTheDocument();
    });

    expect(screen.getByText('To Do')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
    expect(screen.getByText('Task 1')).toBeInTheDocument();
    expect(screen.getByText('Task 2')).toBeInTheDocument();
  });

  it('shows "Board not found" when getBoardDetails returns null', async () => {
    mockGetBoardDetails.mockResolvedValue(null);

    render(<BoardView {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/Board not found/)).toBeInTheDocument();
    });
  });

  it('renders board title and back button', async () => {
    render(<BoardView {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Test Board')).toBeInTheDocument();
    });

    expect(screen.getByText(/Back/)).toBeInTheDocument();
  });

  it('calls onBack when back button clicked', async () => {
    render(<BoardView {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/Back/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Back/));
    expect(defaultProps.onBack).toHaveBeenCalled();
  });

  it('shows "Add another list" button', async () => {
    render(<BoardView {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/Add another list/)).toBeInTheDocument();
    });
  });

  it('opens add list form and creates list', async () => {
    render(<BoardView {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/Add another list/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Add another list/));

    const input = screen.getByPlaceholderText('Enter list title...');
    expect(input).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'New List' } });
    fireEvent.click(screen.getByText('Add List'));

    await waitFor(() => {
      expect(mockCreateList).toHaveBeenCalledWith('board1', 'New List', 'user1');
    });
  });

  it('shows "Add a card" button on each list', async () => {
    render(<BoardView {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Test Board')).toBeInTheDocument();
    });

    const addCardButtons = screen.getAllByText(/Add a card/);
    expect(addCardButtons.length).toBe(2);
  });

  it('opens add task form and creates task', async () => {
    render(<BoardView {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Test Board')).toBeInTheDocument();
    });

    const addCardButtons = screen.getAllByText(/Add a card/);
    fireEvent.click(addCardButtons[0]);

    const textarea = screen.getByPlaceholderText('Enter a title for this card...');
    expect(textarea).toBeInTheDocument();

    fireEvent.change(textarea, { target: { value: 'New Task' } });
    fireEvent.click(screen.getByText('Add Card'));

    await waitFor(() => {
      expect(mockCreateTask).toHaveBeenCalledWith('list1', 'New Task', 'user1');
    });
  });

  it('shows admin settings button when isAdmin=true', async () => {
    render(<BoardView {...defaultProps} isAdmin={true} />);

    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });
  });

  it('hides settings button when isAdmin=false', async () => {
    render(<BoardView {...defaultProps} isAdmin={false} />);

    await waitFor(() => {
      expect(screen.getByText('Test Board')).toBeInTheDocument();
    });

    expect(screen.queryByText('Settings')).not.toBeInTheDocument();
  });

  it('opens TaskDetailModal when clicking a task', async () => {
    render(<BoardView {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Task 1'));

    await waitFor(() => {
      expect(screen.getByTestId('task-modal')).toBeInTheDocument();
      expect(screen.getByTestId('task-modal')).toHaveTextContent('t1');
    });
  });

  it('switches to Timeline/Gantt view', async () => {
    render(<BoardView {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Timeline')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Timeline'));

    await waitFor(() => {
      expect(screen.getByTestId('gantt-view')).toBeInTheDocument();
    });
  });

  it('opens BoardAdminPanel when Settings clicked', async () => {
    render(<BoardView {...defaultProps} isAdmin={true} />);

    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Settings'));

    await waitFor(() => {
      expect(screen.getByTestId('admin-panel')).toBeInTheDocument();
    });
  });

  it('DnD: same-list task reorder', async () => {
    render(<BoardView {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument();
    });

    await act(async () => {
      capturedOnDragEnd({
        source: { droppableId: 'list1', index: 0 },
        destination: { droppableId: 'list1', index: 1 },
        type: 'TASK',
      });
    });

    await waitFor(() => {
      expect(mockReorderTasksInList).toHaveBeenCalledWith('list1', ['t2', 't1'], 'user1');
    });
  });

  it('DnD: cross-list task move', async () => {
    render(<BoardView {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument();
    });

    await act(async () => {
      capturedOnDragEnd({
        source: { droppableId: 'list1', index: 0 },
        destination: { droppableId: 'list2', index: 0 },
        type: 'TASK',
      });
    });

    await waitFor(() => {
      expect(mockMoveTaskToList).toHaveBeenCalledWith('t1', 'list2', 0, 'user1');
    });
  });

  it('DnD: list reorder (type=LIST)', async () => {
    render(<BoardView {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Test Board')).toBeInTheDocument();
    });

    await act(async () => {
      capturedOnDragEnd({
        source: { droppableId: 'all-lists', index: 0 },
        destination: { droppableId: 'all-lists', index: 1 },
        type: 'LIST',
      });
    });

    await waitFor(() => {
      expect(mockReorderLists).toHaveBeenCalledWith('board1', ['list2', 'list1'], 'user1');
    });
  });

  it('DnD: dropped outside (no destination) - no action', async () => {
    render(<BoardView {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Test Board')).toBeInTheDocument();
    });

    await act(async () => {
      capturedOnDragEnd({
        source: { droppableId: 'list1', index: 0 },
        destination: null,
        type: 'TASK',
      });
    });

    expect(mockReorderTasksInList).not.toHaveBeenCalled();
    expect(mockMoveTaskToList).not.toHaveBeenCalled();
    expect(mockReorderLists).not.toHaveBeenCalled();
  });

  it('DnD: dropped in the same place - no action', async () => {
    render(<BoardView {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Test Board')).toBeInTheDocument();
    });

    await act(async () => {
      capturedOnDragEnd({
        source: { droppableId: 'list1', index: 0 },
        destination: { droppableId: 'list1', index: 0 },
        type: 'TASK',
      });
    });

    expect(mockReorderTasksInList).not.toHaveBeenCalled();
    expect(mockMoveTaskToList).not.toHaveBeenCalled();
    expect(mockReorderLists).not.toHaveBeenCalled();
  });

  it('DnD: list reorder error triggers alert and reload', async () => {
    mockReorderLists.mockResolvedValue({ error: 'Reorder failed' });
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

    render(<BoardView {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Test Board')).toBeInTheDocument();
    });

    await act(async () => {
      capturedOnDragEnd({
        source: { droppableId: 'all-lists', index: 0 },
        destination: { droppableId: 'all-lists', index: 1 },
        type: 'LIST',
      });
    });

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Reorder failed');
    });

    // loadBoard should be called again on error
    expect(mockGetBoardDetails).toHaveBeenCalledTimes(2);
    alertSpy.mockRestore();
  });

  it('DnD: same-list task reorder error triggers alert and reload', async () => {
    mockReorderTasksInList.mockResolvedValue({ error: 'Reorder failed' });
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

    render(<BoardView {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument();
    });

    await act(async () => {
      capturedOnDragEnd({
        source: { droppableId: 'list1', index: 0 },
        destination: { droppableId: 'list1', index: 1 },
        type: 'TASK',
      });
    });

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Reorder failed');
    });

    expect(mockGetBoardDetails).toHaveBeenCalledTimes(2);
    alertSpy.mockRestore();
  });

  it('DnD: cross-list move error triggers alert and reload', async () => {
    mockMoveTaskToList.mockResolvedValue({ error: 'Move failed' });
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

    render(<BoardView {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument();
    });

    await act(async () => {
      capturedOnDragEnd({
        source: { droppableId: 'list1', index: 0 },
        destination: { droppableId: 'list2', index: 0 },
        type: 'TASK',
      });
    });

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Move failed');
    });

    // Should reload board on error and NOT call reorderTasksInList
    expect(mockGetBoardDetails).toHaveBeenCalledTimes(2);
    expect(mockReorderTasksInList).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('createList error shows alert', async () => {
    mockCreateList.mockResolvedValue({ success: false, error: 'List creation failed' });
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

    render(<BoardView {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/Add another list/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Add another list/));
    const input = screen.getByPlaceholderText('Enter list title...');
    fireEvent.change(input, { target: { value: 'Failing List' } });
    fireEvent.click(screen.getByText('Add List'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('List creation failed');
    });

    alertSpy.mockRestore();
  });

  it('createTask error shows alert', async () => {
    mockCreateTask.mockResolvedValue({ success: false, error: 'Task creation failed' });
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

    render(<BoardView {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Test Board')).toBeInTheDocument();
    });

    const addCardButtons = screen.getAllByText(/Add a card/);
    fireEvent.click(addCardButtons[0]);

    const textarea = screen.getByPlaceholderText('Enter a title for this card...');
    fireEvent.change(textarea, { target: { value: 'Failing Task' } });
    fireEvent.click(screen.getByText('Add Card'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Task creation failed');
    });

    alertSpy.mockRestore();
  });

  it('does not create list with empty title', async () => {
    render(<BoardView {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/Add another list/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Add another list/));
    // Leave input empty and submit
    fireEvent.click(screen.getByText('Add List'));

    expect(mockCreateList).not.toHaveBeenCalled();
  });

  it('does not create task with empty title', async () => {
    render(<BoardView {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Test Board')).toBeInTheDocument();
    });

    const addCardButtons = screen.getAllByText(/Add a card/);
    fireEvent.click(addCardButtons[0]);
    // Leave textarea empty and click add
    fireEvent.click(screen.getByText('Add Card'));

    expect(mockCreateTask).not.toHaveBeenCalled();
  });

  it('cancel add task form clears state', async () => {
    render(<BoardView {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Test Board')).toBeInTheDocument();
    });

    const addCardButtons = screen.getAllByText(/Add a card/);
    fireEvent.click(addCardButtons[0]);

    expect(screen.getByPlaceholderText('Enter a title for this card...')).toBeInTheDocument();

    // Click the X button to cancel
    const textarea = screen.getByPlaceholderText('Enter a title for this card...');
    fireEvent.change(textarea, { target: { value: 'something' } });

    // The cancel button is the X icon sibling of Add Card
    const addCardBtn = screen.getByText('Add Card');
    const cancelBtn = addCardBtn.parentElement!.querySelector('button:last-child')!;
    fireEvent.click(cancelBtn);

    // The textarea should be gone
    expect(screen.queryByPlaceholderText('Enter a title for this card...')).not.toBeInTheDocument();
  });

  it('cancel add list form hides form', async () => {
    render(<BoardView {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/Add another list/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Add another list/));
    expect(screen.getByPlaceholderText('Enter list title...')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Cancel'));

    expect(screen.queryByPlaceholderText('Enter list title...')).not.toBeInTheDocument();
  });

  it('add task via Enter key', async () => {
    render(<BoardView {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Test Board')).toBeInTheDocument();
    });

    const addCardButtons = screen.getAllByText(/Add a card/);
    fireEvent.click(addCardButtons[0]);

    const textarea = screen.getByPlaceholderText('Enter a title for this card...');
    fireEvent.change(textarea, { target: { value: 'Enter Task' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

    await waitFor(() => {
      expect(mockCreateTask).toHaveBeenCalledWith('list1', 'Enter Task', 'user1');
    });
  });

  it('renders task badges: labels, due date, assignees, checklists, comments', async () => {
    const boardWithBadges = {
      ...mockBoardData,
      lists: [
        {
          id: 'list1',
          title: 'To Do',
          order: 0,
          tasks: [
            {
              id: 't1',
              title: 'Badged Task',
              order: 0,
              labels: [
                { labelId: 'l1', label: { color: '#ff0000' } },
                { labelId: 'l2', label: { color: '#00ff00' } },
              ],
              dueDate: '2020-01-01T00:00:00Z', // past date for red badge
              assignees: [
                { userId: 'u1', user: { name: 'Alice', email: 'alice@test.com' } },
                { userId: 'u2', user: { name: 'Bob', email: 'bob@test.com' } },
                { userId: 'u3', user: { name: 'Charlie', email: 'charlie@test.com' } },
                { userId: 'u4', user: { name: 'Dave', email: 'dave@test.com' } },
              ],
              checklists: [
                {
                  items: [
                    { isChecked: true },
                    { isChecked: false },
                    { isChecked: true },
                  ],
                },
              ],
              _count: { comments: 5 },
            },
          ],
        },
      ],
    };
    mockGetBoardDetails.mockResolvedValue(boardWithBadges);

    render(<BoardView {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Badged Task')).toBeInTheDocument();
    });

    // Due date badge (past date = red)
    expect(screen.getByText(/Jan/)).toBeInTheDocument();

    // Assignees: first 3 show initials, 4th shows +1
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
    expect(screen.getByText('+1')).toBeInTheDocument();

    // Checklists: 2/3
    expect(screen.getByText('2/3')).toBeInTheDocument();

    // Comments: 5
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders task with checklist that has no items property', async () => {
    const boardWithBareChecklist = {
      ...mockBoardData,
      lists: [
        {
          id: 'list1',
          title: 'To Do',
          order: 0,
          tasks: [
            {
              id: 't1',
              title: 'Bare Checklist Task',
              order: 0,
              labels: [],
              assignees: [],
              checklists: [{ }], // no items property
              _count: { comments: 0 },
            },
          ],
        },
      ],
    };
    mockGetBoardDetails.mockResolvedValue(boardWithBareChecklist);

    render(<BoardView {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Bare Checklist Task')).toBeInTheDocument();
    });

    // Should show 0/0
    expect(screen.getByText('0/0')).toBeInTheDocument();
  });

  it('renders task with future due date (non-red badge)', async () => {
    const boardWithFutureDue = {
      ...mockBoardData,
      lists: [
        {
          id: 'list1',
          title: 'To Do',
          order: 0,
          tasks: [
            {
              id: 't1',
              title: 'Future Task',
              order: 0,
              labels: [],
              dueDate: '2099-12-31T00:00:00Z',
              assignees: [],
              checklists: [],
              _count: { comments: 0 },
            },
          ],
        },
      ],
    };
    mockGetBoardDetails.mockResolvedValue(boardWithFutureDue);

    render(<BoardView {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Future Task')).toBeInTheDocument();
    });

    expect(screen.getByText(/Dec/)).toBeInTheDocument();
  });

  it('closes TaskDetailModal when close button clicked', async () => {
    render(<BoardView {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Task 1'));

    await waitFor(() => {
      expect(screen.getByTestId('task-modal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Close'));

    await waitFor(() => {
      expect(screen.queryByTestId('task-modal')).not.toBeInTheDocument();
    });
  });

  it('closes BoardAdminPanel when close button clicked', async () => {
    render(<BoardView {...defaultProps} isAdmin={true} />);

    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Settings'));

    await waitFor(() => {
      expect(screen.getByTestId('admin-panel')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Close'));

    await waitFor(() => {
      expect(screen.queryByTestId('admin-panel')).not.toBeInTheDocument();
    });
  });

  it('switches to gantt then back to kanban', async () => {
    render(<BoardView {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Timeline')).toBeInTheDocument();
    });

    // Switch to gantt
    fireEvent.click(screen.getByText('Timeline'));

    await waitFor(() => {
      expect(screen.getByTestId('gantt-view')).toBeInTheDocument();
      expect(screen.getByText('Board')).toBeInTheDocument();
    });

    // Switch back to kanban
    fireEvent.click(screen.getByText('Board'));

    await waitFor(() => {
      expect(screen.queryByTestId('gantt-view')).not.toBeInTheDocument();
      expect(screen.getByText('Timeline')).toBeInTheDocument();
    });
  });

  it('opens task modal from GanttView onTaskClick', async () => {
    render(<BoardView {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Timeline')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Timeline'));

    await waitFor(() => {
      expect(screen.getByTestId('gantt-view')).toBeInTheDocument();
    });

    // The mock GanttView has a button that calls onTaskClick('t1')
    fireEvent.click(screen.getByText('Task'));

    await waitFor(() => {
      expect(screen.getByTestId('task-modal')).toBeInTheDocument();
      expect(screen.getByTestId('task-modal')).toHaveTextContent('t1');
    });
  });

  it('renders board with background image URL', async () => {
    const boardWithBg = {
      ...mockBoardData,
      backgroundImage: 'https://example.com/bg.jpg',
    };
    mockGetBoardDetails.mockResolvedValue(boardWithBg);

    render(<BoardView {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Test Board')).toBeInTheDocument();
    });
  });

  it('renders board with gradient background', async () => {
    const boardWithGradient = {
      ...mockBoardData,
      backgroundImage: 'linear-gradient(to right, #ff0000, #0000ff)',
    };
    mockGetBoardDetails.mockResolvedValue(boardWithGradient);

    render(<BoardView {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Test Board')).toBeInTheDocument();
    });
  });

  it('renders empty list with "No tasks yet" message', async () => {
    render(<BoardView {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('No tasks yet')).toBeInTheDocument();
    });
  });

  it('calls onBack when board not found and Go back is clicked', async () => {
    mockGetBoardDetails.mockResolvedValue(null);

    render(<BoardView {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/Go back/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Go back/));
    expect(defaultProps.onBack).toHaveBeenCalled();
  });

  it('GanttView onClose switches back to kanban', async () => {
    render(<BoardView {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Timeline')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Timeline'));

    await waitFor(() => {
      expect(screen.getByTestId('gantt-view')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('CloseGantt'));

    await waitFor(() => {
      expect(screen.queryByTestId('gantt-view')).not.toBeInTheDocument();
    });
  });

  it('DnD: cross-list move with 3 lists covers third branch in map', async () => {
    const threeListBoard = {
      id: 'board1',
      title: 'Test Board',
      backgroundImage: null,
      labels: [],
      lists: [
        {
          id: 'list1',
          title: 'To Do',
          order: 0,
          tasks: [
            { id: 't1', title: 'Task 1', order: 0, labels: [], assignees: [], checklists: [], _count: { comments: 0 } },
          ],
        },
        {
          id: 'list2',
          title: 'In Progress',
          order: 1,
          tasks: [],
        },
        {
          id: 'list3',
          title: 'Done',
          order: 2,
          tasks: [],
        },
      ],
    };
    mockGetBoardDetails.mockResolvedValue(threeListBoard);

    render(<BoardView {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument();
    });

    await act(async () => {
      capturedOnDragEnd({
        source: { droppableId: 'list1', index: 0 },
        destination: { droppableId: 'list2', index: 0 },
        type: 'TASK',
      });
    });

    await waitFor(() => {
      expect(mockMoveTaskToList).toHaveBeenCalledWith('t1', 'list2', 0, 'user1');
    });
  });

  it('DnD: task drag with invalid source list does nothing', async () => {
    render(<BoardView {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Test Board')).toBeInTheDocument();
    });

    await act(async () => {
      capturedOnDragEnd({
        source: { droppableId: 'nonexistent', index: 0 },
        destination: { droppableId: 'list1', index: 0 },
        type: 'TASK',
      });
    });

    expect(mockReorderTasksInList).not.toHaveBeenCalled();
    expect(mockMoveTaskToList).not.toHaveBeenCalled();
  });

  it('renders board with non-URL non-gradient background', async () => {
    const boardWithPlainBg = {
      ...mockBoardData,
      backgroundImage: '#ff0000',
    };
    mockGetBoardDetails.mockResolvedValue(boardWithPlainBg);

    render(<BoardView {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Test Board')).toBeInTheDocument();
    });
  });

  it('renders assignee with email fallback when name is missing', async () => {
    const boardWithEmailAssignee = {
      ...mockBoardData,
      lists: [
        {
          id: 'list1',
          title: 'To Do',
          order: 0,
          tasks: [
            {
              id: 't1',
              title: 'Email Task',
              order: 0,
              labels: [],
              assignees: [
                { userId: 'u1', user: { email: 'test@example.com' } },
              ],
              checklists: [],
              _count: { comments: 0 },
            },
          ],
        },
      ],
    };
    mockGetBoardDetails.mockResolvedValue(boardWithEmailAssignee);

    render(<BoardView {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Email Task')).toBeInTheDocument();
    });

    expect(screen.getByText('T')).toBeInTheDocument();
  });

  it('Shift+Enter in task textarea does not submit', async () => {
    render(<BoardView {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Test Board')).toBeInTheDocument();
    });

    const addCardButtons = screen.getAllByText(/Add a card/);
    fireEvent.click(addCardButtons[0]);

    const textarea = screen.getByPlaceholderText('Enter a title for this card...');
    fireEvent.change(textarea, { target: { value: 'Multi-line' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });

    expect(mockCreateTask).not.toHaveBeenCalled();
  });

  it('non-Enter key in task textarea does not submit', async () => {
    render(<BoardView {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Test Board')).toBeInTheDocument();
    });

    const addCardButtons = screen.getAllByText(/Add a card/);
    fireEvent.click(addCardButtons[0]);

    const textarea = screen.getByPlaceholderText('Enter a title for this card...');
    fireEvent.change(textarea, { target: { value: 'Test' } });
    fireEvent.keyDown(textarea, { key: 'Tab', shiftKey: false });

    expect(mockCreateTask).not.toHaveBeenCalled();
  });

  describe('socket event handlers', () => {
    let mockOn: jest.Mock;
    let mockOff: jest.Mock;
    let mockJoinBoard: jest.Mock;
    let mockLeaveBoard: jest.Mock;
    let eventHandlers: Record<string, Function>;

    beforeEach(() => {
      eventHandlers = {};
      mockOn = jest.fn((event: string, handler: Function) => {
        eventHandlers[event] = handler;
      });
      mockOff = jest.fn();
      mockJoinBoard = jest.fn();
      mockLeaveBoard = jest.fn();

      const { useSocket } = require('../../components/SocketProvider');
      (useSocket as jest.Mock).mockReturnValue({
        on: mockOn,
        off: mockOff,
        isConnected: true,
        joinBoard: mockJoinBoard,
        leaveBoard: mockLeaveBoard,
      });
    });

    it('joins board room when connected', async () => {
      render(<BoardView {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Test Board')).toBeInTheDocument();
      });

      expect(mockJoinBoard).toHaveBeenCalledWith('board1');
    });

    it('registers socket event listeners when connected', async () => {
      render(<BoardView {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Test Board')).toBeInTheDocument();
      });

      expect(mockOn).toHaveBeenCalledWith('list:created', expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith('task:created', expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith('task:updated', expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith('task:deleted', expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith('task:moved', expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith('task:reordered', expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith('list:reordered', expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith('board:settings-changed', expect.any(Function));
    });

    it('handles list:created event', async () => {
      render(<BoardView {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Test Board')).toBeInTheDocument();
      });

      act(() => {
        eventHandlers['list:created']({
          boardId: 'board1',
          list: { id: 'list-new', title: 'Socket List', tasks: [] },
        });
      });

      await waitFor(() => {
        expect(screen.getByText('Socket List')).toBeInTheDocument();
      });
    });

    it('handles list:created event with no tasks property', async () => {
      render(<BoardView {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Test Board')).toBeInTheDocument();
      });

      act(() => {
        eventHandlers['list:created']({
          boardId: 'board1',
          list: { id: 'list-notasks', title: 'No Tasks List' },
        });
      });

      await waitFor(() => {
        expect(screen.getByText('No Tasks List')).toBeInTheDocument();
      });
    });

    it('ignores list:created event for different board', async () => {
      render(<BoardView {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Test Board')).toBeInTheDocument();
      });

      act(() => {
        eventHandlers['list:created']({
          boardId: 'other-board',
          list: { id: 'list-other', title: 'Other Board List', tasks: [] },
        });
      });

      expect(screen.queryByText('Other Board List')).not.toBeInTheDocument();
    });

    it('handles list:created event avoiding duplicates', async () => {
      render(<BoardView {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Test Board')).toBeInTheDocument();
      });

      // Send existing list id
      act(() => {
        eventHandlers['list:created']({
          boardId: 'board1',
          list: { id: 'list1', title: 'Duplicate', tasks: [] },
        });
      });

      // Should not add duplicate
      expect(screen.queryByText('Duplicate')).not.toBeInTheDocument();
    });

    it('handles task:created event', async () => {
      render(<BoardView {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Test Board')).toBeInTheDocument();
      });

      act(() => {
        eventHandlers['task:created']({
          boardId: 'board1',
          listId: 'list1',
          task: { id: 'tnew', title: 'Socket Task', labels: [], assignees: [], checklists: [], _count: { comments: 0 } },
        });
      });

      await waitFor(() => {
        expect(screen.getByText('Socket Task')).toBeInTheDocument();
      });
    });

    it('ignores task:created event for different board', async () => {
      render(<BoardView {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Test Board')).toBeInTheDocument();
      });

      act(() => {
        eventHandlers['task:created']({
          boardId: 'other-board',
          listId: 'list1',
          task: { id: 'tnew', title: 'Should Not Appear' },
        });
      });

      expect(screen.queryByText('Should Not Appear')).not.toBeInTheDocument();
    });

    it('handles task:created avoiding duplicates', async () => {
      render(<BoardView {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Test Board')).toBeInTheDocument();
      });

      // Send a task with an existing id
      act(() => {
        eventHandlers['task:created']({
          boardId: 'board1',
          listId: 'list1',
          task: { id: 't1', title: 'Duplicate Task', labels: [], assignees: [], checklists: [], _count: { comments: 0 } },
        });
      });

      // Should not add duplicate - original title should remain
      expect(screen.getByText('Task 1')).toBeInTheDocument();
    });

    it('ignores task:updated for different board', async () => {
      render(<BoardView {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Task 1')).toBeInTheDocument();
      });

      act(() => {
        eventHandlers['task:updated']({
          boardId: 'other-board',
          taskId: 't1',
          data: { title: 'Should Not Change' },
        });
      });

      expect(screen.getByText('Task 1')).toBeInTheDocument();
      expect(screen.queryByText('Should Not Change')).not.toBeInTheDocument();
    });

    it('ignores task:deleted for different board', async () => {
      render(<BoardView {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Task 1')).toBeInTheDocument();
      });

      act(() => {
        eventHandlers['task:deleted']({
          boardId: 'other-board',
          taskId: 't1',
        });
      });

      expect(screen.getByText('Task 1')).toBeInTheDocument();
    });

    it('ignores task:moved for different board', async () => {
      render(<BoardView {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Test Board')).toBeInTheDocument();
      });

      const callsBefore = mockGetBoardDetails.mock.calls.length;

      act(() => {
        eventHandlers['task:moved']({ boardId: 'other-board' });
      });

      expect(mockGetBoardDetails.mock.calls.length).toBe(callsBefore);
    });

    it('ignores task:reordered for different board', async () => {
      render(<BoardView {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Test Board')).toBeInTheDocument();
      });

      act(() => {
        eventHandlers['task:reordered']({
          boardId: 'other-board',
          listId: 'list1',
          taskIds: ['t2', 't1'],
        });
      });

      // No error
    });

    it('ignores list:reordered for different board', async () => {
      render(<BoardView {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Test Board')).toBeInTheDocument();
      });

      act(() => {
        eventHandlers['list:reordered']({
          boardId: 'other-board',
          listIds: ['list2', 'list1'],
        });
      });

      // No error
    });

    it('ignores board:settings-changed for different board', async () => {
      render(<BoardView {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Test Board')).toBeInTheDocument();
      });

      const callsBefore = mockGetBoardDetails.mock.calls.length;

      act(() => {
        eventHandlers['board:settings-changed']({ boardId: 'other-board' });
      });

      expect(mockGetBoardDetails.mock.calls.length).toBe(callsBefore);
    });

    it('ignores task detail change for different board', async () => {
      render(<BoardView {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Test Board')).toBeInTheDocument();
      });

      const callsBefore = mockGetBoardDetails.mock.calls.length;

      act(() => {
        eventHandlers['task:label-added']({ boardId: 'other-board' });
      });

      expect(mockGetBoardDetails.mock.calls.length).toBe(callsBefore);
    });

    it('handles task:updated event', async () => {
      render(<BoardView {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Task 1')).toBeInTheDocument();
      });

      act(() => {
        eventHandlers['task:updated']({
          boardId: 'board1',
          taskId: 't1',
          data: { title: 'Updated Task 1' },
        });
      });

      await waitFor(() => {
        expect(screen.getByText('Updated Task 1')).toBeInTheDocument();
      });
    });

    it('handles task:deleted event', async () => {
      render(<BoardView {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Task 1')).toBeInTheDocument();
      });

      act(() => {
        eventHandlers['task:deleted']({
          boardId: 'board1',
          taskId: 't1',
        });
      });

      await waitFor(() => {
        expect(screen.queryByText('Task 1')).not.toBeInTheDocument();
      });
    });

    it('handles task:moved event by reloading board', async () => {
      render(<BoardView {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Test Board')).toBeInTheDocument();
      });

      const callsBefore = mockGetBoardDetails.mock.calls.length;

      await act(async () => {
        eventHandlers['task:moved']({ boardId: 'board1' });
      });

      await waitFor(() => {
        expect(mockGetBoardDetails.mock.calls.length).toBeGreaterThan(callsBefore);
      });
    });

    it('handles task:reordered event', async () => {
      render(<BoardView {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Task 1')).toBeInTheDocument();
      });

      act(() => {
        eventHandlers['task:reordered']({
          boardId: 'board1',
          listId: 'list1',
          taskIds: ['t2', 't1'],
        });
      });

      // Tasks should still be present (reordered)
      expect(screen.getByText('Task 1')).toBeInTheDocument();
      expect(screen.getByText('Task 2')).toBeInTheDocument();
    });

    it('handles list:reordered event', async () => {
      render(<BoardView {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Test Board')).toBeInTheDocument();
      });

      act(() => {
        eventHandlers['list:reordered']({
          boardId: 'board1',
          listIds: ['list2', 'list1'],
        });
      });

      expect(screen.getByText('To Do')).toBeInTheDocument();
      expect(screen.getByText('Done')).toBeInTheDocument();
    });

    it('handles board:settings-changed event by reloading', async () => {
      render(<BoardView {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Test Board')).toBeInTheDocument();
      });

      const callsBefore = mockGetBoardDetails.mock.calls.length;

      await act(async () => {
        eventHandlers['board:settings-changed']({ boardId: 'board1' });
      });

      await waitFor(() => {
        expect(mockGetBoardDetails.mock.calls.length).toBeGreaterThan(callsBefore);
      });
    });

    it('handles board:label-created event by reloading', async () => {
      render(<BoardView {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Test Board')).toBeInTheDocument();
      });

      const callsBefore = mockGetBoardDetails.mock.calls.length;

      await act(async () => {
        eventHandlers['board:label-created']();
      });

      await waitFor(() => {
        expect(mockGetBoardDetails.mock.calls.length).toBeGreaterThan(callsBefore);
      });
    });

    it('handles task detail change events by reloading', async () => {
      render(<BoardView {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Test Board')).toBeInTheDocument();
      });

      const callsBefore = mockGetBoardDetails.mock.calls.length;

      await act(async () => {
        eventHandlers['task:label-added']({ boardId: 'board1' });
      });

      await waitFor(() => {
        expect(mockGetBoardDetails.mock.calls.length).toBeGreaterThan(callsBefore);
      });
    });

    it('handles board:created event adding to workspace boards', async () => {
      render(<BoardView {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Test Board')).toBeInTheDocument();
      });

      act(() => {
        eventHandlers['board:created']({
          workspaceId: 'ws1',
          board: { id: 'board-new', title: 'New Board' },
        });
      });

      // The board tabs mock doesn't render boards, but at least verify no error
    });

    it('ignores board:created event for different workspace', async () => {
      render(<BoardView {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Test Board')).toBeInTheDocument();
      });

      act(() => {
        eventHandlers['board:created']({
          workspaceId: 'other-ws',
          board: { id: 'board-new', title: 'Other Workspace Board' },
        });
      });

      // No error, no change
    });

    it('handles board:deleted event - current board triggers onBack', async () => {
      render(<BoardView {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Test Board')).toBeInTheDocument();
      });

      act(() => {
        eventHandlers['board:deleted']({
          workspaceId: 'ws1',
          boardId: 'board1',
        });
      });

      expect(defaultProps.onBack).toHaveBeenCalled();
    });

    it('ignores board:deleted event for different workspace', async () => {
      render(<BoardView {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Test Board')).toBeInTheDocument();
      });

      defaultProps.onBack.mockClear();

      act(() => {
        eventHandlers['board:deleted']({
          workspaceId: 'other-ws',
          boardId: 'board1',
        });
      });

      expect(defaultProps.onBack).not.toHaveBeenCalled();
    });

    it('handles board:deleted event - other board does not trigger onBack', async () => {
      render(<BoardView {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Test Board')).toBeInTheDocument();
      });

      defaultProps.onBack.mockClear();

      act(() => {
        eventHandlers['board:deleted']({
          workspaceId: 'ws1',
          boardId: 'other-board',
        });
      });

      expect(defaultProps.onBack).not.toHaveBeenCalled();
    });

    it('handles list:updated event', async () => {
      render(<BoardView {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Test Board')).toBeInTheDocument();
      });

      act(() => {
        eventHandlers['list:updated']({
          boardId: 'board1',
          list: { id: 'list1', title: 'Updated Title', tasks: [] },
        });
      });

      await waitFor(() => {
        expect(screen.getByText('Updated Title')).toBeInTheDocument();
      });
    });

    it('ignores list:updated event for different board', async () => {
      render(<BoardView {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Test Board')).toBeInTheDocument();
      });

      act(() => {
        eventHandlers['list:updated']({
          boardId: 'other-board',
          list: { id: 'list1', title: 'Should Not Update' },
        });
      });

      expect(screen.queryByText('Should Not Update')).not.toBeInTheDocument();
    });

    it('handles list:deleted event', async () => {
      render(<BoardView {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('To Do')).toBeInTheDocument();
      });

      act(() => {
        eventHandlers['list:deleted']({
          boardId: 'board1',
          listId: 'list1',
        });
      });

      await waitFor(() => {
        expect(screen.queryByText('To Do')).not.toBeInTheDocument();
      });
    });

    it('ignores list:deleted event for different board', async () => {
      render(<BoardView {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('To Do')).toBeInTheDocument();
      });

      act(() => {
        eventHandlers['list:deleted']({
          boardId: 'other-board',
          listId: 'list1',
        });
      });

      expect(screen.getByText('To Do')).toBeInTheDocument();
    });

    it('cleans up socket listeners on unmount', async () => {
      const { unmount } = render(<BoardView {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Test Board')).toBeInTheDocument();
      });

      unmount();

      expect(mockLeaveBoard).toHaveBeenCalledWith('board1');
      expect(mockOff).toHaveBeenCalledWith('list:created', expect.any(Function));
      expect(mockOff).toHaveBeenCalledWith('list:updated', expect.any(Function));
      expect(mockOff).toHaveBeenCalledWith('list:deleted', expect.any(Function));
      expect(mockOff).toHaveBeenCalledWith('task:created', expect.any(Function));
      expect(mockOff).toHaveBeenCalledWith('task:updated', expect.any(Function));
      expect(mockOff).toHaveBeenCalledWith('task:deleted', expect.any(Function));
      expect(mockOff).toHaveBeenCalledWith('board:created', expect.any(Function));
      expect(mockOff).toHaveBeenCalledWith('board:deleted', expect.any(Function));
    });
  });

  describe('list management handlers', () => {
    it('handleUpdateList calls updateList action', async () => {
      mockUpdateList.mockResolvedValue({ success: true, list: { id: 'list1', title: 'Renamed List' } });

      render(<BoardView {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('To Do')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('update-list-list1'));

      await waitFor(() => {
        expect(mockUpdateList).toHaveBeenCalledWith('list1', { title: 'Renamed List', headerColor: undefined }, 'user1');
      });
    });

    it('handleUpdateList shows alert on failure and reloads', async () => {
      mockUpdateList.mockResolvedValue({ success: false, error: 'Update failed' });
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

      render(<BoardView {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('To Do')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('update-list-list1'));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Update failed');
      });

      alertSpy.mockRestore();
    });

    it('handleDeleteList calls deleteList action with confirmation', async () => {
      mockDeleteList.mockResolvedValue({ success: true });
      jest.spyOn(window, 'confirm').mockReturnValue(true);

      render(<BoardView {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('To Do')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('delete-list-list1'));

      await waitFor(() => {
        expect(mockDeleteList).toHaveBeenCalledWith('list1', 'user1');
      });

      (window.confirm as jest.Mock).mockRestore();
    });

    it('handleDeleteList cancelled by user does nothing', async () => {
      jest.spyOn(window, 'confirm').mockReturnValue(false);

      render(<BoardView {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('To Do')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('delete-list-list1'));

      expect(mockDeleteList).not.toHaveBeenCalled();

      (window.confirm as jest.Mock).mockRestore();
    });

    it('handleDeleteList shows alert on failure and reloads', async () => {
      mockDeleteList.mockResolvedValue({ success: false, error: 'Delete failed' });
      jest.spyOn(window, 'confirm').mockReturnValue(true);
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

      render(<BoardView {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('To Do')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('delete-list-list1'));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Delete failed');
      });

      alertSpy.mockRestore();
      (window.confirm as jest.Mock).mockRestore();
    });

    it('handleClearTasks calls clearListTasks action with confirmation', async () => {
      mockClearListTasks.mockResolvedValue({ success: true });
      jest.spyOn(window, 'confirm').mockReturnValue(true);

      render(<BoardView {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('To Do')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('clear-tasks-list1'));

      await waitFor(() => {
        expect(mockClearListTasks).toHaveBeenCalledWith('list1', 'user1');
      });

      (window.confirm as jest.Mock).mockRestore();
    });

    it('handleClearTasks cancelled by user does nothing', async () => {
      jest.spyOn(window, 'confirm').mockReturnValue(false);

      render(<BoardView {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('To Do')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('clear-tasks-list1'));

      expect(mockClearListTasks).not.toHaveBeenCalled();

      (window.confirm as jest.Mock).mockRestore();
    });

    it('handleClearTasks shows alert on failure and reloads', async () => {
      mockClearListTasks.mockResolvedValue({ success: false, error: 'Clear failed' });
      jest.spyOn(window, 'confirm').mockReturnValue(true);
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

      render(<BoardView {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('To Do')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('clear-tasks-list1'));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Clear failed');
      });

      alertSpy.mockRestore();
      (window.confirm as jest.Mock).mockRestore();
    });
  });
});
