import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Sidebar from '../../components/Sidebar';

const mockBoards = [
  { id: 'b1', title: 'Project Alpha', color: '#ff0000', columns: [], members: [], admins: [] },
  { id: 'b2', title: 'Project Beta', color: '#00ff00', columns: [], members: [], admins: [] },
];

describe('Sidebar', () => {
  it('renders board titles', () => {
    render(
      <Sidebar boards={mockBoards} onSelectBoard={jest.fn()} onGoDashboard={jest.fn()} />
    );
    expect(screen.getByText('Project Alpha')).toBeInTheDocument();
    expect(screen.getByText('Project Beta')).toBeInTheDocument();
  });

  it('calls onSelectBoard with board id when clicked', () => {
    const onSelectBoard = jest.fn();
    render(
      <Sidebar boards={mockBoards} onSelectBoard={onSelectBoard} onGoDashboard={jest.fn()} />
    );
    fireEvent.click(screen.getByText('Project Alpha'));
    expect(onSelectBoard).toHaveBeenCalledWith('b1');
    fireEvent.click(screen.getByText('Project Beta'));
    expect(onSelectBoard).toHaveBeenCalledWith('b2');
  });

  it('calls onGoDashboard when logo or dashboard button clicked', () => {
    const onGoDashboard = jest.fn();
    render(
      <Sidebar boards={mockBoards} onSelectBoard={jest.fn()} onGoDashboard={onGoDashboard} />
    );
    // Click the TaskFlow logo area
    fireEvent.click(screen.getByText('TaskFlow'));
    expect(onGoDashboard).toHaveBeenCalledTimes(1);
    // Click the Dashboard button
    fireEvent.click(screen.getByText(/Dashboard/));
    expect(onGoDashboard).toHaveBeenCalledTimes(2);
  });

  it('highlights active board', () => {
    render(
      <Sidebar
        boards={mockBoards}
        onSelectBoard={jest.fn()}
        onGoDashboard={jest.fn()}
        activeBoardId="b1"
      />
    );
    const activeButton = screen.getByText('Project Alpha').closest('button');
    expect(activeButton).toHaveClass('bg-blue-600', 'text-white');
  });

  it('renders "Your Boards" section header', () => {
    render(
      <Sidebar boards={mockBoards} onSelectBoard={jest.fn()} onGoDashboard={jest.fn()} />
    );
    expect(screen.getByText('Your Boards')).toBeInTheDocument();
  });
});
