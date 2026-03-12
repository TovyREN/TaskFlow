import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import TaskList from '../../components/board/TaskList'; // Adjust path
import { TaskList as TaskListType, Task, User } from '../../types';

// 1. Mock the Drag and Drop library
jest.mock('@hello-pangea/dnd', () => ({
  Droppable: ({ children }: any) => children({
    draggableProps: {},
    innerRef: jest.fn(),
    droppableProps: {},
  }, { isDraggingOver: false }),
  Draggable: ({ children }: any) => children({
    draggableProps: {},
    dragHandleProps: {},
    innerRef: jest.fn(),
  }, { isDragging: false }),
}));

// 2. Mock Child Component
jest.mock('../../components/board/TaskCard', () => ({
  __esModule: true,
  default: ({ task, onClick }: any) => (
    <div data-testid="task-card" onClick={() => onClick(task)}>
      {task.title}
    </div>
  ),
}));

describe('TaskList Component', () => {
  const mockList: TaskListType = {
    id: 'list-1',
    title: 'To Do',
    headerColor: 'bg-blue-100',
    boardId: 'board-1',
    order: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTasks: Task[] = [
    { 
      id: 't1', 
      title: 'Task 1', 
      listId: 'list-1', 
      description: '', 
      order: 0, 
      priority: 'medium', 
      createdAt: new Date(), 
      updatedAt: new Date(),
      assignedTo: [] 
    }
  ];

  const mockProps = {
    list: mockList,
    tasks: mockTasks,
    index: 0,
    allUsers: [] as User[],
    onTaskClick: jest.fn(),
    onCreateTask: jest.fn(),
    onUpdateList: jest.fn(),
    onDeleteList: jest.fn(),
    onClearTasks: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly and toggles title editing', () => {
    render(<TaskList {...mockProps} />);
    const title = screen.getByText('To Do');
    fireEvent.click(title);

    const input = screen.getByDisplayValue('To Do');
    fireEvent.change(input, { target: { value: 'New Title' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockProps.onUpdateList).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'New Title' })
    );
  });

  it('reverts title if empty on blur', () => {
    render(<TaskList {...mockProps} />);
    fireEvent.click(screen.getByText('To Do'));
    const input = screen.getByDisplayValue('To Do');
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);
    expect(screen.getByText('To Do')).toBeInTheDocument();
  });

  it('opens menu and handles color changes', () => {
    const { container } = render(<TaskList {...mockProps} />);
    
    // Find the ellipsis button specifically
    const ellipsisIcon = container.querySelector('.lucide-ellipsis');
    fireEvent.click(ellipsisIcon!.parentElement!);
    
    const greenColorBtn = screen.getByTitle('Green');
    fireEvent.click(greenColorBtn);

    expect(mockProps.onUpdateList).toHaveBeenCalledWith(
      expect.objectContaining({ headerColor: 'bg-green-100' })
    );
  });

  it('handles "Clear All Tasks" and "Delete List"', () => {
    const { container } = render(<TaskList {...mockProps} />);
    const ellipsisIcon = container.querySelector('.lucide-ellipsis');
    fireEvent.click(ellipsisIcon!.parentElement!);

    fireEvent.click(screen.getByText(/Clear All Tasks/i));
    expect(mockProps.onClearTasks).toHaveBeenCalledWith(mockList.id);

    fireEvent.click(ellipsisIcon!.parentElement!);
    fireEvent.click(screen.getByText(/Delete List/i));
    expect(mockProps.onDeleteList).toHaveBeenCalledWith(mockList.id);
  });

  it('creates a new task on Enter key', () => {
    render(<TaskList {...mockProps} />);
    fireEvent.click(screen.getByText(/Add a card/i));
    const textarea = screen.getByPlaceholderText(/Enter a title for this card/i);
    
    fireEvent.change(textarea, { target: { value: 'New Task' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

    expect(mockProps.onCreateTask).toHaveBeenCalledWith(mockList.id, 'New Task');
  });

  it('closes creation mode on X button click', () => {
    const { container } = render(<TaskList {...mockProps} />);
    fireEvent.click(screen.getByText(/Add a card/i));
    
    // Specifically find the X icon within the task creation area
    const xIcon = container.querySelector('.lucide-x');
    fireEvent.click(xIcon!.parentElement!);
    
    expect(screen.queryByPlaceholderText(/Enter a title for this card/i)).not.toBeInTheDocument();
  });

  it('closes menu when clicking outside', () => {
    const { container } = render(<TaskList {...mockProps} />);
    const ellipsisIcon = container.querySelector('.lucide-ellipsis');
    fireEvent.click(ellipsisIcon!.parentElement!);
    
    expect(screen.getByText(/Rename List/i)).toBeInTheDocument();

    act(() => {
      fireEvent.mouseDown(document.body);
    });

    expect(screen.queryByText(/Rename List/i)).not.toBeInTheDocument();
  });

  it('triggers onTaskClick when a TaskCard is clicked', () => {
    render(<TaskList {...mockProps} />);
    fireEvent.click(screen.getByTestId('task-card'));
    expect(mockProps.onTaskClick).toHaveBeenCalledWith(mockTasks[0]);
  });

  it('handles Enter key on title editing', () => {
    render(<TaskList {...mockProps} />);
    fireEvent.click(screen.getByText('To Do'));
    const input = screen.getByDisplayValue('To Do');
    fireEvent.change(input, { target: { value: 'Enter Key Test' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(mockProps.onUpdateList).toHaveBeenCalledWith(expect.objectContaining({ title: 'Enter Key Test' }));
  });

  it('closes create card form on blur when title is empty', () => {
    render(<TaskList {...mockProps} />);
    fireEvent.click(screen.getByText('Add a card'));
    const textarea = screen.getByPlaceholderText('Enter a title for this card...');
    fireEvent.blur(textarea);
    expect(screen.queryByPlaceholderText('Enter a title for this card...')).not.toBeInTheDocument();
  });

  it('keeps create card form open on blur when title is not empty', () => {
    render(<TaskList {...mockProps} />);
    fireEvent.click(screen.getByText('Add a card'));
    const textarea = screen.getByPlaceholderText('Enter a title for this card...');
    fireEvent.change(textarea, { target: { value: 'Some title' } });
    fireEvent.blur(textarea);
    expect(screen.getByPlaceholderText('Enter a title for this card...')).toBeInTheDocument();
  });

  it('opens rename mode via menu Rename List button', () => {
    const { container } = render(<TaskList {...mockProps} />);
    const ellipsisIcon = container.querySelector('.lucide-ellipsis');
    fireEvent.click(ellipsisIcon!.parentElement!);
    fireEvent.click(screen.getByText(/Rename List/i));
    // Should now be in editing mode with an input
    expect(screen.getByDisplayValue('To Do')).toBeInTheDocument();
  });
});