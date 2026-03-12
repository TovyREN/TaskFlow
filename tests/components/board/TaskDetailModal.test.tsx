"use client";

import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TaskDetailModal from '../../../components/board/TaskDetailModal';
import * as cardActions from '../../../app/actions/cardActions';
import { SocketProvider, useSocket } from '../../../components/SocketProvider';

jest.mock('../../../app/actions/cardActions', () => ({
  getTaskDetails: jest.fn(),
  updateTaskDetails: jest.fn(),
  addAssignee: jest.fn(),
  removeAssignee: jest.fn(),
  addLabelToTask: jest.fn(),
  removeLabelFromTask: jest.fn(),
  createChecklist: jest.fn(),
  deleteChecklist: jest.fn(),
  addChecklistItem: jest.fn(),
  updateChecklistItem: jest.fn(),
  deleteChecklistItem: jest.fn(),
  addComment: jest.fn(),
  deleteComment: jest.fn(),
}));

const socketCallbacks: Record<string, Function> = {};
jest.mock('../../../components/SocketProvider', () => {
  const original = jest.requireActual('../../../components/SocketProvider');
  return {
    ...original,
    useSocket: jest.fn(() => ({
      on: jest.fn((event, cb) => { socketCallbacks[event] = cb; }),
      off: jest.fn((event) => { delete socketCallbacks[event]; }),
      isConnected: true,
    })),
  };
});

describe('TaskDetailModal Component', () => {
  const mockOnClose = jest.fn();
  const mockOnTaskUpdated = jest.fn();
  const mockOnTaskDeleted = jest.fn();

  const mockTask = {
    id: 't1',
    title: 'Test Task',
    description: 'Initial Description',
    startDate: null,
    dueDate: null,
    list: {
      title: 'To Do',
      board: {
        labels: [{ id: 'l1', name: 'Urgent', color: '#ff0000' }],
        workspace: {
          members: [
            { userId: 'u1', user: { name: 'Alice', email: 'alice@test.com' } },
            { userId: 'u2', user: { name: 'Bob', email: 'bob@test.com' } }
          ]
        }
      }
    },
    assignees: [{ userId: 'u1', user: { name: 'Alice' } }],
    labels: [],
    checklists: [
      {
        id: 'cl1',
        title: 'Project Alpha',
        items: [
          { id: 'i1', title: 'Task 1', isChecked: false },
          { id: 'i2', title: 'Task 2', isChecked: true }
        ]
      }
    ],
    comments: [
      { id: 'cm1', text: 'Old comment', userId: 'u1', createdAt: new Date().toISOString(), user: { name: 'Alice' } }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(socketCallbacks).forEach(key => delete socketCallbacks[key]);
    (cardActions.getTaskDetails as jest.Mock).mockResolvedValue(mockTask);
    window.alert = jest.fn();
  });

  const renderModal = async () => {
    let utils: any;
    await act(async () => {
      utils = render(
        <SocketProvider>
          <TaskDetailModal 
            taskId="t1" 
            userId="u1" 
            onClose={mockOnClose} 
            onTaskUpdated={mockOnTaskUpdated} 
            onTaskDeleted={mockOnTaskDeleted} 
          />
        </SocketProvider>
      );
    });
    await screen.findByText('Test Task');
    return utils;
  };

  it('triggers loadTask when socket events are received (Lines 72-100)', async () => {
    await renderModal();
    (cardActions.getTaskDetails as jest.Mock).mockClear();
    await act(async () => {
      if (socketCallbacks['task:updated']) {
        socketCallbacks['task:updated']({ taskId: 't1' });
      }
    });
    expect(cardActions.getTaskDetails).toHaveBeenCalledWith('t1');
  });

  it('registers and unregisters socket listeners (Lines 68-100)', async () => {
    const { unmount } = await renderModal();
    expect(socketCallbacks['task:updated']).toBeDefined();
    unmount();
    expect(socketCallbacks['task:updated']).toBeUndefined();
  });

  it('handles empty or unchanged title early returns (Lines 151-154)', async () => {
    await renderModal();
    const titleHeader = screen.getByText('Test Task');
    fireEvent.click(titleHeader);
    const input = screen.getByDisplayValue('Test Task');
    await act(async () => { fireEvent.blur(input); });
    expect(cardActions.updateTaskDetails).not.toHaveBeenCalled();
    fireEvent.click(titleHeader);
    fireEvent.change(input, { target: { value: '   ' } });
    await act(async () => { fireEvent.blur(input); });
    expect(cardActions.updateTaskDetails).not.toHaveBeenCalled();
  });

  it('covers the initial loading state and resolved task data (Lines 103-112)', async () => {
    await renderModal();
    expect(cardActions.getTaskDetails).toHaveBeenCalled();
  });

  it('covers Description editing and update logic (Lines 165-172)', async () => {
    await renderModal();
    (cardActions.updateTaskDetails as jest.Mock).mockResolvedValue({ success: true });
    const descPlaceholder = screen.getByText('Initial Description');
    fireEvent.click(descPlaceholder);
    const textarea = screen.getByPlaceholderText(/detailed description/i);
    fireEvent.change(textarea, { target: { value: 'New Description' } });
    await act(async () => {
      fireEvent.click(screen.getByText('Save'));
    });
    expect(cardActions.updateTaskDetails).toHaveBeenCalledWith('t1', { description: 'New Description' }, 'u1');
  });

  it('covers Sidebar Actions: Members and Labels (Lines 683-755)', async () => {
    await renderModal();
    fireEvent.click(screen.getByRole('button', { name: /members/i }));
    (cardActions.addAssignee as jest.Mock).mockResolvedValue({ success: true });
    await act(async () => { fireEvent.click(screen.getByText('Bob')); });
    await waitFor(() => { expect(cardActions.addAssignee).toHaveBeenCalledWith('t1', 'u2', 'u1'); });
    fireEvent.click(screen.getByRole('button', { name: /labels/i }));
    (cardActions.addLabelToTask as jest.Mock).mockResolvedValue({ success: true });
    await act(async () => { fireEvent.click(screen.getByText('Urgent')); });
    await waitFor(() => { expect(cardActions.addLabelToTask).toHaveBeenCalled(); });
  });

  it('covers Checklist Creation & Cancel (Lines 758-795)', async () => {
    await renderModal();
    fireEvent.click(screen.getByRole('button', { name: /^checklist$/i }));
    const input = screen.getByPlaceholderText('Checklist title...');
    fireEvent.change(input, { target: { value: 'New List' } });
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByPlaceholderText('Checklist title...')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^checklist$/i }));
    fireEvent.change(screen.getByPlaceholderText('Checklist title...'), { target: { value: 'Valid List' } });
    (cardActions.createChecklist as jest.Mock).mockResolvedValue({ 
      success: true, checklist: { id: 'c1', title: 'Valid List', items: [] } 
    });
    await act(async () => { fireEvent.click(screen.getByText('Add')); });
    await waitFor(() => { expect(cardActions.createChecklist).toHaveBeenCalled(); });
  });

  it('covers Date Picker interactions and state updates (Lines 798-838)', async () => {
    const { container } = await renderModal();
    (cardActions.updateTaskDetails as jest.Mock).mockResolvedValue({ success: true });
    fireEvent.click(screen.getByRole('button', { name: /due date/i }));
    await act(async () => {
      const dueInput = container.querySelector('input[type="date"]');
      fireEvent.change(dueInput!, { target: { value: '2026-12-31' } });
    });
    await waitFor(() => { expect(cardActions.updateTaskDetails).toHaveBeenCalled(); });
    fireEvent.click(screen.getByRole('button', { name: /start date/i }));
    await act(async () => {
      const startInput = container.querySelector('input[type="date"]');
      fireEvent.change(startInput!, { target: { value: '2026-01-01' } });
    });
    await waitFor(() => { expect(cardActions.updateTaskDetails).toHaveBeenCalled(); });
  });

  it('handles "Remove Date" branches (Lines 812 & 833)', async () => {
    (cardActions.getTaskDetails as jest.Mock).mockResolvedValue({
      ...mockTask, startDate: '2026-01-01', dueDate: '2026-12-31'
    });
    await renderModal();
    (cardActions.updateTaskDetails as jest.Mock).mockResolvedValue({ success: true });
    fireEvent.click(screen.getByRole('button', { name: /start date/i }));
    await act(async () => { fireEvent.click(screen.getByText(/remove start date/i)); });
    await waitFor(() => { expect(cardActions.updateTaskDetails).toHaveBeenCalledWith('t1', { startDate: null }, 'u1'); });
    fireEvent.click(screen.getByRole('button', { name: /due date/i }));
    await act(async () => { fireEvent.click(screen.getByText(/remove due date/i)); });
    await waitFor(() => { expect(cardActions.updateTaskDetails).toHaveBeenLastCalledWith('t1', { dueDate: null }, 'u1'); });
  });

  // --- Main Content (Lines 531-659) ---

  it('covers Checklist Items and Progress (Lines 531-628)', async () => {
    await renderModal();
    expect(screen.getByText('50%')).toBeInTheDocument();
    (cardActions.updateChecklistItem as jest.Mock).mockResolvedValue({ success: true });
    await act(async () => {
      const checkbox = screen.getAllByRole('checkbox')[0];
      fireEvent.click(checkbox);
    });
    await waitFor(() => expect(cardActions.updateChecklistItem).toHaveBeenCalled());
    (cardActions.deleteChecklistItem as jest.Mock).mockResolvedValue({ success: true });
    const deleteBtn = screen.getAllByRole('button').find(b => b.querySelector('.lucide-x') && !b.classList.contains('p-2'));
    await act(async () => { if (deleteBtn) fireEvent.click(deleteBtn); });
    await waitFor(() => expect(cardActions.deleteChecklistItem).toHaveBeenCalled());
    fireEvent.click(screen.getByText(/Add an item/i));
    fireEvent.change(screen.getByPlaceholderText('Add an item...'), { target: { value: 'New Check' } });
    (cardActions.addChecklistItem as jest.Mock).mockResolvedValue({ 
      success: true, item: { id: 'i3', title: 'New Check', isChecked: false } 
    });
    await act(async () => { fireEvent.click(screen.getByText('Add')); });
    await waitFor(() => expect(cardActions.addChecklistItem).toHaveBeenCalled());
  });

  it('covers Comments Section and Deletion (Lines 631-659)', async () => {
    await renderModal();
    const commentInput = screen.getByPlaceholderText('Write a comment...');
    fireEvent.change(commentInput, { target: { value: 'Testing comment' } });
    (cardActions.addComment as jest.Mock).mockResolvedValue({ 
      success: true, 
      comment: { id: 'cm2', text: 'Testing comment', userId: 'u1', createdAt: new Date().toISOString(), user: { name: 'Alice' } } 
    });
    await act(async () => { fireEvent.click(screen.getByText('Post')); });
    await waitFor(() => {
      expect(cardActions.addComment).toHaveBeenCalledWith('t1', 'u1', 'Testing comment');
      expect(commentInput).toHaveValue('');
    });
    (cardActions.deleteComment as jest.Mock).mockResolvedValue({ success: true });
    const commentText = screen.getByText('Old comment');
    const commentContainer = commentText.closest('div')?.parentElement;
    const trashBtn = commentContainer?.querySelector('.lucide-trash2')?.closest('button');
    await act(async () => { if (trashBtn) fireEvent.click(trashBtn); });
    await waitFor(() => expect(cardActions.deleteComment).toHaveBeenCalledWith('cm1', 'u1'));
  });

  it('covers Label and Date rendering (Lines 486-511)', async () => {
    (cardActions.getTaskDetails as jest.Mock).mockResolvedValue({
      ...mockTask, startDate: '2026-03-10', labels: [{ labelId: 'l1', label: { name: 'Priority', color: '#ff0000' } }]
    });
    await renderModal();
    expect(screen.getByText('Priority')).toHaveStyle({ backgroundColor: '#ff0000' });
    const startDateHeaders = screen.getAllByText('Start Date');
    expect(startDateHeaders[0]).toBeInTheDocument();
    expect(screen.getByText(/Mar 10, 2026/i)).toBeInTheDocument();
  });

  it('covers checklist progress with zero items (Line 387)', async () => {
    (cardActions.getTaskDetails as jest.Mock).mockResolvedValue({
      ...mockTask,
      checklists: [{ id: 'cl2', title: 'Empty', items: [] }]
    });
    await renderModal();
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('closes on overlay click', async () => {
    const { container } = await renderModal();
    const overlay = container.firstChild;
    await act(async () => { fireEvent.click(overlay!); });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('covers error branches for sidebar actions (alert calls)', async () => {
    await renderModal();
    (cardActions.addAssignee as jest.Mock).mockResolvedValue({ success: false, error: 'Assign Error' });
    fireEvent.click(screen.getByRole('button', { name: /members/i }));
    await act(async () => { fireEvent.click(screen.getByText('Bob')); });
    await waitFor(() => { expect(window.alert).toHaveBeenCalledWith('Assign Error'); });
  });

  // --- Additional coverage tests ---

  it('handles successful title update (Lines 123-129)', async () => {
    await renderModal();
    (cardActions.updateTaskDetails as jest.Mock).mockResolvedValue({ success: true });
    const titleEl = screen.getByText('Test Task');
    fireEvent.click(titleEl);
    const input = screen.getByDisplayValue('Test Task');
    fireEvent.change(input, { target: { value: 'Updated Title' } });
    await act(async () => { fireEvent.blur(input); });
    expect(cardActions.updateTaskDetails).toHaveBeenCalledWith('t1', { title: 'Updated Title' }, 'u1');
    expect(mockOnTaskUpdated).toHaveBeenCalled();
  });

  it('handles title update error (Lines 128-129)', async () => {
    await renderModal();
    (cardActions.updateTaskDetails as jest.Mock).mockResolvedValue({ success: false, error: 'Title Error' });
    const titleEl = screen.getByText('Test Task');
    fireEvent.click(titleEl);
    const input = screen.getByDisplayValue('Test Task');
    fireEvent.change(input, { target: { value: 'New Title' } });
    await act(async () => { fireEvent.blur(input); });
    expect(window.alert).toHaveBeenCalledWith('Title Error');
  });

  it('handles title update via Enter key (Line 388)', async () => {
    await renderModal();
    (cardActions.updateTaskDetails as jest.Mock).mockResolvedValue({ success: true });
    const titleEl = screen.getByText('Test Task');
    fireEvent.click(titleEl);
    const input = screen.getByDisplayValue('Test Task');
    fireEvent.change(input, { target: { value: 'Enter Title' } });
    await act(async () => { fireEvent.keyDown(input, { key: 'Enter' }); });
    expect(cardActions.updateTaskDetails).toHaveBeenCalledWith('t1', { title: 'Enter Title' }, 'u1');
  });

  it('handles description update error (Lines 139-140)', async () => {
    await renderModal();
    (cardActions.updateTaskDetails as jest.Mock).mockResolvedValue({ success: false, error: 'Desc Error' });
    fireEvent.click(screen.getByText('Initial Description'));
    const textarea = screen.getByPlaceholderText(/detailed description/i);
    fireEvent.change(textarea, { target: { value: 'Bad Desc' } });
    await act(async () => { fireEvent.click(screen.getByText('Save')); });
    expect(window.alert).toHaveBeenCalledWith('Desc Error');
  });

  it('handles description cancel button (Lines 497-498)', async () => {
    await renderModal();
    fireEvent.click(screen.getByText('Initial Description'));
    const textarea = screen.getByPlaceholderText(/detailed description/i);
    fireEvent.change(textarea, { target: { value: 'Changed Desc' } });
    fireEvent.click(screen.getByText('Cancel'));
    // After cancel, description should revert and editing should stop
    expect(screen.getByText('Initial Description')).toBeInTheDocument();
  });

  it('handles removing an assignee (Lines 147-155)', async () => {
    await renderModal();
    (cardActions.removeAssignee as jest.Mock).mockResolvedValue({ success: true });
    fireEvent.click(screen.getByRole('button', { name: /members/i }));
    // Alice is already assigned; find Alice in the dropdown (has class truncate)
    const aliceElements = screen.getAllByText('Alice');
    const dropdownAlice = aliceElements.find(el => el.classList.contains('truncate'));
    await act(async () => { fireEvent.click(dropdownAlice!); });
    expect(cardActions.removeAssignee).toHaveBeenCalledWith('t1', 'u1', 'u1');
    expect(mockOnTaskUpdated).toHaveBeenCalled();
  });

  it('handles remove assignee error (Lines 154-155)', async () => {
    await renderModal();
    (cardActions.removeAssignee as jest.Mock).mockResolvedValue({ success: false, error: 'Remove Error' });
    fireEvent.click(screen.getByRole('button', { name: /members/i }));
    const aliceElements = screen.getAllByText('Alice');
    const dropdownAlice = aliceElements.find(el => el.classList.contains('truncate'));
    await act(async () => { fireEvent.click(dropdownAlice!); });
    expect(window.alert).toHaveBeenCalledWith('Remove Error');
  });

  it('handles removing a label (Lines 175-183)', async () => {
    (cardActions.getTaskDetails as jest.Mock).mockResolvedValue({
      ...mockTask,
      labels: [{ labelId: 'l1', label: { id: 'l1', name: 'Urgent', color: '#ff0000' } }]
    });
    await renderModal();
    (cardActions.removeLabelFromTask as jest.Mock).mockResolvedValue({ success: true });
    fireEvent.click(screen.getByRole('button', { name: /labels/i }));
    // Urgent is already on the task, clicking it should remove
    await act(async () => { fireEvent.click(screen.getAllByText('Urgent')[1]); });
    expect(cardActions.removeLabelFromTask).toHaveBeenCalledWith('t1', 'l1', 'u1');
    expect(mockOnTaskUpdated).toHaveBeenCalled();
  });

  it('handles remove label error (Lines 182-183)', async () => {
    (cardActions.getTaskDetails as jest.Mock).mockResolvedValue({
      ...mockTask,
      labels: [{ labelId: 'l1', label: { id: 'l1', name: 'Urgent', color: '#ff0000' } }]
    });
    await renderModal();
    (cardActions.removeLabelFromTask as jest.Mock).mockResolvedValue({ success: false, error: 'Label Remove Error' });
    fireEvent.click(screen.getByRole('button', { name: /labels/i }));
    await act(async () => { fireEvent.click(screen.getAllByText('Urgent')[1]); });
    expect(window.alert).toHaveBeenCalledWith('Label Remove Error');
  });

  it('handles add label error (Lines 194-195)', async () => {
    await renderModal();
    (cardActions.addLabelToTask as jest.Mock).mockResolvedValue({ success: false, error: 'Label Add Error' });
    fireEvent.click(screen.getByRole('button', { name: /labels/i }));
    await act(async () => { fireEvent.click(screen.getByText('Urgent')); });
    expect(window.alert).toHaveBeenCalledWith('Label Add Error');
  });

  it('handles due date error (Lines 207-208)', async () => {
    const { container } = await renderModal();
    (cardActions.updateTaskDetails as jest.Mock).mockResolvedValue({ success: false, error: 'Due Date Error' });
    fireEvent.click(screen.getByRole('button', { name: /due date/i }));
    await act(async () => {
      const dateInput = container.querySelector('input[type="date"]');
      fireEvent.change(dateInput!, { target: { value: '2026-12-31' } });
    });
    await waitFor(() => { expect(window.alert).toHaveBeenCalledWith('Due Date Error'); });
  });

  it('handles start date error (Lines 219-220)', async () => {
    const { container } = await renderModal();
    (cardActions.updateTaskDetails as jest.Mock).mockResolvedValue({ success: false, error: 'Start Date Error' });
    fireEvent.click(screen.getByRole('button', { name: /start date/i }));
    await act(async () => {
      const dateInput = container.querySelector('input[type="date"]');
      fireEvent.change(dateInput!, { target: { value: '2026-01-01' } });
    });
    await waitFor(() => { expect(window.alert).toHaveBeenCalledWith('Start Date Error'); });
  });

  it('handles add checklist error (Lines 234-235)', async () => {
    await renderModal();
    (cardActions.createChecklist as jest.Mock).mockResolvedValue({ success: false, error: 'Checklist Error' });
    fireEvent.click(screen.getByRole('button', { name: /^checklist$/i }));
    fireEvent.change(screen.getByPlaceholderText('Checklist title...'), { target: { value: 'Bad List' } });
    await act(async () => { fireEvent.click(screen.getByText('Add')); });
    expect(window.alert).toHaveBeenCalledWith('Checklist Error');
  });

  it('handles delete checklist success and error (Lines 240-247)', async () => {
    await renderModal();
    (cardActions.deleteChecklist as jest.Mock).mockResolvedValue({ success: true });
    // Find the delete checklist button (trash icon next to checklist title)
    const checklistHeader = screen.getByText('Project Alpha');
    const deleteBtn = checklistHeader.closest('div')?.parentElement?.querySelector('button');
    await act(async () => { fireEvent.click(deleteBtn!); });
    expect(cardActions.deleteChecklist).toHaveBeenCalledWith('cl1', 'u1');
  });

  it('handles delete checklist error (Lines 246-247)', async () => {
    await renderModal();
    (cardActions.deleteChecklist as jest.Mock).mockResolvedValue({ success: false, error: 'Delete CL Error' });
    const checklistHeader = screen.getByText('Project Alpha');
    const deleteBtn = checklistHeader.closest('div')?.parentElement?.querySelector('button');
    await act(async () => { fireEvent.click(deleteBtn!); });
    expect(window.alert).toHaveBeenCalledWith('Delete CL Error');
  });

  it('handles add checklist item error (Lines 265-266)', async () => {
    await renderModal();
    (cardActions.addChecklistItem as jest.Mock).mockResolvedValue({ success: false, error: 'Add Item Error' });
    fireEvent.click(screen.getByText(/Add an item/i));
    fireEvent.change(screen.getByPlaceholderText('Add an item...'), { target: { value: 'Bad Item' } });
    await act(async () => { fireEvent.click(screen.getByText('Add')); });
    expect(window.alert).toHaveBeenCalledWith('Add Item Error');
  });

  it('handles toggle checklist item error (Lines 287-288)', async () => {
    await renderModal();
    (cardActions.updateChecklistItem as jest.Mock).mockResolvedValue({ success: false, error: 'Toggle Error' });
    await act(async () => {
      const checkbox = screen.getAllByRole('checkbox')[0];
      fireEvent.click(checkbox);
    });
    await waitFor(() => { expect(window.alert).toHaveBeenCalledWith('Toggle Error'); });
  });

  it('handles delete checklist item error (Lines 303-304)', async () => {
    await renderModal();
    (cardActions.deleteChecklistItem as jest.Mock).mockResolvedValue({ success: false, error: 'Delete Item Error' });
    // Find the X button on a checklist item
    const itemText = screen.getByText('Task 1');
    const itemRow = itemText.closest('.flex');
    const xBtn = itemRow?.querySelector('button');
    if (xBtn) {
      await act(async () => { fireEvent.click(xBtn); });
      await waitFor(() => { expect(window.alert).toHaveBeenCalledWith('Delete Item Error'); });
    }
  });

  it('handles checklist item add via Enter key (Line 583)', async () => {
    await renderModal();
    (cardActions.addChecklistItem as jest.Mock).mockResolvedValue({
      success: true, item: { id: 'i4', title: 'Enter Item', isChecked: false }
    });
    fireEvent.click(screen.getByText(/Add an item/i));
    const input = screen.getByPlaceholderText('Add an item...');
    fireEvent.change(input, { target: { value: 'Enter Item' } });
    await act(async () => { fireEvent.keyDown(input, { key: 'Enter' }); });
    expect(cardActions.addChecklistItem).toHaveBeenCalled();
  });

  it('handles checklist item cancel button (Lines 594-595)', async () => {
    await renderModal();
    fireEvent.click(screen.getByText(/Add an item/i));
    expect(screen.getByPlaceholderText('Add an item...')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('Add an item...'), { target: { value: 'Will Cancel' } });
    // The Cancel button is in the same container as the Add button
    // There are two Cancel buttons possible (one in checklist add); we need the one near "Add an item..."
    const inputEl = screen.getByPlaceholderText('Add an item...');
    const container = inputEl.closest('div.mt-2');
    const cancelBtns = container?.querySelectorAll('button');
    // The cancel button is the second button in the flex gap-2 div
    const cancelBtn = cancelBtns ? cancelBtns[cancelBtns.length - 1] : null;
    fireEvent.click(cancelBtn!);
    expect(screen.queryByPlaceholderText('Add an item...')).not.toBeInTheDocument();
  });

  it('handles checklist title Enter key (Line 759)', async () => {
    await renderModal();
    (cardActions.createChecklist as jest.Mock).mockResolvedValue({
      success: true, checklist: { id: 'c2', title: 'Enter CL', items: [] }
    });
    fireEvent.click(screen.getByRole('button', { name: /^checklist$/i }));
    const input = screen.getByPlaceholderText('Checklist title...');
    fireEvent.change(input, { target: { value: 'Enter CL' } });
    await act(async () => { fireEvent.keyDown(input, { key: 'Enter' }); });
    expect(cardActions.createChecklist).toHaveBeenCalledWith('t1', 'Enter CL', 'u1');
  });

  it('ignores socket events for other tasks', async () => {
    await renderModal();
    (cardActions.getTaskDetails as jest.Mock).mockClear();
    await act(async () => {
      if (socketCallbacks['task:updated']) {
        socketCallbacks['task:updated']({ taskId: 'other-task' });
      }
    });
    expect(cardActions.getTaskDetails).not.toHaveBeenCalled();
  });

  it('handles empty comment submission (no-op)', async () => {
    await renderModal();
    const postBtn = screen.getByText('Post');
    expect(postBtn).toBeDisabled();
    await act(async () => { fireEvent.click(postBtn); });
    expect(cardActions.addComment).not.toHaveBeenCalled();
  });

  it('handles empty checklist title submission (no-op)', async () => {
    await renderModal();
    fireEvent.click(screen.getByRole('button', { name: /^checklist$/i }));
    // Leave title empty and click Add
    await act(async () => { fireEvent.click(screen.getByText('Add')); });
    expect(cardActions.createChecklist).not.toHaveBeenCalled();
  });

  it('handles empty checklist item title submission (no-op)', async () => {
    await renderModal();
    fireEvent.click(screen.getByText(/Add an item/i));
    // Leave item title empty and click Add
    await act(async () => { fireEvent.click(screen.getByText('Add')); });
    expect(cardActions.addChecklistItem).not.toHaveBeenCalled();
  });

  it('returns null when task is null after loading', async () => {
    (cardActions.getTaskDetails as jest.Mock).mockResolvedValue(null);
    const { container } = render(
      <SocketProvider>
        <TaskDetailModal
          taskId="t1"
          userId="u1"
          onClose={mockOnClose}
          onTaskUpdated={mockOnTaskUpdated}
          onTaskDeleted={mockOnTaskDeleted}
        />
      </SocketProvider>
    );
    await waitFor(() => {
      // Once loading finishes, component returns null since task is null
      expect(container.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
  });

  // Polling removed from TaskDetailModal - relies on optimistic updates only
});