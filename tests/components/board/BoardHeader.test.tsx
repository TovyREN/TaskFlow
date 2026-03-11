import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import BoardHeader from '../../../components/board/BoardHeader';
import { Board, User } from '../../../types';

describe('BoardHeader Component', () => {
  const mockBoard: Board = {
    id: 'b1',
    title: 'Project Alpha',
    workspaceId: 'w1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUsers: User[] = Array.from({ length: 7 }, (_, i) => ({
    id: `u${i}`,
    name: `User ${i}`,
    avatar: `https://avatar.com/${i}`,
    email: `u${i}@test.com`
  }));

  const mockHandlers = {
    onBack: jest.fn(),
    onUpdateTitle: jest.fn(),
    onInvite: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders board title and user avatars (max 5)', () => {
    render(<BoardHeader board={mockBoard} allUsers={mockUsers} {...mockHandlers} />);
    
    expect(screen.getByText('Project Alpha')).toBeInTheDocument();
    
    // Check that only 5 avatars are rendered out of 7 provided
    const avatars = screen.getAllByRole('img');
    expect(avatars).toHaveLength(5);
    expect(avatars[0]).toHaveAttribute('src', mockUsers[0].avatar);
  });

  it('enters editing mode when clicking the title', () => {
    render(<BoardHeader board={mockBoard} allUsers={mockUsers} {...mockHandlers} />);
    
    fireEvent.click(screen.getByText('Project Alpha'));
    
    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('Project Alpha');
  });

  it('calls onUpdateTitle and exits editing mode on Enter key', () => {
    render(<BoardHeader board={mockBoard} allUsers={mockUsers} {...mockHandlers} />);
    
    fireEvent.click(screen.getByText('Project Alpha'));
    const input = screen.getByRole('textbox');
    
    fireEvent.change(input, { target: { value: 'New Project Name' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockHandlers.onUpdateTitle).toHaveBeenCalledWith('New Project Name');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('calls onUpdateTitle on blur if the title has changed', () => {
    render(<BoardHeader board={mockBoard} allUsers={mockUsers} {...mockHandlers} />);
    
    fireEvent.click(screen.getByText('Project Alpha'));
    const input = screen.getByRole('textbox');
    
    fireEvent.change(input, { target: { value: 'Blurred Update' } });
    fireEvent.blur(input);

    expect(mockHandlers.onUpdateTitle).toHaveBeenCalledWith('Blurred Update');
  });

  it('does NOT call onUpdateTitle if title remains the same or is only whitespace', () => {
    render(<BoardHeader board={mockBoard} allUsers={mockUsers} {...mockHandlers} />);
    
    // Case 1: No change
    fireEvent.click(screen.getByText('Project Alpha'));
    fireEvent.blur(screen.getByRole('textbox'));
    expect(mockHandlers.onUpdateTitle).not.toHaveBeenCalled();

    // Case 2: Changed but then reverted (or whitespace handled by .trim())
    fireEvent.click(screen.getByText('Project Alpha'));
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Project Alpha' } }); // explicitly same
    fireEvent.blur(input);
    expect(mockHandlers.onUpdateTitle).not.toHaveBeenCalled();
  });

  it('triggers onBack when back button is clicked', () => {
    render(<BoardHeader board={mockBoard} allUsers={mockUsers} {...mockHandlers} />);
    
    // Find back button by its icon/class since it has no text
    const backBtn = screen.getByRole('button', { name: '' }).parentElement?.querySelector('svg.lucide-arrow-left');
    fireEvent.click(backBtn!.parentElement!);
    
    expect(mockHandlers.onBack).toHaveBeenCalled();
  });

  it('triggers onInvite when share button is clicked', () => {
    render(<BoardHeader board={mockBoard} allUsers={mockUsers} {...mockHandlers} />);
    
    fireEvent.click(screen.getByText(/Share/i));
    expect(mockHandlers.onInvite).toHaveBeenCalled();
  });
});