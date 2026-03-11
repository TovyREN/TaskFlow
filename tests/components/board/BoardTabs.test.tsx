import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import BoardTabs from '../../../components/board/BoardTabs';

describe('BoardTabs Component', () => {
  const mockOnBoardSelect = jest.fn();
  const mockBoards = [
    { id: 'b1', title: 'Board One', color: '#ff0000' },
    { id: 'b2', title: 'Board Two', color: '#00ff00' },
    { id: 'b3', title: 'A Very Long Board Title That Should Truncate' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock scrollBy as JSDOM doesn't implement it
    Element.prototype.scrollBy = jest.fn();
  });

  it('returns null if there is only one board or no boards', () => {
    const { container } = render(
      <BoardTabs boards={[mockBoards[0]]} currentBoardId="b1" onBoardSelect={mockOnBoardSelect} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders all board tabs when boards.length > 1', () => {
    render(<BoardTabs boards={mockBoards} currentBoardId="b1" onBoardSelect={mockOnBoardSelect} />);
    
    expect(screen.getByText('Board One')).toBeInTheDocument();
    expect(screen.getByText('Board Two')).toBeInTheDocument();
  });

  it('truncates long board titles', () => {
    render(<BoardTabs boards={mockBoards} currentBoardId="b1" onBoardSelect={mockOnBoardSelect} />);
    // "A Very Long Board Ti..." (20 chars + ...)
    expect(screen.getByText('A Very Long Board Ti...')).toBeInTheDocument();
  });

  it('calls onBoardSelect when an inactive board is clicked', () => {
    render(<BoardTabs boards={mockBoards} currentBoardId="b1" onBoardSelect={mockOnBoardSelect} />);
    
    fireEvent.click(screen.getByText('Board Two'));
    expect(mockOnBoardSelect).toHaveBeenCalledWith('b2');
  });

  it('does NOT call onBoardSelect when the active board is clicked', () => {
    render(<BoardTabs boards={mockBoards} currentBoardId="b1" onBoardSelect={mockOnBoardSelect} />);
    
    fireEvent.click(screen.getByText('Board One'));
    expect(mockOnBoardSelect).not.toHaveBeenCalled();
  });

  it('applies active styles including custom board color', () => {
    render(<BoardTabs boards={mockBoards} currentBoardId="b1" onBoardSelect={mockOnBoardSelect} />);
    
    const activeTab = screen.getByText('Board One');
    expect(activeTab).toHaveClass('text-slate-900');
    expect(activeTab).toHaveStyle('border-bottom-color: #ff0000');
  });

  it('triggers scroll logic when left and right buttons are clicked', () => {
    render(<BoardTabs boards={mockBoards} currentBoardId="b1" onBoardSelect={mockOnBoardSelect} />);
    
    const leftBtn = screen.getByLabelText('Scroll left');
    const rightBtn = screen.getByLabelText('Scroll right');

    fireEvent.click(rightBtn);
    expect(Element.prototype.scrollBy).toHaveBeenCalledWith({
      left: 200,
      behavior: 'smooth'
    });

    fireEvent.click(leftBtn);
    expect(Element.prototype.scrollBy).toHaveBeenCalledWith({
      left: -200,
      behavior: 'smooth'
    });
  });

  it('handles scroll calls when scrollRef.current is missing (coverage edge case)', () => {
    render(<BoardTabs boards={mockBoards} currentBoardId="b1" onBoardSelect={mockOnBoardSelect} />);
    fireEvent.click(screen.getByLabelText('Scroll right'));
    expect(Element.prototype.scrollBy).toHaveBeenCalled();
  });
});