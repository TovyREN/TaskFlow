import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import TaskCard from '../../../components/board/TaskCard';
import { Task, User } from '../../../types';

// 1. Mock the Draggable component to render its children immediately
jest.mock('@hello-pangea/dnd', () => ({
  Draggable: ({ children }: any) => children({
    draggableProps: { style: {} },
    dragHandleProps: {},
    innerRef: jest.fn(),
  }, { isDragging: false }),
}));

describe('TaskCard Component', () => {
  const mockUsers: User[] = [
    { id: 'u1', name: 'John Doe', avatar: 'https://avatar.com/j1', email: 'j1@test.com' },
    { id: 'u2', name: 'Jane Smith', avatar: 'https://avatar.com/j2', email: 'j2@test.com' },
  ];

  const baseTask: Task = {
    id: 't1',
    title: 'Test Task',
    description: '',
    tags: [],
    checklists: [],
    comments: [],
    assignees: [],
    listId: 'l1',
    order: 0,
    priority: 'medium',
    createdAt: new Date(),
    updatedAt: new Date(),
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

  it('renders multiple tags when present', () => {
    const taskWithTags = {
      ...baseTask,
      tags: [
        { id: 'tag1', name: 'Urgent', color: 'red-500' },
        { id: 'tag2', name: 'Feature', color: 'blue-500' }
      ]
    };
    render(<TaskCard task={taskWithTags} index={0} allUsers={mockUsers} onClick={mockOnClick} />);
    
    expect(screen.getByText('Urgent')).toBeInTheDocument();
    expect(screen.getByText('Feature')).toBeInTheDocument();
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

  it('renders description icon and comment count', () => {
    const taskWithMeta = {
      ...baseTask,
      description: 'Some desc',
      comments: [{ id: 'com1', text: 'hi', userId: 'u1', createdAt: new Date() }]
    };
    render(<TaskCard task={taskWithMeta} index={0} allUsers={mockUsers} onClick={mockOnClick} />);
    
    expect(screen.getByText('1')).toBeInTheDocument();
    // Verify the description/comment icon container exists
    expect(screen.getByText('1').parentElement).toBeInTheDocument();
  });

  it('renders assignees and handles missing users (null branch)', () => {
    const taskWithAssignees = {
      ...baseTask,
      assignees: ['u1', 'u99'] // u99 does not exist in mockUsers
    };
    render(<TaskCard task={taskWithAssignees} index={0} allUsers={mockUsers} onClick={mockOnClick} />);
    
    const images = screen.getAllByRole('img');
    // Should only find 1 image because u99 is missing from allUsers
    expect(images).toHaveLength(1);
    expect(images[0]).toHaveAttribute('alt', 'John Doe');
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