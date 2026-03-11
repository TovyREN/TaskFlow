import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import BoardAdminPanel from '../../../components/board/BoardAdminPanel';
import * as cardActions from '../../../app/actions/cardActions';

jest.mock('../../../app/actions/cardActions', () => ({
  getBoardWithLabels: jest.fn(),
  updateBoardSettings: jest.fn(),
  createBoardLabel: jest.fn(),
  updateBoardLabel: jest.fn(),
  deleteBoardLabel: jest.fn(),
}));

describe('BoardAdminPanel Component', () => {
  const mockOnClose = jest.fn();
  const mockOnBoardUpdated = jest.fn();
  const mockBoard = {
    id: 'b1',
    backgroundImage: '#0ea5e9',
    labels: [{ id: 'l1', name: 'Urgent', color: '#ef4444' }]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (cardActions.getBoardWithLabels as jest.Mock).mockResolvedValue(mockBoard);
    window.alert = jest.fn();
  });

  const renderPanel = async () => {
    let utils: any;
    await act(async () => {
      utils = render(<BoardAdminPanel boardId="b1" userId="u1" onClose={mockOnClose} onBoardUpdated={mockOnBoardUpdated} />);
    });
    // Wait for loading spinner to disappear and content to show
    await screen.findByText('Board Settings');
    return utils;
  };

  it('covers label editing interactions and cancel logic (Lines 278-318)', async () => {
    await renderPanel();
    
    // Switch to Labels
    await act(async () => { fireEvent.click(screen.getByText('Labels')); });

    const editBtn = screen.getByLabelText(/Edit label Urgent/i);
    await act(async () => { fireEvent.click(editBtn); });

    const nameInput = screen.getByLabelText('Edit label name');
    fireEvent.change(nameInput, { target: { value: 'New Name' } });

    const colorPicker = screen.getByLabelText('Edit label color');
    fireEvent.change(colorPicker, { target: { value: '#000000' } });

    const cancelBtn = screen.getByLabelText('Cancel edit');
    await act(async () => { fireEvent.click(cancelBtn); });
    
    // Verify view mode restored (Urgent text back, input gone)
    expect(screen.getByText('Urgent')).toBeInTheDocument();
    expect(screen.queryByLabelText('Edit label name')).not.toBeInTheDocument();

    await act(async () => { fireEvent.click(screen.getByLabelText(/Edit label Urgent/i)); });
    const reEditInput = screen.getByLabelText('Edit label name');
    (cardActions.updateBoardLabel as jest.Mock).mockResolvedValue({ success: true });
    
    await act(async () => {
      fireEvent.keyDown(reEditInput, { key: 'Enter' });
    });
    expect(cardActions.updateBoardLabel).toHaveBeenCalled();
  });

  it('manages create and delete lifecycle with error branches', async () => {
    await renderPanel();
    await act(async () => { fireEvent.click(screen.getByText('Labels')); });

    fireEvent.click(screen.getByText(/Create a new label/i));
    const newNameInput = screen.getByLabelText('New label name');
    
    // Early return if empty
    fireEvent.click(screen.getByText('Create'));
    expect(cardActions.createBoardLabel).not.toHaveBeenCalled();

    fireEvent.change(newNameInput, { target: { value: 'New Label' } });
    (cardActions.createBoardLabel as jest.Mock).mockResolvedValue({ 
      success: true, 
      label: { id: 'l2', name: 'New Label', color: '#3b82f6' } 
    });
    await act(async () => { fireEvent.click(screen.getByText('Create')); });
    expect(await screen.findByText('New Label')).toBeInTheDocument();

    const deleteBtn = screen.getByLabelText(/Delete label Urgent/i);
    (cardActions.deleteBoardLabel as jest.Mock).mockResolvedValue({ success: true });
    await act(async () => { fireEvent.click(deleteBtn); });
    expect(cardActions.deleteBoardLabel).toHaveBeenCalledWith('l1', 'u1');
  });

  it('handles background presets and removal (Lines 75-80, 218-222)', async () => {
    await renderPanel();
    (cardActions.updateBoardSettings as jest.Mock).mockResolvedValue({ success: true });

    // Click preset
    const skyBlue = screen.getByTitle('Sky Blue');
    await act(async () => { fireEvent.click(skyBlue); });
    expect(cardActions.updateBoardSettings).toHaveBeenCalledWith('b1', { backgroundImage: '#0ea5e9' }, 'u1');

    // Remove Background
    await act(async () => { fireEvent.click(screen.getByText('Remove Background')); });
    expect(cardActions.updateBoardSettings).toHaveBeenLastCalledWith('b1', { backgroundImage: '' }, 'u1');
  });

  it('handles custom URL and server errors', async () => {
    await renderPanel();
    (cardActions.updateBoardSettings as jest.Mock).mockResolvedValue({ success: false, error: 'DB Fail' });

    const urlInput = screen.getByLabelText('Background image URL');
    fireEvent.change(urlInput, { target: { value: 'http://test.jpg' } });
    await act(async () => { fireEvent.click(screen.getByText('Apply Image')); });

    expect(window.alert).toHaveBeenCalledWith('DB Fail');
  });

  it('covers new label creation UI and interactions (Lines 342-361)', async () => {
    const { container } = await renderPanel();
    
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /labels/i }));
    });

    fireEvent.click(screen.getByText(/Create a new label/i));

    const nameInput = screen.getByLabelText('New label name');
    fireEvent.change(nameInput, { target: { value: 'Marketing' } });
    expect(nameInput).toHaveValue('Marketing');

    const redColorBtn = screen.getByLabelText('Select color #ef4444');
    fireEvent.click(redColorBtn);
    
    expect(redColorBtn).toHaveClass('scale-110');
    expect(redColorBtn).toHaveClass('ring-2');

    const cancelBtn = screen.getByText('Cancel');
    fireEvent.click(cancelBtn);
    
    expect(screen.queryByLabelText('New label name')).not.toBeInTheDocument();
    expect(screen.getByText(/Create a new label/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Create a new label/i));
    fireEvent.change(screen.getByLabelText('New label name'), { target: { value: 'Verified Label' } });
    
    (cardActions.createBoardLabel as jest.Mock).mockResolvedValue({ 
      success: true, 
      label: { id: 'l2', name: 'Verified Label', color: '#ef4444' } 
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Create'));
    });

    expect(await screen.findByText('Verified Label')).toBeInTheDocument();
  });
});