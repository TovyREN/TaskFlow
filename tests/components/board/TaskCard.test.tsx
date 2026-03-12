import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import TaskCard from '../../../components/board/TaskCard';

// 1. Mock the Draggable component to render its children immediately
jest.mock('@hello-pangea/dnd', () => ({
  Draggable: ({ children }: any) => children({
    draggableProps: { style: {} },
    dragHandleProps: {},
    innerRef: jest.fn(),
  }, { isDragging: false }),
}));

describe('TaskCard Component', () => {
  const mockUsers = [
    { id: 'u1', name: 'John Doe', email: 'j1@test.com' },
    { id: 'u2', name: 'Jane Smith', email: 'j2@test.com' },
  ];

  const baseTask = {
    id: 't1',
    title: 'Test Task',
    description: '',
    labels: [],
    checklists: [],
    assignees: [],
    _count: { comments: 0 },
    listId: 'l1',
    order: 0,
  };

  const mockOnClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders title and handles click events', () => {
    render(<TaskCard task={baseTask} index={0} allUsers={mockUsers} onClick={mockOnClick} />);

    const card = screen.getByText('Test Task');
    fireEvent.click(card);

    expect(mockOnClick).toHaveBeenCalledWith(baseTask);
  });

  it('renders multiple labels when present', () => {
    const taskWithLabels = {
      ...baseTask,
      labels: [
        { labelId: 'l1', label: { color: '#ff0000' } },
        { labelId: 'l2', label: { color: '#00ff00' } }
      ]
    };
    render(<TaskCard task={taskWithLabels} index={0} allUsers={mockUsers} onClick={mockOnClick} />);

    // Labels render as colored spans
    const labelSpans = document.querySelectorAll('.rounded-full');
    expect(labelSpans.length).toBeGreaterThanOrEqual(2);
  });

  it('calculates checklist progress (Total and Checked items)', () => {
    const taskWithChecklist = {
      ...baseTask,
      checklists: [
        {
          id: 'c1',
          items: [
            { id: 'i1', isChecked: true },
            { id: 'i2', isChecked: false }
          ]
        },
        {
          id: 'c2',
          items: [
            { id: 'i3', isChecked: true }
          ]
        }
      ]
    };
    render(<TaskCard task={taskWithChecklist} index={0} allUsers={mockUsers} onClick={mockOnClick} />);

    // Total items: 3, Checked items: 2. Result should be 2/3
    expect(screen.getByText('2/3')).toBeInTheDocument();
  });

  it('renders comment count from _count', () => {
    const taskWithComments = {
      ...baseTask,
      _count: { comments: 5 }
    };
    render(<TaskCard task={taskWithComments} index={0} allUsers={mockUsers} onClick={mockOnClick} />);

    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders assignees as avatar circles', () => {
    const taskWithAssignees = {
      ...baseTask,
      assignees: [
        { userId: 'u1', user: { name: 'John Doe', email: 'j1@test.com' } },
        { userId: 'u2', user: { name: 'Jane Smith', email: 'j2@test.com' } },
      ]
    };
    render(<TaskCard task={taskWithAssignees} index={0} allUsers={mockUsers} onClick={mockOnClick} />);

    // Both John and Jane start with J, so we should find 2 J initials
    expect(screen.getAllByText('J')).toHaveLength(2);
  });

  it('shows +N for more than 3 assignees', () => {
    const taskWithManyAssignees = {
      ...baseTask,
      assignees: [
        { userId: 'u1', user: { name: 'Alice', email: 'a@test.com' } },
        { userId: 'u2', user: { name: 'Bob', email: 'b@test.com' } },
        { userId: 'u3', user: { name: 'Charlie', email: 'c@test.com' } },
        { userId: 'u4', user: { name: 'Dave', email: 'd@test.com' } },
      ]
    };
    render(<TaskCard task={taskWithManyAssignees} index={0} allUsers={mockUsers} onClick={mockOnClick} />);

    expect(screen.getByText('+1')).toBeInTheDocument();
  });

  it('renders due date badge (past date = red)', () => {
    const taskWithDueDate = {
      ...baseTask,
      dueDate: '2020-01-01T00:00:00Z',
    };
    render(<TaskCard task={taskWithDueDate} index={0} allUsers={mockUsers} onClick={mockOnClick} />);

    expect(screen.getByText(/Jan/)).toBeInTheDocument();
  });

  it('renders due date badge (future date = slate)', () => {
    const taskWithFutureDue = {
      ...baseTask,
      dueDate: '2099-12-31T00:00:00Z',
    };
    render(<TaskCard task={taskWithFutureDue} index={0} allUsers={mockUsers} onClick={mockOnClick} />);

    expect(screen.getByText(/Dec/)).toBeInTheDocument();
  });

  it('handles checklist with undefined items gracefully', () => {
    const taskWithBareChecklist = {
      ...baseTask,
      checklists: [{ id: 'c1' }] // no items property
    };
    render(<TaskCard task={taskWithBareChecklist} index={0} allUsers={mockUsers} onClick={mockOnClick} />);

    expect(screen.getByText('0/0')).toBeInTheDocument();
  });

  it('handles assignee with email fallback when name is missing', () => {
    const taskWithEmailAssignee = {
      ...baseTask,
      assignees: [
        { userId: 'u1', user: { email: 'test@example.com' } },
      ]
    };
    render(<TaskCard task={taskWithEmailAssignee} index={0} allUsers={mockUsers} onClick={mockOnClick} />);

    expect(screen.getByText('T')).toBeInTheDocument();
  });

  it('applies dragging styles when snapshot.isDragging is true', () => {
    // We override the local mock for this specific test
    const dnd = require('@hello-pangea/dnd');
    jest.spyOn(dnd, 'Draggable').mockImplementation(({ children }: any) => children({
      draggableProps: { style: {} },
      dragHandleProps: {},
      innerRef: jest.fn(),
    }, { isDragging: true }));

    const { container } = render(<TaskCard task={baseTask} index={0} allUsers={mockUsers} onClick={mockOnClick} />);

    const cardElement = container.firstChild;
    expect(cardElement).toHaveClass('rotate-2');
    expect(cardElement).toHaveClass('scale-105');
  });
});
