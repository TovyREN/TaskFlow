import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import NotificationsView from '../../components/NotificationsView';
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../../app/actions/notificationActions';
import '@testing-library/jest-dom';

jest.mock('../../app/actions/notificationActions', () => ({
  getNotifications: jest.fn(),
  markNotificationAsRead: jest.fn().mockResolvedValue({ success: true }),
  markAllNotificationsAsRead: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('../../components/SocketProvider', () => ({
  useSocket: jest.fn(() => ({ on: jest.fn(), off: jest.fn(), isConnected: false })),
}));

const mockTaskAssignedNotification = {
  id: 'notif-1',
  type: 'TASK_ASSIGNED' as const,
  message: 'You have been assigned to task "Fix bug"',
  isRead: false,
  userId: 'user-123',
  taskId: 'task-1',
  task: {
    id: 'task-1',
    title: 'Fix bug',
    list: {
      board: {
        id: 'board-1',
        workspaceId: 'ws-1',
      },
    },
  },
  actorId: 'actor-1',
  actor: {
    id: 'actor-1',
    name: 'Alice',
    email: 'alice@test.com',
  },
  createdAt: new Date().toISOString(),
};

const mockPendingInvitation = {
  id: 'notif-2',
  type: 'WORKSPACE_INVITATION' as const,
  message: 'You are invited to workspace "Dev Team"',
  isRead: false,
  userId: 'user-123',
  workspaceInvitationId: 'inv-1',
  workspaceInvitation: {
    id: 'inv-1',
    status: 'PENDING',
    role: 'MEMBER',
    workspace: {
      id: 'ws-2',
      name: 'Dev Team',
      color: '#3B82F6',
    },
  },
  actor: {
    id: 'actor-2',
    name: 'Bob',
    email: 'bob@test.com',
  },
  createdAt: new Date().toISOString(),
};

const mockAcceptedInvitation = {
  ...mockPendingInvitation,
  id: 'notif-3',
  isRead: true,
  workspaceInvitation: {
    ...mockPendingInvitation.workspaceInvitation!,
    status: 'ACCEPTED',
  },
};

const mockDeclinedInvitation = {
  ...mockPendingInvitation,
  id: 'notif-4',
  isRead: true,
  workspaceInvitation: {
    ...mockPendingInvitation.workspaceInvitation!,
    status: 'DECLINED',
  },
};

describe('NotificationsView Component', () => {
  const defaultProps = {
    userId: 'user-123',
    onBack: jest.fn(),
    onNavigateToBoard: jest.fn(),
    onRespondToInvitation: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getNotifications as jest.Mock).mockResolvedValue([]);
  });

  it('shows loading state then renders notifications list', async () => {
    (getNotifications as jest.Mock).mockResolvedValue([mockTaskAssignedNotification]);

    await act(async () => {
      render(<NotificationsView {...defaultProps} />);
    });

    // After loading resolves, should show the notification
    await waitFor(() => {
      expect(screen.getByText(mockTaskAssignedNotification.message)).toBeInTheDocument();
    });

    expect(screen.queryByText('Chargement des notifications...')).not.toBeInTheDocument();
  });

  it('shows empty state when no notifications', async () => {
    (getNotifications as jest.Mock).mockResolvedValue([]);

    await act(async () => {
      render(<NotificationsView {...defaultProps} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Aucune notification')).toBeInTheDocument();
    });
  });

  it('calls onBack when back button is clicked', async () => {
    (getNotifications as jest.Mock).mockResolvedValue([]);

    await act(async () => {
      render(<NotificationsView {...defaultProps} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Aucune notification')).toBeInTheDocument();
    });

    const backButton = screen.getByText('Notifications').parentElement!.querySelector('button')!;
    fireEvent.click(backButton);

    expect(defaultProps.onBack).toHaveBeenCalledTimes(1);
  });

  it('marks notification as read when clicked (non-invitation type)', async () => {
    (getNotifications as jest.Mock).mockResolvedValue([mockTaskAssignedNotification]);

    await act(async () => {
      render(<NotificationsView {...defaultProps} />);
    });

    await waitFor(() => {
      expect(screen.getByText(mockTaskAssignedNotification.message)).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText(mockTaskAssignedNotification.message));
    });

    expect(markNotificationAsRead).toHaveBeenCalledWith('notif-1', 'user-123');
  });

  it('navigates to board when clicking TASK_ASSIGNED notification', async () => {
    (getNotifications as jest.Mock).mockResolvedValue([mockTaskAssignedNotification]);

    await act(async () => {
      render(<NotificationsView {...defaultProps} />);
    });

    await waitFor(() => {
      expect(screen.getByText(mockTaskAssignedNotification.message)).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText(mockTaskAssignedNotification.message));
    });

    expect(defaultProps.onNavigateToBoard).toHaveBeenCalledWith('board-1', 'ws-1');
  });

  it('shows mark all as read button when unread notifications exist', async () => {
    (getNotifications as jest.Mock).mockResolvedValue([mockTaskAssignedNotification]);

    await act(async () => {
      render(<NotificationsView {...defaultProps} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Tout marquer comme lu')).toBeInTheDocument();
    });
  });

  it('shows Accepter/Refuser buttons for PENDING invitation', async () => {
    (getNotifications as jest.Mock).mockResolvedValue([mockPendingInvitation]);

    await act(async () => {
      render(<NotificationsView {...defaultProps} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Accepter')).toBeInTheDocument();
      expect(screen.getByText('Refuser')).toBeInTheDocument();
    });
  });

  it('shows "Acceptee" for ACCEPTED invitation status', async () => {
    (getNotifications as jest.Mock).mockResolvedValue([mockAcceptedInvitation]);

    await act(async () => {
      render(<NotificationsView {...defaultProps} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Acceptee')).toBeInTheDocument();
    });
  });

  it('shows "Refusee" for DECLINED invitation status', async () => {
    (getNotifications as jest.Mock).mockResolvedValue([mockDeclinedInvitation]);

    await act(async () => {
      render(<NotificationsView {...defaultProps} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Refusee')).toBeInTheDocument();
    });
  });

  it('does NOT navigate for WORKSPACE_INVITATION type click', async () => {
    (getNotifications as jest.Mock).mockResolvedValue([mockPendingInvitation]);

    await act(async () => {
      render(<NotificationsView {...defaultProps} />);
    });

    await waitFor(() => {
      expect(screen.getByText(mockPendingInvitation.message)).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText(mockPendingInvitation.message));
    });

    expect(defaultProps.onNavigateToBoard).not.toHaveBeenCalled();
    expect(markNotificationAsRead).not.toHaveBeenCalled();
  });

  // --- NEW TESTS for uncovered lines ---

  it('timeAgo: returns "Il y a X min" for recent notifications', async () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60000).toISOString();
    (getNotifications as jest.Mock).mockResolvedValue([
      { ...mockTaskAssignedNotification, id: 'n-min', createdAt: fiveMinAgo },
    ]);

    await act(async () => {
      render(<NotificationsView {...defaultProps} />);
    });

    await waitFor(() => {
      expect(screen.getByText(/Il y a 5 min/)).toBeInTheDocument();
    });
  });

  it('timeAgo: returns "Il y a Xh" for hours-old notifications', async () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 3600000).toISOString();
    (getNotifications as jest.Mock).mockResolvedValue([
      { ...mockTaskAssignedNotification, id: 'n-hour', createdAt: threeHoursAgo },
    ]);

    await act(async () => {
      render(<NotificationsView {...defaultProps} />);
    });

    await waitFor(() => {
      expect(screen.getByText(/Il y a 3h/)).toBeInTheDocument();
    });
  });

  it('timeAgo: returns "Il y a Xj" for days-old notifications', async () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString();
    (getNotifications as jest.Mock).mockResolvedValue([
      { ...mockTaskAssignedNotification, id: 'n-day', createdAt: twoDaysAgo },
    ]);

    await act(async () => {
      render(<NotificationsView {...defaultProps} />);
    });

    await waitFor(() => {
      expect(screen.getByText(/Il y a 2j/)).toBeInTheDocument();
    });
  });

  it('timeAgo: returns formatted date for old notifications (>7 days)', async () => {
    const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toISOString();
    (getNotifications as jest.Mock).mockResolvedValue([
      { ...mockTaskAssignedNotification, id: 'n-old', createdAt: twoWeeksAgo },
    ]);

    await act(async () => {
      render(<NotificationsView {...defaultProps} />);
    });

    await waitFor(() => {
      // French locale date format (dd/mm/yyyy)
      expect(screen.getByText(/\d{2}\/\d{2}\/\d{4}/)).toBeInTheDocument();
    });
  });

  it('subscribes to socket notification:new event when connected', async () => {
    const mockOn = jest.fn();
    const mockOff = jest.fn();
    const { useSocket } = require('../../components/SocketProvider');
    useSocket.mockReturnValue({ on: mockOn, off: mockOff, isConnected: true });

    (getNotifications as jest.Mock).mockResolvedValue([]);

    await act(async () => {
      render(<NotificationsView {...defaultProps} />);
    });

    await waitFor(() => {
      expect(mockOn).toHaveBeenCalledWith('notification:new', expect.any(Function));
    });
  });

  it('cleans up socket subscription on unmount', async () => {
    const mockOn = jest.fn();
    const mockOff = jest.fn();
    const { useSocket } = require('../../components/SocketProvider');
    useSocket.mockReturnValue({ on: mockOn, off: mockOff, isConnected: true });

    (getNotifications as jest.Mock).mockResolvedValue([]);

    let unmount: () => void;
    await act(async () => {
      const result = render(<NotificationsView {...defaultProps} />);
      unmount = result.unmount;
    });

    await waitFor(() => {
      expect(mockOn).toHaveBeenCalledWith('notification:new', expect.any(Function));
    });

    act(() => {
      unmount();
    });

    expect(mockOff).toHaveBeenCalledWith('notification:new', expect.any(Function));
  });

  it('adds new notification when socket event fires', async () => {
    const mockOn = jest.fn();
    const mockOff = jest.fn();
    const { useSocket } = require('../../components/SocketProvider');
    useSocket.mockReturnValue({ on: mockOn, off: mockOff, isConnected: true });

    (getNotifications as jest.Mock).mockResolvedValue([]);

    await act(async () => {
      render(<NotificationsView {...defaultProps} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Aucune notification')).toBeInTheDocument();
    });

    // Find the notification:new handler and fire it
    const notifNewCall = mockOn.mock.calls.find((c: any[]) => c[0] === 'notification:new');
    expect(notifNewCall).toBeDefined();

    await act(async () => {
      notifNewCall![1]({
        ...mockTaskAssignedNotification,
        id: 'socket-notif',
        message: 'Socket pushed notification',
      });
    });

    expect(screen.getByText('Socket pushed notification')).toBeInTheDocument();
  });

  it('handles mark all as read', async () => {
    (getNotifications as jest.Mock).mockResolvedValue([
      mockTaskAssignedNotification,
      { ...mockTaskAssignedNotification, id: 'notif-extra', message: 'Another task' },
    ]);

    await act(async () => {
      render(<NotificationsView {...defaultProps} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Tout marquer comme lu')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Tout marquer comme lu'));
    });

    expect(markAllNotificationsAsRead).toHaveBeenCalledWith('user-123');
  });

  it('handles accepting an invitation', async () => {
    (getNotifications as jest.Mock).mockResolvedValue([mockPendingInvitation]);

    await act(async () => {
      render(<NotificationsView {...defaultProps} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Accepter')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Accepter'));
    });

    expect(defaultProps.onRespondToInvitation).toHaveBeenCalledWith('inv-1', true);

    await waitFor(() => {
      expect(markNotificationAsRead).toHaveBeenCalledWith('notif-2', 'user-123');
    });
  });

  it('handles declining an invitation', async () => {
    (getNotifications as jest.Mock).mockResolvedValue([mockPendingInvitation]);

    await act(async () => {
      render(<NotificationsView {...defaultProps} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Refuser')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Refuser'));
    });

    expect(defaultProps.onRespondToInvitation).toHaveBeenCalledWith('inv-1', false);

    await waitFor(() => {
      expect(markNotificationAsRead).toHaveBeenCalledWith('notif-2', 'user-123');
    });
  });

  it('does not call handleInvitationResponse when workspaceInvitationId is missing', async () => {
    const noInvIdNotif = {
      ...mockPendingInvitation,
      id: 'notif-no-inv',
      workspaceInvitationId: null,
    };
    (getNotifications as jest.Mock).mockResolvedValue([noInvIdNotif]);

    await act(async () => {
      render(<NotificationsView {...defaultProps} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Accepter')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Accepter'));
    });

    // Should NOT call onRespondToInvitation since workspaceInvitationId is null
    expect(defaultProps.onRespondToInvitation).not.toHaveBeenCalled();
  });

  it('does not mark as read when clicking an already-read notification', async () => {
    const readNotification = {
      ...mockTaskAssignedNotification,
      id: 'notif-read',
      isRead: true,
    };
    (getNotifications as jest.Mock).mockResolvedValue([readNotification]);

    await act(async () => {
      render(<NotificationsView {...defaultProps} />);
    });

    await waitFor(() => {
      expect(screen.getByText(readNotification.message)).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText(readNotification.message));
    });

    // Should navigate but not mark as read again
    expect(markNotificationAsRead).not.toHaveBeenCalled();
    expect(defaultProps.onNavigateToBoard).toHaveBeenCalledWith('board-1', 'ws-1');
  });

  it('shows actor email when actor name is null', async () => {
    const notifWithEmailOnly = {
      ...mockTaskAssignedNotification,
      id: 'notif-email',
      actor: { id: 'a1', name: null, email: 'actor@test.com' },
    };
    (getNotifications as jest.Mock).mockResolvedValue([notifWithEmailOnly]);

    await act(async () => {
      render(<NotificationsView {...defaultProps} />);
    });

    await waitFor(() => {
      expect(screen.getByText(/par actor@test.com/)).toBeInTheDocument();
    });
  });
});
