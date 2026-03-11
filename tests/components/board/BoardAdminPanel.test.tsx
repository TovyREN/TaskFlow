import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import BoardAdminPanel from '../../../components/board/BoardAdminPanel';

jest.mock('../../../app/actions/cardActions', () => ({
  getBoardWithLabels: jest.fn(),
  updateBoardSettings: jest.fn(),
  createBoardLabel: jest.fn(),
  updateBoardLabel: jest.fn(),
  deleteBoardLabel: jest.fn(),
}));

const {
  getBoardWithLabels,
  updateBoardSettings,
  createBoardLabel,
  updateBoardLabel,
  deleteBoardLabel,
} = require('../../../app/actions/cardActions');

const mockBoard = {
  id: 'b1',
  title: 'Board',
  backgroundImage: null,
  labels: [{ id: 'l1', name: 'Bug', color: '#ef4444' }],
  workspace: { members: [] },
};

const defaultProps = {
  boardId: 'b1',
  userId: 'user1',
  onClose: jest.fn(),
  onBoardUpdated: jest.fn(),
};

describe('BoardAdminPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getBoardWithLabels.mockResolvedValue({ ...mockBoard, labels: [...mockBoard.labels] });
  });

  it('shows loading spinner then board settings', async () => {
    let resolveBoard: (v: any) => void;
    getBoardWithLabels.mockReturnValue(new Promise((r) => { resolveBoard = r; }));

    const { container } = render(<BoardAdminPanel {...defaultProps} />);

    // Loading spinner should be visible
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();

    // Resolve the promise
    resolveBoard!({ ...mockBoard, labels: [...mockBoard.labels] });

    await waitFor(() => {
      expect(screen.getByText('Board Settings')).toBeInTheDocument();
    });
  });

  it('renders background tab with preset backgrounds', async () => {
    render(<BoardAdminPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Board Settings')).toBeInTheDocument();
    });

    expect(screen.getByText('Colors & Gradients')).toBeInTheDocument();
    expect(screen.getByText('Custom Color')).toBeInTheDocument();
    expect(screen.getByText('Image URL')).toBeInTheDocument();
    expect(screen.getByText('Apply Color')).toBeInTheDocument();
    expect(screen.getByText('Apply Image')).toBeInTheDocument();
  });

  it('switches to labels tab and shows existing labels', async () => {
    render(<BoardAdminPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Board Settings')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Labels'));

    expect(screen.getByText('Bug')).toBeInTheDocument();
    expect(screen.getByText('Create a new label')).toBeInTheDocument();
  });

  it('creates a new label', async () => {
    createBoardLabel.mockResolvedValue({
      success: true,
      label: { id: 'l2', name: 'Feature', color: '#3b82f6' },
    });

    render(<BoardAdminPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Board Settings')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Labels'));
    fireEvent.click(screen.getByText('Create a new label'));

    const nameInput = screen.getByPlaceholderText('Label name');
    fireEvent.change(nameInput, { target: { value: 'Feature' } });

    fireEvent.click(screen.getByText('Create'));

    await waitFor(() => {
      expect(createBoardLabel).toHaveBeenCalledWith('b1', 'Feature', '#3b82f6', 'user1');
    });

    await waitFor(() => {
      expect(defaultProps.onBoardUpdated).toHaveBeenCalled();
    });
  });

  it('edits a label', async () => {
    updateBoardLabel.mockResolvedValue({ success: true });

    render(<BoardAdminPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Board Settings')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Labels'));
    expect(screen.getByText('Bug')).toBeInTheDocument();

    // Click the edit button (Edit2 icon button) next to the Bug label
    const bugSpan = screen.getByText('Bug');
    const labelRow = bugSpan.closest('[class*="flex items-center gap-3"]') || bugSpan.parentElement!.parentElement!;
    const buttons = labelRow.querySelectorAll('button');
    fireEvent.click(buttons[0]);

    // Now the edit form should appear with the label name in an input
    const editInput = screen.getByDisplayValue('Bug');
    fireEvent.change(editInput, { target: { value: 'Critical Bug' } });

    // Click the Check button to confirm
    const checkBtn = screen.getAllByRole('button').find(
      (btn) => btn.querySelector('svg') && btn.className.includes('text-green-600')
    );
    fireEvent.click(checkBtn!);

    await waitFor(() => {
      expect(updateBoardLabel).toHaveBeenCalledWith(
        'l1',
        { name: 'Critical Bug', color: '#ef4444' },
        'user1'
      );
    });
  });

  it('deletes a label', async () => {
    deleteBoardLabel.mockResolvedValue({ success: true });

    render(<BoardAdminPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Board Settings')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Labels'));

    // Find the delete button (Trash2 icon)
    const bugSpan = screen.getByText('Bug');
    const labelRow = bugSpan.closest('[class*="flex items-center gap-3"]') || bugSpan.parentElement!.parentElement!;
    const buttons = labelRow.querySelectorAll('button');
    fireEvent.click(buttons[1]);

    await waitFor(() => {
      expect(deleteBoardLabel).toHaveBeenCalledWith('l1', 'user1');
    });

    await waitFor(() => {
      expect(defaultProps.onBoardUpdated).toHaveBeenCalled();
    });
  });

  it('sets a preset background', async () => {
    updateBoardSettings.mockResolvedValue({ success: true });

    render(<BoardAdminPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Board Settings')).toBeInTheDocument();
    });

    // Click a preset background button (first one is Sky Blue #0ea5e9)
    const presetButton = screen.getByTitle('Sky Blue');
    fireEvent.click(presetButton);

    await waitFor(() => {
      expect(updateBoardSettings).toHaveBeenCalledWith(
        'b1',
        { backgroundImage: '#0ea5e9' },
        'user1'
      );
    });
  });

  it('closes on overlay click', async () => {
    render(<BoardAdminPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Board Settings')).toBeInTheDocument();
    });

    // Click the overlay (outermost div)
    const overlay = screen.getByText('Board Settings').closest('.fixed');
    fireEvent.click(overlay!);

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('shows "Remove Background" when backgroundImage is set', async () => {
    getBoardWithLabels.mockResolvedValue({
      ...mockBoard,
      backgroundImage: '#0ea5e9',
      labels: [...mockBoard.labels],
    });

    render(<BoardAdminPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Board Settings')).toBeInTheDocument();
    });

    expect(screen.getByText('Remove Background')).toBeInTheDocument();
  });

  // --- NEW TESTS for uncovered lines ---

  it('handles background update error with alert', async () => {
    updateBoardSettings.mockResolvedValue({ success: false, error: 'Permission denied' });
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

    render(<BoardAdminPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Board Settings')).toBeInTheDocument();
    });

    const presetButton = screen.getByTitle('Sky Blue');
    fireEvent.click(presetButton);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Permission denied');
    });

    alertSpy.mockRestore();
  });

  it('handles create label error with alert', async () => {
    createBoardLabel.mockResolvedValue({ success: false, error: 'Label limit reached' });
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

    render(<BoardAdminPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Board Settings')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Labels'));
    fireEvent.click(screen.getByText('Create a new label'));

    const nameInput = screen.getByPlaceholderText('Label name');
    fireEvent.change(nameInput, { target: { value: 'NewLabel' } });

    fireEvent.click(screen.getByText('Create'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Label limit reached');
    });

    alertSpy.mockRestore();
  });

  it('does not create label when name is empty', async () => {
    render(<BoardAdminPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Board Settings')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Labels'));
    fireEvent.click(screen.getByText('Create a new label'));

    // Leave name empty, click Create
    fireEvent.click(screen.getByText('Create'));

    expect(createBoardLabel).not.toHaveBeenCalled();
  });

  it('handles update label error with alert', async () => {
    updateBoardLabel.mockResolvedValue({ success: false, error: 'Update failed' });
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

    render(<BoardAdminPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Board Settings')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Labels'));

    // Click edit on Bug label
    const bugSpan = screen.getByText('Bug');
    const labelRow = bugSpan.closest('[class*="flex items-center gap-3"]') || bugSpan.parentElement!.parentElement!;
    const buttons = labelRow.querySelectorAll('button');
    fireEvent.click(buttons[0]); // edit button

    const editInput = screen.getByDisplayValue('Bug');
    fireEvent.change(editInput, { target: { value: 'Updated Bug' } });

    // Click confirm
    const checkBtn = screen.getAllByRole('button').find(
      (btn) => btn.querySelector('svg') && btn.className.includes('text-green-600')
    );
    fireEvent.click(checkBtn!);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Update failed');
    });

    alertSpy.mockRestore();
  });

  it('does not update label when name is empty', async () => {
    render(<BoardAdminPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Board Settings')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Labels'));

    const bugSpan = screen.getByText('Bug');
    const labelRow = bugSpan.closest('[class*="flex items-center gap-3"]') || bugSpan.parentElement!.parentElement!;
    const buttons = labelRow.querySelectorAll('button');
    fireEvent.click(buttons[0]);

    const editInput = screen.getByDisplayValue('Bug');
    fireEvent.change(editInput, { target: { value: '' } });

    const checkBtn = screen.getAllByRole('button').find(
      (btn) => btn.querySelector('svg') && btn.className.includes('text-green-600')
    );
    fireEvent.click(checkBtn!);

    expect(updateBoardLabel).not.toHaveBeenCalled();
  });

  it('handles delete label error with alert', async () => {
    deleteBoardLabel.mockResolvedValue({ success: false, error: 'Delete failed' });
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

    render(<BoardAdminPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Board Settings')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Labels'));

    const bugSpan = screen.getByText('Bug');
    const labelRow = bugSpan.closest('[class*="flex items-center gap-3"]') || bugSpan.parentElement!.parentElement!;
    const buttons = labelRow.querySelectorAll('button');
    fireEvent.click(buttons[1]); // delete button

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Delete failed');
    });

    alertSpy.mockRestore();
  });

  it('removes background when clicking Remove Background', async () => {
    updateBoardSettings.mockResolvedValue({ success: true });
    getBoardWithLabels.mockResolvedValue({
      ...mockBoard,
      backgroundImage: '#0ea5e9',
      labels: [...mockBoard.labels],
    });

    render(<BoardAdminPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Remove Background')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Remove Background'));

    await waitFor(() => {
      expect(updateBoardSettings).toHaveBeenCalledWith('b1', { backgroundImage: '' }, 'user1');
    });
  });

  it('applies custom color background', async () => {
    updateBoardSettings.mockResolvedValue({ success: true });

    render(<BoardAdminPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Board Settings')).toBeInTheDocument();
    });

    // Change color picker value
    const colorInput = screen.getByDisplayValue('#3b82f6');
    fireEvent.change(colorInput, { target: { value: '#ff0000' } });

    fireEvent.click(screen.getByText('Apply Color'));

    await waitFor(() => {
      expect(updateBoardSettings).toHaveBeenCalledWith('b1', { backgroundImage: '#ff0000' }, 'user1');
    });
  });

  it('applies image URL background', async () => {
    updateBoardSettings.mockResolvedValue({ success: true });

    render(<BoardAdminPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Board Settings')).toBeInTheDocument();
    });

    const urlInput = screen.getByPlaceholderText('https://example.com/image.jpg');
    fireEvent.change(urlInput, { target: { value: 'https://example.com/bg.jpg' } });

    fireEvent.click(screen.getByText('Apply Image'));

    await waitFor(() => {
      expect(updateBoardSettings).toHaveBeenCalledWith(
        'b1',
        { backgroundImage: 'https://example.com/bg.jpg' },
        'user1'
      );
    });
  });

  it('loads board with image URL background', async () => {
    getBoardWithLabels.mockResolvedValue({
      ...mockBoard,
      backgroundImage: 'https://example.com/bg.jpg',
      labels: [...mockBoard.labels],
    });

    render(<BoardAdminPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Board Settings')).toBeInTheDocument();
    });

    // The URL input should contain the image URL
    const urlInput = screen.getByPlaceholderText('https://example.com/image.jpg');
    expect(urlInput).toHaveValue('https://example.com/bg.jpg');
  });

  it('cancels label creation', async () => {
    render(<BoardAdminPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Board Settings')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Labels'));
    fireEvent.click(screen.getByText('Create a new label'));

    // Type a name
    const nameInput = screen.getByPlaceholderText('Label name');
    fireEvent.change(nameInput, { target: { value: 'Temp' } });

    // Click Cancel
    fireEvent.click(screen.getByText('Cancel'));

    // Should show Create a new label button again
    expect(screen.getByText('Create a new label')).toBeInTheDocument();
  });

  it('cancels label editing', async () => {
    render(<BoardAdminPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Board Settings')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Labels'));

    // Click edit on Bug label
    const bugSpan = screen.getByText('Bug');
    const labelRow = bugSpan.closest('[class*="flex items-center gap-3"]') || bugSpan.parentElement!.parentElement!;
    const buttons = labelRow.querySelectorAll('button');
    fireEvent.click(buttons[0]); // edit button

    // Should see edit input
    expect(screen.getByDisplayValue('Bug')).toBeInTheDocument();

    // Click cancel (X button) - it has text-slate-400 class
    const cancelBtn = screen.getAllByRole('button').find(
      (btn) => btn.querySelector('svg') && btn.className.includes('text-slate-400') && btn.className.includes('hover:bg-slate-100')
    );
    fireEvent.click(cancelBtn!);

    // Should show label as non-editable
    expect(screen.getByText('Bug')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Bug')).not.toBeInTheDocument();
  });

  it('selects a preset color when creating a label', async () => {
    createBoardLabel.mockResolvedValue({
      success: true,
      label: { id: 'l3', name: 'Urgent', color: '#ef4444' },
    });

    render(<BoardAdminPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Board Settings')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Labels'));
    fireEvent.click(screen.getByText('Create a new label'));

    // Type a name
    const nameInput = screen.getByPlaceholderText('Label name');
    fireEvent.change(nameInput, { target: { value: 'Urgent' } });

    // Click a preset color (the first one is #ef4444)
    const colorButtons = screen.getAllByRole('button').filter(
      (btn) => btn.style && btn.style.backgroundColor && btn.className.includes('rounded')
    );
    // Click the first color preset in the create form
    const createForm = screen.getByPlaceholderText('Label name').closest('[class*="bg-slate-50"]');
    const presetColors = createForm!.querySelectorAll('button[style]');
    if (presetColors.length > 0) {
      fireEvent.click(presetColors[0]);
    }

    fireEvent.click(screen.getByText('Create'));

    await waitFor(() => {
      expect(createBoardLabel).toHaveBeenCalledWith('b1', 'Urgent', '#ef4444', 'user1');
    });
  });

  it('submits label update via Enter key', async () => {
    updateBoardLabel.mockResolvedValue({ success: true });

    render(<BoardAdminPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Board Settings')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Labels'));

    const bugSpan = screen.getByText('Bug');
    const labelRow = bugSpan.closest('[class*="flex items-center gap-3"]') || bugSpan.parentElement!.parentElement!;
    const buttons = labelRow.querySelectorAll('button');
    fireEvent.click(buttons[0]);

    const editInput = screen.getByDisplayValue('Bug');
    fireEvent.change(editInput, { target: { value: 'Critical' } });
    fireEvent.keyDown(editInput, { key: 'Enter' });

    await waitFor(() => {
      expect(updateBoardLabel).toHaveBeenCalledWith(
        'l1',
        { name: 'Critical', color: '#ef4444' },
        'user1'
      );
    });
  });

  it('submits new label via Enter key', async () => {
    createBoardLabel.mockResolvedValue({
      success: true,
      label: { id: 'l4', name: 'EnterLabel', color: '#3b82f6' },
    });

    render(<BoardAdminPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Board Settings')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Labels'));
    fireEvent.click(screen.getByText('Create a new label'));

    const nameInput = screen.getByPlaceholderText('Label name');
    fireEvent.change(nameInput, { target: { value: 'EnterLabel' } });
    fireEvent.keyDown(nameInput, { key: 'Enter' });

    await waitFor(() => {
      expect(createBoardLabel).toHaveBeenCalledWith('b1', 'EnterLabel', '#3b82f6', 'user1');
    });
  });
});
