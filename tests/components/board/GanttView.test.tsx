import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import GanttView from '../../../components/board/GanttView';
import { useSocket } from '../../../components/SocketProvider';

jest.mock('../../../components/SocketProvider', () => ({
  useSocket: jest.fn(),
}));

describe('GanttView Component', () => {
  const mockOnClose = jest.fn();
  const mockOnTaskClick = jest.fn();
  const socketMock = { on: jest.fn(), off: jest.fn() };
  
  // 10th of March 2026
  const systemDate = new Date('2026-03-10T12:00:00Z');

  const mockBoard = {
    lists: [
      {
        title: 'List A',
        tasks: [
          { 
            id: 't1', title: 'Task 1', startDate: '2026-03-01', dueDate: '2026-03-05', createdAt: '2026-03-01',
            checklists: [{ items: [{ isChecked: true }] }], 
            assignees: [{ user: { name: 'Alice' } }] 
          },
          { 
            id: 't2', title: 'Task 2', startDate: '2026-03-05', dueDate: '2026-03-15', createdAt: '2026-03-05',
            checklists: [], assignees: [] 
          }
        ]
      }
    ]
  };

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(systemDate);
    jest.clearAllMocks();
    (useSocket as jest.Mock).mockReturnValue(socketMock);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders correctly and handles "List" grouping', () => {
    render(<GanttView boardId="b1" userId="u1" board={mockBoard} onClose={mockOnClose} onTaskClick={mockOnTaskClick} />);
    expect(screen.getByRole('heading', { name: /List A/i })).toBeInTheDocument();
  });

  it('handles grouping by assignee and name fallback branches', () => {
    const mixedBoard = {
      lists: [{
        title: 'L1',
        tasks: [
          { id: 't1', title: 'T1', startDate: '2026-03-01', assignees: [{ user: { name: 'Alice' } }] },
          { id: 't2', title: 'T2', startDate: '2026-03-01', assignees: [{ user: { email: 'bob@test.com' } }] },
          { id: 't3', title: 'T3', startDate: '2026-03-01', assignees: [{ user: {} }] },
          { id: 't4', title: 'T4', startDate: '2026-03-01', assignees: [] }
        ]
      }]
    };
    render(<GanttView boardId="b1" userId="u1" board={mixedBoard} onClose={mockOnClose} onTaskClick={mockOnTaskClick} />);
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'assignee' } });

    expect(screen.getByRole('heading', { name: /Alice/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /bob@test.com/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Unknown/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Unassigned/i })).toBeInTheDocument();
  });

  it('calculates colors and progress bars', () => {
    const colorBoard = {
      lists: [{
        title: 'L1',
        tasks: [
          { id: 't-green', title: 'Done', startDate: '2026-03-01', dueDate: '2026-03-05', checklists: [{ items: [{ isChecked: true }] }] },
          { id: 't-red', title: 'Overdue', startDate: '2026-01-01', dueDate: '2026-01-05', checklists: [] },
          { id: 't-yellow', title: 'Soon', startDate: '2026-03-11', dueDate: '2026-03-12', checklists: [] }
        ]
      }]
    };
    render(<GanttView boardId="b1" userId="u1" board={colorBoard} onClose={mockOnClose} onTaskClick={mockOnTaskClick} />);
    
    expect(screen.getByText('100%')).toBeInTheDocument();
    const bars = screen.getAllByTitle(/.*/);
    // Green (Done)
    expect(bars[0]).toHaveStyle('background-color: rgb(34, 197, 94)');
    // Red (Overdue)
    expect(bars[1]).toHaveStyle('background-color: rgb(239, 68, 68)');
  });

  it('renders months and today indicator position', () => {
    const { container } = render(<GanttView boardId="b1" userId="u1" board={mockBoard} onClose={mockOnClose} onTaskClick={mockOnTaskClick} />);
    
    const monthLabels = container.querySelectorAll('.absolute.text-xs.font-semibold');
    expect(monthLabels.length).toBeGreaterThan(0);

    const indicator = container.querySelector('.border-red-500') as HTMLElement;
    // Verify that the left style contains '16rem' and a percentage calculation, avoiding NaN
    expect(indicator.style.left).toMatch(/calc\(.*% \+ 16rem\)/);
    expect(indicator.style.left).not.toContain('nan');
  });

  it('calls onTaskClick and handles onClose', () => {
    render(<GanttView boardId="b1" userId="u1" board={mockBoard} onClose={mockOnClose} onTaskClick={mockOnTaskClick} />);
    fireEvent.click(screen.getByText('Task 1'));
    expect(mockOnTaskClick).toHaveBeenCalledWith('t1');

    fireEvent.click(screen.getByRole('button', { name: '' }));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onTaskClick when clicking the timeline bar', () => {
    render(<GanttView boardId="b1" userId="u1" board={mockBoard} onClose={mockOnClose} onTaskClick={mockOnTaskClick} />);
    // The bar has a title with the date range
    const bars = screen.getAllByTitle(/2026/);
    fireEvent.click(bars[0]);
    expect(mockOnTaskClick).toHaveBeenCalledWith('t1');
  });

  it('manages socket cleanup', () => {
    const { unmount } = render(<GanttView boardId="b1" userId="u1" board={mockBoard} onClose={mockOnClose} onTaskClick={mockOnTaskClick} />);
    unmount();
    expect(socketMock.off).toHaveBeenCalled();
  });
});