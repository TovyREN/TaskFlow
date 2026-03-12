import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

// Mock server actions
jest.mock('../../app/actions/workspaceActions', () => ({
  getWorkspaceDetails: jest.fn(),
  createBoardInWorkspace: jest.fn(),
  deleteBoardFromWorkspace: jest.fn(),
  getUserRole: jest.fn(),
}));

// Mock SocketProvider
const mockJoinWorkspace = jest.fn();
const mockLeaveWorkspace = jest.fn();
const mockOn = jest.fn();
const mockOff = jest.fn();

jest.mock('../../components/SocketProvider', () => ({
  useSocket: jest.fn(() => ({
    joinWorkspace: mockJoinWorkspace,
    leaveWorkspace: mockLeaveWorkspace,
    on: mockOn,
    off: mockOff,
    isConnected: true,
  })),
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Plus: () => <span data-testid="icon-plus" />,
  X: () => <span data-testid="icon-x" />,
  Grid: () => <span data-testid="icon-grid" />,
  Crown: () => <span data-testid="icon-crown" />,
  Shield: () => <span data-testid="icon-shield" />,
  Eye: () => <span data-testid="icon-eye" />,
  Settings: () => <span data-testid="icon-settings" />,
  Users: () => <span data-testid="icon-users" />,
  ArrowLeft: () => <span data-testid="icon-arrow-left" />,
  Loader2: () => <span data-testid="icon-loader" />,
  MoreVertical: () => <span data-testid="icon-more-vertical" />,
  Trash2: () => <span data-testid="icon-trash" />,
}));

import WorkspaceView from '../../components/WorkspaceView';
import {
  getWorkspaceDetails,
  createBoardInWorkspace,
  deleteBoardFromWorkspace,
  getUserRole,
} from '../../app/actions/workspaceActions';

const mockGetWorkspaceDetails = getWorkspaceDetails as jest.Mock;
const mockCreateBoardInWorkspace = createBoardInWorkspace as jest.Mock;
const mockDeleteBoardFromWorkspace = deleteBoardFromWorkspace as jest.Mock;
const mockGetUserRole = getUserRole as jest.Mock;

const workspaceData = {
  name: 'Test Workspace',
  description: 'A test workspace description',
  color: '#3b82f6',
  ownerId: 'owner-1',
  boards: [
    { id: 'board-1', title: 'Board One', color: '#3b82f6' },
    { id: 'board-2', title: 'Board Two', color: '#ef4444' },
  ],
  members: [
    { id: 'm-1', userId: 'owner-1', role: 'ADMIN', user: { name: 'Alice', email: 'alice@test.com' } },
    { id: 'm-2', userId: 'user-2', role: 'MEMBER', user: { name: 'Bob', email: 'bob@test.com' } },
    { id: 'm-3', userId: 'user-3', role: 'VIEWER', user: { name: null, email: 'charlie@test.com' } },
  ],
  invitations: [
    { id: 'inv-1', inviteeEmail: 'dave@test.com', role: 'VIEWER' },
  ],
};

const defaultProps = {
  workspaceId: 'ws-1',
  userId: 'owner-1',
  onBack: jest.fn(),
  onSelectBoard: jest.fn(),
  onOpenAdmin: jest.fn(),
};

/**
 * Renders the component and waits for loading to finish.
 * Mocks should be set BEFORE calling this function.
 */
async function renderLoaded(props = {}) {
  let result: ReturnType<typeof render>;
  await act(async () => {
    result = render(<WorkspaceView {...defaultProps} {...props} />);
  });
  return result!;
}

describe('WorkspaceView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetWorkspaceDetails.mockResolvedValue(workspaceData);
    mockGetUserRole.mockResolvedValue('ADMIN');
  });

  // --- Loading State ---
  it('shows loading spinner initially', () => {
    mockGetWorkspaceDetails.mockReturnValue(new Promise(() => {}));
    mockGetUserRole.mockReturnValue(new Promise(() => {}));

    render(<WorkspaceView {...defaultProps} />);

    expect(screen.getByTestId('icon-loader')).toBeInTheDocument();
  });

  // --- Workspace Not Found ---
  it('shows not found message when workspace is null', async () => {
    mockGetWorkspaceDetails.mockResolvedValue(null);
    mockGetUserRole.mockResolvedValue(null);

    await renderLoaded();

    expect(screen.getByText(/workspace not found/i)).toBeInTheDocument();
  });

  it('calls onBack when "Go back" is clicked on not found view', async () => {
    mockGetWorkspaceDetails.mockResolvedValue(null);
    mockGetUserRole.mockResolvedValue(null);

    await renderLoaded();

    fireEvent.click(screen.getByText('Go back'));
    expect(defaultProps.onBack).toHaveBeenCalled();
  });

  // --- Rendering Workspace ---
  it('renders workspace name and description', async () => {
    await renderLoaded();

    expect(screen.getByText('Test Workspace')).toBeInTheDocument();
    expect(screen.getByText('A test workspace description')).toBeInTheDocument();
  });

  it('renders board titles in the grid', async () => {
    await renderLoaded();

    expect(screen.getByText('Board One')).toBeInTheDocument();
    expect(screen.getByText('Board Two')).toBeInTheDocument();
  });

  it('renders members sidebar with member count', async () => {
    await renderLoaded();

    expect(screen.getByText(/Members \(3\)/)).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('charlie')).toBeInTheDocument();
  });

  it('renders member roles correctly', async () => {
    await renderLoaded();

    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('Member')).toBeInTheDocument();
    // Viewer appears for both a member and the invitation
    expect(screen.getAllByText('Viewer').length).toBeGreaterThanOrEqual(1);
  });

  it('shows role icons for all member types', async () => {
    await renderLoaded();

    expect(screen.getAllByTestId('icon-crown').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByTestId('icon-shield').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByTestId('icon-eye').length).toBeGreaterThanOrEqual(1);
  });

  it('marks workspace owner', async () => {
    await renderLoaded();

    expect(screen.getByText('(Owner)')).toBeInTheDocument();
  });

  it('renders pending invitations for admin', async () => {
    await renderLoaded();

    expect(screen.getByText('Pending Invitations')).toBeInTheDocument();
    expect(screen.getByText('dave@test.com')).toBeInTheDocument();
  });

  // --- Board Selection ---
  it('calls onSelectBoard when a board card is clicked', async () => {
    await renderLoaded();

    fireEvent.click(screen.getByText('Board One'));
    expect(defaultProps.onSelectBoard).toHaveBeenCalledWith('board-1', 'ws-1');
  });

  // --- Back Button ---
  it('calls onBack when back arrow is clicked', async () => {
    await renderLoaded();

    const backButton = screen.getByTestId('icon-arrow-left').closest('button')!;
    fireEvent.click(backButton);
    expect(defaultProps.onBack).toHaveBeenCalled();
  });

  // --- Settings Button (Admin) ---
  it('shows settings button for admin and calls onOpenAdmin', async () => {
    await renderLoaded();

    expect(screen.getByText('Settings')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Settings'));
    expect(defaultProps.onOpenAdmin).toHaveBeenCalled();
  });

  it('hides settings button for MEMBER role', async () => {
    mockGetUserRole.mockResolvedValue('MEMBER');

    await renderLoaded();

    expect(screen.queryByText('Settings')).not.toBeInTheDocument();
  });

  // --- "New Board" Button Visibility ---
  it('shows "New Board" button for admin', async () => {
    await renderLoaded();

    expect(screen.getByText('New Board')).toBeInTheDocument();
  });

  it('hides "New Board" button for viewer role', async () => {
    mockGetUserRole.mockResolvedValue('VIEWER');

    await renderLoaded();

    expect(screen.queryByText('New Board')).not.toBeInTheDocument();
  });

  // --- Empty Boards State ---
  it('shows empty state when no boards exist', async () => {
    mockGetWorkspaceDetails.mockResolvedValue({ ...workspaceData, boards: [] });

    await renderLoaded();

    expect(screen.getByText('No boards in this workspace yet')).toBeInTheDocument();
  });

  it('shows "Create First Board" button in empty state for admin', async () => {
    mockGetWorkspaceDetails.mockResolvedValue({ ...workspaceData, boards: [] });

    await renderLoaded();

    expect(screen.getByText('Create First Board')).toBeInTheDocument();
  });

  it('hides "Create First Board" in empty state for viewer', async () => {
    mockGetWorkspaceDetails.mockResolvedValue({ ...workspaceData, boards: [] });
    mockGetUserRole.mockResolvedValue('VIEWER');

    await renderLoaded();

    expect(screen.getByText('No boards in this workspace yet')).toBeInTheDocument();
    expect(screen.queryByText('Create First Board')).not.toBeInTheDocument();
  });

  // --- Board Creation Modal ---
  it('opens create board modal when "New Board" is clicked', async () => {
    await renderLoaded();

    fireEvent.click(screen.getByText('New Board'));
    expect(screen.getByText('Create Board')).toBeInTheDocument();
    expect(screen.getByText('Board Title')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. Project Roadmap')).toBeInTheDocument();
  });

  it('closes create board modal when cancel is clicked', async () => {
    await renderLoaded();

    fireEvent.click(screen.getByText('New Board'));
    expect(screen.getByText('Create Board')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Create Board')).not.toBeInTheDocument();
  });

  it('closes create board modal when X button is clicked', async () => {
    await renderLoaded();

    fireEvent.click(screen.getByText('New Board'));
    expect(screen.getByText('Create Board')).toBeInTheDocument();

    const closeButton = screen.getByTestId('icon-x').closest('button')!;
    fireEvent.click(closeButton);
    expect(screen.queryByText('Create Board')).not.toBeInTheDocument();
  });

  it('closes create board modal when clicking backdrop', async () => {
    await renderLoaded();

    fireEvent.click(screen.getByText('New Board'));
    expect(screen.getByText('Create Board')).toBeInTheDocument();

    const backdrop = screen.getByText('Create Board').closest('.bg-white')!.parentElement!;
    fireEvent.click(backdrop);
    expect(screen.queryByText('Create Board')).not.toBeInTheDocument();
  });

  it('does not close modal when clicking inside modal content', async () => {
    await renderLoaded();

    fireEvent.click(screen.getByText('New Board'));

    const modalContent = screen.getByText('Create Board').closest('.bg-white')!;
    fireEvent.click(modalContent);
    expect(screen.getByText('Create Board')).toBeInTheDocument();
  });

  it('disables submit when board title is empty', async () => {
    await renderLoaded();

    fireEvent.click(screen.getByText('New Board'));
    const submitBtn = screen.getByRole('button', { name: 'Create' });
    expect(submitBtn).toBeDisabled();
  });

  it('creates a board successfully', async () => {
    mockCreateBoardInWorkspace.mockResolvedValue({
      success: true,
      board: { id: 'board-new', title: 'New Board', color: '#3b82f6' },
    });

    await renderLoaded();

    fireEvent.click(screen.getByText('New Board'));
    fireEvent.change(screen.getByPlaceholderText('e.g. Project Roadmap'), {
      target: { value: 'New Board' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    });

    expect(mockCreateBoardInWorkspace).toHaveBeenCalledWith('ws-1', 'New Board', 'owner-1', '#3b82f6');
    expect(screen.queryByText('Create Board')).not.toBeInTheDocument();
  });

  it('does not create board when title is only whitespace', async () => {
    await renderLoaded();

    fireEvent.click(screen.getByText('New Board'));
    fireEvent.change(screen.getByPlaceholderText('e.g. Project Roadmap'), {
      target: { value: '   ' },
    });

    await act(async () => {
      fireEvent.submit(screen.getByPlaceholderText('e.g. Project Roadmap').closest('form')!);
    });

    expect(mockCreateBoardInWorkspace).not.toHaveBeenCalled();
  });

  it('allows selecting a different board color', async () => {
    mockCreateBoardInWorkspace.mockResolvedValue({
      success: true,
      board: { id: 'board-new', title: 'Colored Board', color: '#ef4444' },
    });

    await renderLoaded();

    fireEvent.click(screen.getByText('New Board'));

    const colorButtons = screen.getByText('Background Color').parentElement!.querySelectorAll('button');
    fireEvent.click(colorButtons[3]); // #ef4444

    fireEvent.change(screen.getByPlaceholderText('e.g. Project Roadmap'), {
      target: { value: 'Colored Board' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    });

    expect(mockCreateBoardInWorkspace).toHaveBeenCalledWith('ws-1', 'Colored Board', 'owner-1', '#ef4444');
  });

  it('does not close modal if board creation fails', async () => {
    mockCreateBoardInWorkspace.mockResolvedValue({ success: false });

    await renderLoaded();

    fireEvent.click(screen.getByText('New Board'));
    fireEvent.change(screen.getByPlaceholderText('e.g. Project Roadmap'), {
      target: { value: 'Fail Board' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    });

    expect(screen.getByText('Board Title')).toBeInTheDocument();
  });

  // --- Board Deletion ---
  it('shows board menu and deletes a board', async () => {
    window.confirm = jest.fn(() => true);
    mockDeleteBoardFromWorkspace.mockResolvedValue({ success: true });

    await renderLoaded();

    const moreButtons = screen.getAllByTestId('icon-more-vertical');
    fireEvent.click(moreButtons[0].closest('button')!);

    expect(screen.getByText('Delete Board')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByText('Delete Board'));
    });

    expect(window.confirm).toHaveBeenCalled();
    expect(mockDeleteBoardFromWorkspace).toHaveBeenCalledWith('board-1', 'owner-1');
  });

  it('does not delete board when confirm is cancelled', async () => {
    window.confirm = jest.fn(() => false);

    await renderLoaded();

    const moreButtons = screen.getAllByTestId('icon-more-vertical');
    fireEvent.click(moreButtons[0].closest('button')!);

    await act(async () => {
      fireEvent.click(screen.getByText('Delete Board'));
    });

    expect(window.confirm).toHaveBeenCalled();
    expect(mockDeleteBoardFromWorkspace).not.toHaveBeenCalled();
  });

  it('toggles board menu open and closed', async () => {
    await renderLoaded();

    const moreButtons = screen.getAllByTestId('icon-more-vertical');
    const firstMenuBtn = moreButtons[0].closest('button')!;

    fireEvent.click(firstMenuBtn);
    expect(screen.getByText('Delete Board')).toBeInTheDocument();

    fireEvent.click(firstMenuBtn);
    expect(screen.queryByText('Delete Board')).not.toBeInTheDocument();
  });

  it('hides board menu for non-admin users', async () => {
    mockGetUserRole.mockResolvedValue('VIEWER');

    await renderLoaded();

    expect(screen.queryByTestId('icon-more-vertical')).not.toBeInTheDocument();
  });

  // --- Member role (MEMBER can edit but not manage) ---
  it('hides settings and new board for MEMBER role', async () => {
    mockGetUserRole.mockResolvedValue('MEMBER');

    await renderLoaded();

    expect(screen.queryByText('Settings')).not.toBeInTheDocument();
    expect(screen.queryByText('New Board')).not.toBeInTheDocument();
  });

  // --- Socket Events ---
  it('joins workspace room on mount and leaves on unmount', async () => {
    const { unmount } = await renderLoaded();

    expect(mockJoinWorkspace).toHaveBeenCalledWith('ws-1');

    unmount();
    expect(mockLeaveWorkspace).toHaveBeenCalledWith('ws-1');
  });

  it('registers socket event listeners', async () => {
    await renderLoaded();

    expect(mockOn).toHaveBeenCalledWith('board:created', expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith('board:deleted', expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith('workspace:updated', expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith('workspace:member-added', expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith('workspace:member-removed', expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith('workspace:member-role-changed', expect.any(Function));
  });

  it('cleans up socket event listeners on unmount', async () => {
    const { unmount } = await renderLoaded();

    unmount();

    expect(mockOff).toHaveBeenCalledWith('board:created', expect.any(Function));
    expect(mockOff).toHaveBeenCalledWith('board:deleted', expect.any(Function));
    expect(mockOff).toHaveBeenCalledWith('workspace:updated', expect.any(Function));
    expect(mockOff).toHaveBeenCalledWith('workspace:member-added', expect.any(Function));
    expect(mockOff).toHaveBeenCalledWith('workspace:member-removed', expect.any(Function));
    expect(mockOff).toHaveBeenCalledWith('workspace:member-role-changed', expect.any(Function));
  });

  it('handles board:created socket event', async () => {
    await renderLoaded();

    const handleBoardCreated = mockOn.mock.calls.find((c: any) => c[0] === 'board:created')![1];

    act(() => {
      handleBoardCreated({
        workspaceId: 'ws-1',
        board: { id: 'board-new', title: 'Socket Board', color: '#22c55e' },
      });
    });

    expect(screen.getByText('Socket Board')).toBeInTheDocument();
  });

  it('ignores board:created for different workspace', async () => {
    await renderLoaded();

    const handleBoardCreated = mockOn.mock.calls.find((c: any) => c[0] === 'board:created')![1];

    act(() => {
      handleBoardCreated({
        workspaceId: 'ws-other',
        board: { id: 'board-new', title: 'Other WS Board', color: '#22c55e' },
      });
    });

    expect(screen.queryByText('Other WS Board')).not.toBeInTheDocument();
  });

  it('does not duplicate board on board:created if already exists', async () => {
    await renderLoaded();

    const handleBoardCreated = mockOn.mock.calls.find((c: any) => c[0] === 'board:created')![1];

    act(() => {
      handleBoardCreated({
        workspaceId: 'ws-1',
        board: { id: 'board-1', title: 'Board One', color: '#3b82f6' },
      });
    });

    expect(screen.getAllByText('Board One')).toHaveLength(1);
  });

  it('handles board:deleted socket event', async () => {
    await renderLoaded();

    expect(screen.getByText('Board One')).toBeInTheDocument();

    const handleBoardDeleted = mockOn.mock.calls.find((c: any) => c[0] === 'board:deleted')![1];

    act(() => {
      handleBoardDeleted({ workspaceId: 'ws-1', boardId: 'board-1' });
    });

    expect(screen.queryByText('Board One')).not.toBeInTheDocument();
  });

  it('ignores board:deleted for different workspace', async () => {
    await renderLoaded();

    const handleBoardDeleted = mockOn.mock.calls.find((c: any) => c[0] === 'board:deleted')![1];

    act(() => {
      handleBoardDeleted({ workspaceId: 'ws-other', boardId: 'board-1' });
    });

    expect(screen.getByText('Board One')).toBeInTheDocument();
  });

  it('handles workspace:member-removed for current user by calling onBack', async () => {
    await renderLoaded();

    const handleMemberRemoved = mockOn.mock.calls.find((c: any) => c[0] === 'workspace:member-removed')![1];

    act(() => {
      handleMemberRemoved({ userId: 'owner-1' });
    });

    expect(defaultProps.onBack).toHaveBeenCalled();
  });

  it('handles workspace:member-removed for other user by reloading', async () => {
    await renderLoaded();

    mockGetWorkspaceDetails.mockClear();
    mockGetUserRole.mockClear();

    const handleMemberRemoved = mockOn.mock.calls.find((c: any) => c[0] === 'workspace:member-removed')![1];

    await act(async () => {
      handleMemberRemoved({ userId: 'user-other' });
    });

    expect(mockGetWorkspaceDetails).toHaveBeenCalled();
  });

  it('handles workspace:updated socket event by reloading', async () => {
    await renderLoaded();

    mockGetWorkspaceDetails.mockClear();
    mockGetUserRole.mockClear();

    const handleUpdated = mockOn.mock.calls.find((c: any) => c[0] === 'workspace:updated')![1];

    await act(async () => {
      handleUpdated({ workspaceId: 'ws-1' });
    });

    expect(mockGetWorkspaceDetails).toHaveBeenCalled();
  });

  it('ignores workspace:updated for different workspace', async () => {
    await renderLoaded();

    mockGetWorkspaceDetails.mockClear();

    const handleUpdated = mockOn.mock.calls.find((c: any) => c[0] === 'workspace:updated')![1];

    await act(async () => {
      handleUpdated({ workspaceId: 'ws-other' });
    });

    expect(mockGetWorkspaceDetails).not.toHaveBeenCalled();
  });

  it('handles workspace:member-role-changed by reloading', async () => {
    await renderLoaded();

    mockGetWorkspaceDetails.mockClear();
    mockGetUserRole.mockClear();

    const handleRoleChanged = mockOn.mock.calls.find((c: any) => c[0] === 'workspace:member-role-changed')![1];

    await act(async () => {
      handleRoleChanged({ workspaceId: 'ws-1' });
    });

    expect(mockGetWorkspaceDetails).toHaveBeenCalled();
  });

  it('ignores workspace:member-role-changed for different workspace', async () => {
    await renderLoaded();

    mockGetWorkspaceDetails.mockClear();

    const handleRoleChanged = mockOn.mock.calls.find((c: any) => c[0] === 'workspace:member-role-changed')![1];

    await act(async () => {
      handleRoleChanged({ workspaceId: 'ws-other' });
    });

    expect(mockGetWorkspaceDetails).not.toHaveBeenCalled();
  });

  it('opens create board modal from empty state "Create First Board" button', async () => {
    mockGetWorkspaceDetails.mockResolvedValue({ ...workspaceData, boards: [] });

    await renderLoaded();

    fireEvent.click(screen.getByText('Create First Board'));
    expect(screen.getByText('Board Title')).toBeInTheDocument();
  });

  // --- Workspace without description ---
  it('does not render description if workspace has none', async () => {
    mockGetWorkspaceDetails.mockResolvedValue({ ...workspaceData, description: null });

    await renderLoaded();

    expect(screen.queryByText('A test workspace description')).not.toBeInTheDocument();
  });

  // --- Pending invitations hidden for non-admin ---
  it('hides pending invitations for non-admin users', async () => {
    mockGetUserRole.mockResolvedValue('MEMBER');

    await renderLoaded();

    expect(screen.queryByText('Pending Invitations')).not.toBeInTheDocument();
  });

  // --- No invitations ---
  it('hides pending invitations section when there are none', async () => {
    mockGetWorkspaceDetails.mockResolvedValue({ ...workspaceData, invitations: [] });

    await renderLoaded();

    expect(screen.queryByText('Pending Invitations')).not.toBeInTheDocument();
  });

  // --- Board deletion failure keeps board visible ---
  it('keeps board visible when deletion fails', async () => {
    window.confirm = jest.fn(() => true);
    mockDeleteBoardFromWorkspace.mockResolvedValue({ success: false });

    await renderLoaded();

    const moreButtons = screen.getAllByTestId('icon-more-vertical');
    fireEvent.click(moreButtons[0].closest('button')!);

    await act(async () => {
      fireEvent.click(screen.getByText('Delete Board'));
    });

    expect(screen.getByText('Board One')).toBeInTheDocument();
  });

  it('starts polling when socket is disconnected', async () => {
    jest.useFakeTimers();
    const { useSocket: mockUseSocket } = require('../../components/SocketProvider');
    mockUseSocket.mockReturnValue({
      joinWorkspace: mockJoinWorkspace,
      leaveWorkspace: mockLeaveWorkspace,
      on: mockOn,
      off: mockOff,
      isConnected: false,
    });

    render(<WorkspaceView {...defaultProps} />);
    await waitFor(() => expect(screen.getByText('Test Workspace')).toBeInTheDocument());

    mockGetWorkspaceDetails.mockClear();

    await act(async () => {
      jest.advanceTimersByTime(30000);
    });

    expect(mockGetWorkspaceDetails).toHaveBeenCalled();
    jest.useRealTimers();

    // Restore
    mockUseSocket.mockReturnValue({
      joinWorkspace: mockJoinWorkspace,
      leaveWorkspace: mockLeaveWorkspace,
      on: mockOn,
      off: mockOff,
      isConnected: true,
    });
  });
});
