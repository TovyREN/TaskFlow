import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import WorkspaceAdminPanel from '../../components/WorkspaceAdminPanel';

jest.mock('../../app/actions/workspaceActions', () => ({
  getWorkspaceDetails: jest.fn(),
  updateWorkspace: jest.fn(),
  deleteWorkspace: jest.fn(),
  updateMemberRole: jest.fn(),
  removeMember: jest.fn(),
  createInvitation: jest.fn(),
  cancelInvitation: jest.fn(),
}));

jest.mock('../../components/SocketProvider', () => ({
  useSocket: jest.fn(() => ({
    on: jest.fn(),
    off: jest.fn(),
    isConnected: false,
    joinWorkspace: jest.fn(),
    leaveWorkspace: jest.fn(),
  })),
}));

const {
  getWorkspaceDetails,
  updateWorkspace,
  deleteWorkspace,
  createInvitation,
  cancelInvitation,
} = require('../../app/actions/workspaceActions');

const mockWorkspace = {
  id: 'ws1',
  name: 'Test Workspace',
  description: 'desc',
  color: '#3b82f6',
  ownerId: 'user1',
  members: [
    {
      id: 'm1',
      userId: 'user1',
      role: 'ADMIN',
      user: { id: 'user1', name: 'Owner', email: 'owner@test.com' },
    },
    {
      id: 'm2',
      userId: 'user2',
      role: 'MEMBER',
      user: { id: 'user2', name: 'Member', email: 'member@test.com' },
    },
  ],
  invitations: [
    {
      id: 'inv1',
      inviteeEmail: 'invite@test.com',
      role: 'MEMBER',
      inviter: { name: 'Owner', email: 'owner@test.com' },
    },
  ],
};

const defaultProps = {
  workspaceId: 'ws1',
  userId: 'user1',
  onClose: jest.fn(),
  onWorkspaceDeleted: jest.fn(),
  onWorkspaceUpdated: jest.fn(),
};

describe('WorkspaceAdminPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getWorkspaceDetails.mockResolvedValue(JSON.parse(JSON.stringify(mockWorkspace)));
  });

  it('shows loading then workspace settings', async () => {
    let resolveWs: (v: any) => void;
    getWorkspaceDetails.mockReturnValue(new Promise((r) => { resolveWs = r; }));

    const { container } = render(<WorkspaceAdminPanel {...defaultProps} />);

    // Loading spinner visible
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();

    resolveWs!(JSON.parse(JSON.stringify(mockWorkspace)));

    await waitFor(() => {
      expect(screen.getByText('Workspace Settings')).toBeInTheDocument();
    });
  });

  it('renders settings tab with name, description, color', async () => {
    render(<WorkspaceAdminPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Workspace Settings')).toBeInTheDocument();
    });

    expect(screen.getByText('Workspace Name')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Color')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Workspace')).toBeInTheDocument();
    expect(screen.getByDisplayValue('desc')).toBeInTheDocument();
  });

  it('saves settings successfully', async () => {
    updateWorkspace.mockResolvedValue({ success: true });

    render(<WorkspaceAdminPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Workspace Settings')).toBeInTheDocument();
    });

    const nameInput = screen.getByDisplayValue('Test Workspace');
    fireEvent.change(nameInput, { target: { value: 'Updated Workspace' } });

    fireEvent.click(screen.getByText('Save Changes'));

    await waitFor(() => {
      expect(updateWorkspace).toHaveBeenCalledWith('ws1', 'user1', {
        name: 'Updated Workspace',
        description: 'desc',
        color: '#3b82f6',
      });
    });

    await waitFor(() => {
      expect(defaultProps.onWorkspaceUpdated).toHaveBeenCalled();
    });
  });

  it('switches to members tab and shows members with roles', async () => {
    render(<WorkspaceAdminPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Workspace Settings')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Members/));

    expect(screen.getByText('owner@test.com')).toBeInTheDocument();
    expect(screen.getByText('member@test.com')).toBeInTheDocument();
    // "Member" role displayed as button text for user2
    expect(screen.getAllByText(/Member/).length).toBeGreaterThanOrEqual(1);
  });

  it('shows owner badge for workspace owner', async () => {
    render(<WorkspaceAdminPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Workspace Settings')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Members/));

    // The owner badge text
    expect(screen.getByText('Owner', { selector: 'span.text-xs' })).toBeInTheDocument();
  });

  it('opens role dropdown on click', async () => {
    render(<WorkspaceAdminPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Workspace Settings')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Members/));

    // Find the member row for user2 (non-owner) and click its role button
    const memberEmail = screen.getByText('member@test.com');
    const memberRow = memberEmail.closest('[class*="flex"]')!.parentElement!;
    const roleBtn = memberRow.querySelector('button:not([disabled])');
    expect(roleBtn).toBeTruthy();
    fireEvent.click(roleBtn!);

    await waitFor(() => {
      // Dropdown should show role descriptions
      expect(screen.getByText('Can create and edit boards and tasks')).toBeInTheDocument();
    });
  });

  it('switches to invitations tab and shows invite form and pending invitations', async () => {
    render(<WorkspaceAdminPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Workspace Settings')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Invitations'));

    expect(screen.getByText('Invite New Member')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Email address')).toBeInTheDocument();
    expect(screen.getByText('Send Invite')).toBeInTheDocument();
    expect(screen.getByText('Pending Invitations')).toBeInTheDocument();
    expect(screen.getByText('invite@test.com')).toBeInTheDocument();
  });

  it('sends invitation successfully', async () => {
    createInvitation.mockResolvedValue({
      success: true,
      invitation: {
        id: 'inv2',
        inviteeEmail: 'new@test.com',
        role: 'MEMBER',
        inviter: { name: 'Owner', email: 'owner@test.com' },
      },
    });

    render(<WorkspaceAdminPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Workspace Settings')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Invitations'));

    const emailInput = screen.getByPlaceholderText('Email address');
    fireEvent.change(emailInput, { target: { value: 'new@test.com' } });

    fireEvent.click(screen.getByText('Send Invite'));

    await waitFor(() => {
      expect(createInvitation).toHaveBeenCalledWith('ws1', 'new@test.com', 'MEMBER', 'user1');
    });
  });

  it('shows invite error on failure', async () => {
    createInvitation.mockResolvedValue({
      success: false,
      error: 'User already invited',
    });

    render(<WorkspaceAdminPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Workspace Settings')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Invitations'));

    const emailInput = screen.getByPlaceholderText('Email address');
    fireEvent.change(emailInput, { target: { value: 'existing@test.com' } });

    fireEvent.click(screen.getByText('Send Invite'));

    await waitFor(() => {
      expect(screen.getByText('User already invited')).toBeInTheDocument();
    });
  });

  it('cancels an invitation', async () => {
    cancelInvitation.mockResolvedValue({ success: true });

    render(<WorkspaceAdminPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Workspace Settings')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Invitations'));

    // Click Cancel button on the pending invitation
    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(cancelInvitation).toHaveBeenCalledWith('inv1', 'user1');
    });
  });

  it('shows delete workspace for owner', async () => {
    deleteWorkspace.mockResolvedValue({ success: true });

    render(<WorkspaceAdminPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Workspace Settings')).toBeInTheDocument();
    });

    // Danger zone should be visible for owner
    expect(screen.getByText('Danger Zone')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Delete Workspace'));

    // Type the workspace name to confirm
    const confirmInput = screen.getByPlaceholderText('Test Workspace');
    fireEvent.change(confirmInput, { target: { value: 'Test Workspace' } });

    fireEvent.click(screen.getByText('Delete Forever'));

    await waitFor(() => {
      expect(deleteWorkspace).toHaveBeenCalledWith('ws1', 'user1');
    });

    await waitFor(() => {
      expect(defaultProps.onWorkspaceDeleted).toHaveBeenCalled();
    });
  });

  it('closes on overlay click', async () => {
    render(<WorkspaceAdminPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Workspace Settings')).toBeInTheDocument();
    });

    const overlay = screen.getByText('Workspace Settings').closest('.fixed');
    fireEvent.click(overlay!);

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('returns null when workspace data is null', async () => {
    getWorkspaceDetails.mockResolvedValue(null);

    const { container } = render(<WorkspaceAdminPanel {...defaultProps} />);

    await waitFor(() => {
      // After loading completes with null data, component returns null
      expect(container.innerHTML).toBe('');
    });
  });

  // --- NEW TESTS for uncovered lines ---

  it('subscribes to socket events when connected', async () => {
    const mockOn = jest.fn();
    const mockOff = jest.fn();
    const mockJoinWorkspace = jest.fn();
    const mockLeaveWorkspace = jest.fn();
    const { useSocket } = require('../../components/SocketProvider');
    useSocket.mockReturnValue({
      on: mockOn,
      off: mockOff,
      isConnected: true,
      joinWorkspace: mockJoinWorkspace,
      leaveWorkspace: mockLeaveWorkspace,
    });

    render(<WorkspaceAdminPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Workspace Settings')).toBeInTheDocument();
    });

    expect(mockJoinWorkspace).toHaveBeenCalledWith('ws1');
    expect(mockOn).toHaveBeenCalledWith('workspace:member-role-changed', expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith('workspace:member-added', expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith('workspace:member-removed', expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith('workspace:invitation-created', expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith('workspace:invitation-cancelled', expect.any(Function));
  });

  it('cleans up socket events on unmount', async () => {
    const mockOn = jest.fn();
    const mockOff = jest.fn();
    const mockJoinWorkspace = jest.fn();
    const mockLeaveWorkspace = jest.fn();
    const { useSocket } = require('../../components/SocketProvider');
    useSocket.mockReturnValue({
      on: mockOn,
      off: mockOff,
      isConnected: true,
      joinWorkspace: mockJoinWorkspace,
      leaveWorkspace: mockLeaveWorkspace,
    });

    const { unmount } = render(<WorkspaceAdminPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Workspace Settings')).toBeInTheDocument();
    });

    unmount();

    expect(mockLeaveWorkspace).toHaveBeenCalledWith('ws1');
    expect(mockOff).toHaveBeenCalledWith('workspace:member-role-changed', expect.any(Function));
    expect(mockOff).toHaveBeenCalledWith('workspace:member-added', expect.any(Function));
    expect(mockOff).toHaveBeenCalledWith('workspace:member-removed', expect.any(Function));
    expect(mockOff).toHaveBeenCalledWith('workspace:invitation-created', expect.any(Function));
    expect(mockOff).toHaveBeenCalledWith('workspace:invitation-cancelled', expect.any(Function));
  });

  it('socket event handler reloads workspace for matching workspaceId', async () => {
    const mockOn = jest.fn();
    const mockOff = jest.fn();
    const { useSocket } = require('../../components/SocketProvider');
    useSocket.mockReturnValue({
      on: mockOn,
      off: mockOff,
      isConnected: true,
      joinWorkspace: jest.fn(),
      leaveWorkspace: jest.fn(),
    });

    render(<WorkspaceAdminPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Workspace Settings')).toBeInTheDocument();
    });

    // Find the member-role-changed handler
    const roleChangedCall = mockOn.mock.calls.find(
      (c: any[]) => c[0] === 'workspace:member-role-changed'
    );
    expect(roleChangedCall).toBeDefined();

    getWorkspaceDetails.mockClear();

    // Trigger with matching workspaceId
    await waitFor(async () => {
      roleChangedCall![1]({ workspaceId: 'ws1' });
    });

    // Should reload workspace
    expect(getWorkspaceDetails).toHaveBeenCalled();
  });

  it('socket event handler ignores different workspaceId', async () => {
    const mockOn = jest.fn();
    const mockOff = jest.fn();
    const { useSocket } = require('../../components/SocketProvider');
    useSocket.mockReturnValue({
      on: mockOn,
      off: mockOff,
      isConnected: true,
      joinWorkspace: jest.fn(),
      leaveWorkspace: jest.fn(),
    });

    render(<WorkspaceAdminPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Workspace Settings')).toBeInTheDocument();
    });

    const roleChangedCall = mockOn.mock.calls.find(
      (c: any[]) => c[0] === 'workspace:member-role-changed'
    );

    getWorkspaceDetails.mockClear();

    // Trigger with different workspaceId
    roleChangedCall![1]({ workspaceId: 'other-ws' });

    // Should NOT reload workspace
    expect(getWorkspaceDetails).not.toHaveBeenCalled();
  });

  it('updates member role via dropdown', async () => {
    const { updateMemberRole } = require('../../app/actions/workspaceActions');
    updateMemberRole.mockResolvedValue({ success: true });

    render(<WorkspaceAdminPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Workspace Settings')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Members/));

    // Find the member row for user2 (non-owner) and click its role button
    const memberEmail = screen.getByText('member@test.com');
    const memberRow = memberEmail.closest('[class*="flex"]')!.parentElement!;
    const roleBtn = memberRow.querySelector('button:not([disabled])');
    fireEvent.click(roleBtn!);

    // Click on Viewer role in dropdown
    await waitFor(() => {
      expect(screen.getByText('Can only view boards and tasks (read-only)')).toBeInTheDocument();
    });

    // Find and click the Viewer option
    const viewerOption = screen.getByText('Can only view boards and tasks (read-only)').closest('button')!;
    fireEvent.click(viewerOption);

    await waitFor(() => {
      expect(updateMemberRole).toHaveBeenCalledWith('ws1', 'user2', 'VIEWER', 'user1');
    });
  });

  it('removes a member with confirmation', async () => {
    const { removeMember } = require('../../app/actions/workspaceActions');
    removeMember.mockResolvedValue({ success: true });
    window.confirm = jest.fn().mockReturnValue(true);

    render(<WorkspaceAdminPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Workspace Settings')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Members/));

    // Find the remove button for user2
    const removeBtn = screen.getByTitle('Remove member');
    fireEvent.click(removeBtn);

    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to remove this member?');

    await waitFor(() => {
      expect(removeMember).toHaveBeenCalledWith('ws1', 'user2', 'user1');
    });
  });

  it('does not remove member when confirmation is cancelled', async () => {
    const { removeMember } = require('../../app/actions/workspaceActions');
    removeMember.mockResolvedValue({ success: true });
    window.confirm = jest.fn().mockReturnValue(false);

    render(<WorkspaceAdminPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Workspace Settings')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Members/));

    const removeBtn = screen.getByTitle('Remove member');
    fireEvent.click(removeBtn);

    expect(removeMember).not.toHaveBeenCalled();
  });

  it('does not delete workspace when confirm text does not match', async () => {
    render(<WorkspaceAdminPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Workspace Settings')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Delete Workspace'));

    const confirmInput = screen.getByPlaceholderText('Test Workspace');
    fireEvent.change(confirmInput, { target: { value: 'Wrong Name' } });

    const deleteBtn = screen.getByText('Delete Forever');
    expect(deleteBtn).toBeDisabled();
  });

  it('cancels delete confirmation', async () => {
    render(<WorkspaceAdminPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Workspace Settings')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Delete Workspace'));

    // Should see confirm input
    expect(screen.getByPlaceholderText('Test Workspace')).toBeInTheDocument();

    // Click cancel
    const cancelBtn = screen.getAllByRole('button').find(
      (btn) => btn.textContent === 'Cancel' && btn.className.includes('text-slate-600')
    );
    fireEvent.click(cancelBtn!);

    // Confirm input should disappear and Delete Workspace button should be back
    expect(screen.getByText('Delete Workspace')).toBeInTheDocument();
  });

  it('hides danger zone for non-owner', async () => {
    getWorkspaceDetails.mockResolvedValue({
      ...JSON.parse(JSON.stringify(mockWorkspace)),
      ownerId: 'someone-else',
    });

    render(<WorkspaceAdminPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Workspace Settings')).toBeInTheDocument();
    });

    expect(screen.queryByText('Danger Zone')).not.toBeInTheDocument();
  });

  it('shows invite error with fallback message', async () => {
    createInvitation.mockResolvedValue({
      success: false,
    });

    render(<WorkspaceAdminPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Workspace Settings')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Invitations'));

    const emailInput = screen.getByPlaceholderText('Email address');
    fireEvent.change(emailInput, { target: { value: 'fail@test.com' } });

    fireEvent.click(screen.getByText('Send Invite'));

    await waitFor(() => {
      expect(screen.getByText('Failed to send invitation')).toBeInTheDocument();
    });
  });

  it('shows no pending invitations message when empty', async () => {
    getWorkspaceDetails.mockResolvedValue({
      ...JSON.parse(JSON.stringify(mockWorkspace)),
      invitations: [],
    });

    render(<WorkspaceAdminPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Workspace Settings')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Invitations'));

    expect(screen.getByText('No pending invitations')).toBeInTheDocument();
  });

  it('changes color in settings tab', async () => {
    updateWorkspace.mockResolvedValue({ success: true });

    render(<WorkspaceAdminPanel {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Workspace Settings')).toBeInTheDocument();
    });

    // Click a different color
    const colorButtons = screen.getByText('Color').parentElement!.querySelectorAll('button');
    // Click the second color (#8b5cf6)
    fireEvent.click(colorButtons[1]);

    fireEvent.click(screen.getByText('Save Changes'));

    await waitFor(() => {
      expect(updateWorkspace).toHaveBeenCalledWith('ws1', 'user1', expect.objectContaining({
        color: '#8b5cf6',
      }));
    });
  });
});
