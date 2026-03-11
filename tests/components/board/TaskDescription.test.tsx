import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import TaskDescription from '../../../components/board/TaskDescription'; // Adjust path if needed

describe('TaskDescription Component', () => {
  const mockOnSave = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders "Add a description" placeholder when description is empty', () => {
    render(<TaskDescription description="" onSave={mockOnSave} />);
    expect(screen.getByText(/Add a more detailed description/i)).toBeInTheDocument();
    expect(screen.getByText(/Add a more detailed description/i)).toHaveClass('italic');
  });

  it('renders the actual description when provided', () => {
    render(<TaskDescription description="Hello World" onSave={mockOnSave} />);
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('enters editing mode on click', () => {
    render(<TaskDescription description="Test" onSave={mockOnSave} />);
    const displayBox = screen.getByText('Test');
    fireEvent.click(displayBox);

    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
  });

  it('calls onSave only if the value has changed', () => {
    render(<TaskDescription description="Initial" onSave={mockOnSave} />);
    
    // Click to edit
    fireEvent.click(screen.getByText('Initial'));
    const textarea = screen.getByRole('textbox');

    // Scenario 1: No change, click save
    fireEvent.click(screen.getByText('Save'));
    expect(mockOnSave).not.toHaveBeenCalled();

    // Scenario 2: Change value, click save
    fireEvent.click(screen.getByText('Initial')); // Re-enter edit mode
    const newTextarea = screen.getByRole('textbox');
    fireEvent.change(newTextarea, { target: { value: 'New Value' } });
    fireEvent.click(screen.getByText('Save'));

    expect(mockOnSave).toHaveBeenCalledWith('New Value');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('resets value and exits editing mode on cancel', () => {
    render(<TaskDescription description="Initial" onSave={mockOnSave} />);
    
    fireEvent.click(screen.getByText('Initial'));
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Modified text' } });
    
    fireEvent.click(screen.getByText('Cancel'));

    expect(mockOnSave).not.toHaveBeenCalled();
    expect(screen.getByText('Initial')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('updates input value when description prop changes (useEffect coverage)', () => {
    const { rerender } = render(<TaskDescription description="First" onSave={mockOnSave} />);
    
    // Enter edit mode
    fireEvent.click(screen.getByText('First'));
    expect(screen.getByRole('textbox')).toHaveValue('First');

    // Change prop
    rerender(<TaskDescription description="Second" onSave={mockOnSave} />);
    
    // The internal input value should have updated via useEffect
    expect(screen.getByRole('textbox')).toHaveValue('Second');
  });
});