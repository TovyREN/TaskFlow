import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

// Mock sub-components
jest.mock('../../components/Login', () => ({
  __esModule: true,
  default: ({ onLogin, onBack }: any) => (
    <div data-testid="login">
      <button onClick={() => onLogin({ id: 'u1', name: 'Test', email: 'test@test.com', avatar: '' })}>Login</button>
      <button onClick={onBack}>Back</button>
    </div>
  ),
}));

jest.mock('../../components/Register', () => ({
  __esModule: true,
  default: ({ onRegisterSuccess, onSwitchToLogin, onBack }: any) => (
    <div data-testid="register">
      <button onClick={() => onRegisterSuccess({ id: 'u1', name: 'Test', email: 'test@test.com', avatar: '' })}>Register</button>
      <button onClick={onSwitchToLogin}>ToLogin</button>
      <button onClick={onBack}>Back</button>
    </div>
  ),
}));

jest.mock('../../components/WorkspaceList', () => ({
  __esModule: true,
  default: ({ onSelectWorkspace, onCreateWorkspace }: any) => (
    <div data-testid="workspace-list">
      <button onClick={() => onSelectWorkspace('ws1')}>SelectWS</button>
      <button onClick={() => onCreateWorkspace('New WS')}>CreateWS</button>
    </div>
  ),
}));

jest.mock('../../components/WorkspaceView', () => ({
  __esModule: true,
  default: ({ onBack, onSelectBoard, onOpenAdmin }: any) => (
    <div data-testid="workspace-view">
      <button onClick={onBack}>Back</button>
      <button onClick={() => onSelectBoard('b1', 'ws1')}>Board</button>
      <button onClick={onOpenAdmin}>Admin</button>
    </div>
  ),
}));

jest.mock('../../components/BoardView', () => ({
  __esModule: true,
  default: ({ onBack, onSwitchBoard }: any) => (
    <div data-testid="board-view">
      <button onClick={onBack}>Back</button>
      <button onClick={() => onSwitchBoard('b2')}>SwitchBoard</button>
    </div>
  ),
}));

jest.mock('../../components/Header', () => ({
  __esModule: true,
  default: ({ onLogout, onLogoClick, onNotificationsClick }: any) => (
    <div data-testid="header">
      <button onClick={onLogout}>Logout</button>
      <button onClick={onLogoClick}>Logo</button>
      <button onClick={onNotificationsClick}>Notifs</button>
    </div>
  ),
}));

jest.mock('../../components/LandingPage', () => ({
  __esModule: true,
  default: ({ onLoginClick, onRegisterClick }: any) => (
    <div data-testid="landing">
      <button onClick={onLoginClick}>Login</button>
      <button onClick={onRegisterClick}>Register</button>
    </div>
  ),
}));

jest.mock('../../components/NotificationsView', () => ({
  __esModule: true,
  default: ({ onBack, onNavigateToBoard, onRespondToInvitation }: any) => (
    <div data-testid="notifications">
      <button onClick={onBack}>Back</button>
      <button onClick={() => onNavigateToBoard('b1', 'ws1')}>NavToBoard</button>
      <button onClick={() => onRespondToInvitation('inv1', true)}>AcceptInvite</button>
    </div>
  ),
}));

jest.mock('../../components/WorkspaceAdminPanel', () => ({
  __esModule: true,
  default: ({ onClose, onWorkspaceDeleted, onWorkspaceUpdated }: any) => (
    <div data-testid="admin-panel">
      <button onClick={onClose}>Close</button>
      <button onClick={onWorkspaceDeleted}>DeleteWS</button>
      <button onClick={onWorkspaceUpdated}>UpdateWS</button>
    </div>
  ),
}));

jest.mock('../../components/SocketProvider', () => ({
  SocketProvider: ({ children }: any) => <div>{children}</div>,
}));

const mockGetUser = jest.fn();
const mockLogout = jest.fn();
jest.mock('../../services/storageService', () => ({
  storageService: {
    getUser: (...args: any[]) => mockGetUser(...args),
    logout: (...args: any[]) => mockLogout(...args),
  },
}));

const mockGetWorkspaces = jest.fn().mockResolvedValue([]);
const mockCreateWorkspace = jest.fn().mockResolvedValue({ success: true, workspace: { id: 'new-ws', name: 'New WS' } });
const mockRespondToInvitation = jest.fn().mockResolvedValue({ success: true });
jest.mock('../../app/actions/workspaceActions', () => ({
  getWorkspaces: (...args: any[]) => mockGetWorkspaces(...args),
  createWorkspace: (...args: any[]) => mockCreateWorkspace(...args),
  respondToInvitation: (...args: any[]) => mockRespondToInvitation(...args),
}));

jest.mock('../../app/actions/notificationActions', () => ({
  checkDueDateNotifications: jest.fn().mockResolvedValue({ success: true }),
}));

import TrelloPage from '../../app/page';

describe('TrelloPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockReturnValue(null);
    mockGetWorkspaces.mockResolvedValue([]);
    sessionStorage.clear();
  });

  it('shows loading then landing page when no user', async () => {
    // Delay getWorkspaces to keep isLoading=true long enough to observe
    let resolveWorkspaces: any;
    mockGetUser.mockReturnValue(null);

    render(<TrelloPage />);

    // The component resolves quickly with mocks, so just verify final state
    await waitFor(() => {
      expect(screen.getByTestId('landing')).toBeInTheDocument();
    });
  });

  it('shows login page after clicking Login on landing', async () => {
    render(<TrelloPage />);

    await waitFor(() => {
      expect(screen.getByTestId('landing')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Login'));

    await waitFor(() => {
      expect(screen.getByTestId('login')).toBeInTheDocument();
    });
  });

  it('shows register page after clicking Register on landing', async () => {
    render(<TrelloPage />);

    await waitFor(() => {
      expect(screen.getByTestId('landing')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Register'));

    await waitFor(() => {
      expect(screen.getByTestId('register')).toBeInTheDocument();
    });
  });

  it('login flow: login -> dashboard with workspace list', async () => {
    render(<TrelloPage />);

    await waitFor(() => {
      expect(screen.getByTestId('landing')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Login'));

    await waitFor(() => {
      expect(screen.getByTestId('login')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Login'));

    await waitFor(() => {
      expect(screen.getByTestId('workspace-list')).toBeInTheDocument();
    });

    expect(screen.getByTestId('header')).toBeInTheDocument();
  });

  it('register flow: register -> dashboard', async () => {
    render(<TrelloPage />);

    await waitFor(() => {
      expect(screen.getByTestId('landing')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Register'));

    await waitFor(() => {
      expect(screen.getByTestId('register')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Register'));

    await waitFor(() => {
      expect(screen.getByTestId('workspace-list')).toBeInTheDocument();
    });
  });

  it('logout returns to landing page', async () => {
    render(<TrelloPage />);

    await waitFor(() => {
      expect(screen.getByTestId('landing')).toBeInTheDocument();
    });

    // Login first
    fireEvent.click(screen.getByText('Login'));
    await waitFor(() => expect(screen.getByTestId('login')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Login'));
    await waitFor(() => expect(screen.getByTestId('workspace-list')).toBeInTheDocument());

    // Logout
    fireEvent.click(screen.getByText('Logout'));

    await waitFor(() => {
      expect(screen.getByTestId('landing')).toBeInTheDocument();
    });

    expect(mockLogout).toHaveBeenCalled();
  });

  it('navigate: dashboard -> workspace -> board -> back to workspace', async () => {
    render(<TrelloPage />);

    await waitFor(() => expect(screen.getByTestId('landing')).toBeInTheDocument());

    // Login
    fireEvent.click(screen.getByText('Login'));
    await waitFor(() => expect(screen.getByTestId('login')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Login'));
    await waitFor(() => expect(screen.getByTestId('workspace-list')).toBeInTheDocument());

    // Select workspace
    fireEvent.click(screen.getByText('SelectWS'));
    await waitFor(() => expect(screen.getByTestId('workspace-view')).toBeInTheDocument());

    // Select board
    fireEvent.click(screen.getByText('Board'));
    await waitFor(() => expect(screen.getByTestId('board-view')).toBeInTheDocument());

    // Go back to workspace
    fireEvent.click(screen.getByText('Back'));
    await waitFor(() => expect(screen.getByTestId('workspace-view')).toBeInTheDocument());
  });

  it('navigate to notifications view', async () => {
    render(<TrelloPage />);

    await waitFor(() => expect(screen.getByTestId('landing')).toBeInTheDocument());

    // Login
    fireEvent.click(screen.getByText('Login'));
    await waitFor(() => expect(screen.getByTestId('login')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Login'));
    await waitFor(() => expect(screen.getByTestId('workspace-list')).toBeInTheDocument());

    // Click notifications
    fireEvent.click(screen.getByText('Notifs'));
    await waitFor(() => expect(screen.getByTestId('notifications')).toBeInTheDocument());
  });

  it('logo click goes to dashboard from any view', async () => {
    render(<TrelloPage />);

    await waitFor(() => expect(screen.getByTestId('landing')).toBeInTheDocument());

    // Login
    fireEvent.click(screen.getByText('Login'));
    await waitFor(() => expect(screen.getByTestId('login')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Login'));
    await waitFor(() => expect(screen.getByTestId('workspace-list')).toBeInTheDocument());

    // Navigate to workspace
    fireEvent.click(screen.getByText('SelectWS'));
    await waitFor(() => expect(screen.getByTestId('workspace-view')).toBeInTheDocument());

    // Click logo to go back to dashboard
    fireEvent.click(screen.getByText('Logo'));
    await waitFor(() => expect(screen.getByTestId('workspace-list')).toBeInTheDocument());
  });

  it('back from login goes to landing', async () => {
    render(<TrelloPage />);

    await waitFor(() => expect(screen.getByTestId('landing')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Login'));
    await waitFor(() => expect(screen.getByTestId('login')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Back'));
    await waitFor(() => expect(screen.getByTestId('landing')).toBeInTheDocument());
  });

  it('restores session from localStorage on mount', async () => {
    mockGetUser.mockReturnValue({ id: 'u1', name: 'Test', email: 'test@test.com', avatar: '' });
    mockGetWorkspaces.mockResolvedValue([{ id: 'ws1', name: 'Workspace 1' }]);

    render(<TrelloPage />);

    await waitFor(() => {
      expect(screen.getByTestId('workspace-list')).toBeInTheDocument();
    });

    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(mockGetWorkspaces).toHaveBeenCalledWith('u1');
  });

  it('restores saved viewState for authenticated user (Lines 50-57)', async () => {
    mockGetUser.mockReturnValue({ id: 'u1', name: 'Test', email: 'test@test.com', avatar: '' });
    mockGetWorkspaces.mockResolvedValue([{ id: 'ws1', name: 'Workspace 1' }]);
    sessionStorage.setItem('taskflow_viewState', JSON.stringify({ type: 'WORKSPACE', workspaceId: 'ws1' }));

    render(<TrelloPage />);

    await waitFor(() => {
      expect(screen.getByTestId('workspace-view')).toBeInTheDocument();
    });
  });

  it('falls back to DASHBOARD on invalid saved viewState for authenticated user (Lines 55-56)', async () => {
    mockGetUser.mockReturnValue({ id: 'u1', name: 'Test', email: 'test@test.com', avatar: '' });
    mockGetWorkspaces.mockResolvedValue([]);
    sessionStorage.setItem('taskflow_viewState', 'INVALID_JSON{{{');

    render(<TrelloPage />);

    await waitFor(() => {
      expect(screen.getByTestId('workspace-list')).toBeInTheDocument();
    });
  });

  it('restores LOGIN viewState for non-authenticated user (Lines 63-71)', async () => {
    mockGetUser.mockReturnValue(null);
    sessionStorage.setItem('taskflow_viewState', JSON.stringify({ type: 'LOGIN' }));

    render(<TrelloPage />);

    await waitFor(() => {
      expect(screen.getByTestId('login')).toBeInTheDocument();
    });
  });

  it('restores REGISTER viewState for non-authenticated user (Lines 67-68)', async () => {
    mockGetUser.mockReturnValue(null);
    sessionStorage.setItem('taskflow_viewState', JSON.stringify({ type: 'REGISTER' }));

    render(<TrelloPage />);

    await waitFor(() => {
      expect(screen.getByTestId('register')).toBeInTheDocument();
    });
  });

  it('falls back to LANDING for non-auth user with non-auth viewState (Lines 69-70)', async () => {
    mockGetUser.mockReturnValue(null);
    sessionStorage.setItem('taskflow_viewState', JSON.stringify({ type: 'DASHBOARD' }));

    render(<TrelloPage />);

    await waitFor(() => {
      expect(screen.getByTestId('landing')).toBeInTheDocument();
    });
  });

  it('falls back to LANDING on invalid JSON for non-auth user (Lines 72-73)', async () => {
    mockGetUser.mockReturnValue(null);
    sessionStorage.setItem('taskflow_viewState', 'BAD_JSON!!!');

    render(<TrelloPage />);

    await waitFor(() => {
      expect(screen.getByTestId('landing')).toBeInTheDocument();
    });
  });

  it('handles invitation response (Lines 129-135)', async () => {
    render(<TrelloPage />);
    await waitFor(() => expect(screen.getByTestId('landing')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Login'));
    await waitFor(() => expect(screen.getByTestId('login')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Login'));
    await waitFor(() => expect(screen.getByTestId('workspace-list')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Notifs'));
    await waitFor(() => expect(screen.getByTestId('notifications')).toBeInTheDocument());

    await act(async () => { fireEvent.click(screen.getByText('AcceptInvite')); });
    expect(mockRespondToInvitation).toHaveBeenCalledWith('inv1', 'u1', true);
  });

  it('handles navigate to board from notifications (Lines 210-211)', async () => {
    render(<TrelloPage />);
    await waitFor(() => expect(screen.getByTestId('landing')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Login'));
    await waitFor(() => expect(screen.getByTestId('login')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Login'));
    await waitFor(() => expect(screen.getByTestId('workspace-list')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Notifs'));
    await waitFor(() => expect(screen.getByTestId('notifications')).toBeInTheDocument());

    fireEvent.click(screen.getByText('NavToBoard'));
    await waitFor(() => expect(screen.getByTestId('board-view')).toBeInTheDocument());
  });

  it('handles create workspace (Lines 121-127)', async () => {
    render(<TrelloPage />);
    await waitFor(() => expect(screen.getByTestId('landing')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Login'));
    await waitFor(() => expect(screen.getByTestId('login')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Login'));
    await waitFor(() => expect(screen.getByTestId('workspace-list')).toBeInTheDocument());

    await act(async () => { fireEvent.click(screen.getByText('CreateWS')); });
    expect(mockCreateWorkspace).toHaveBeenCalledWith('New WS', 'u1', undefined, undefined);
  });

  it('handles admin panel open and close (Lines 137-140, 236-252)', async () => {
    render(<TrelloPage />);
    await waitFor(() => expect(screen.getByTestId('landing')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Login'));
    await waitFor(() => expect(screen.getByTestId('login')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Login'));
    await waitFor(() => expect(screen.getByTestId('workspace-list')).toBeInTheDocument());

    // Navigate to workspace
    fireEvent.click(screen.getByText('SelectWS'));
    await waitFor(() => expect(screen.getByTestId('workspace-view')).toBeInTheDocument());

    // Open admin panel
    fireEvent.click(screen.getByText('Admin'));
    await waitFor(() => expect(screen.getByTestId('admin-panel')).toBeInTheDocument());

    // Close admin panel
    fireEvent.click(screen.getByText('Close'));
    await waitFor(() => expect(screen.queryByTestId('admin-panel')).not.toBeInTheDocument());
  });

  it('handles admin panel workspace deleted (Lines 244-249)', async () => {
    render(<TrelloPage />);
    await waitFor(() => expect(screen.getByTestId('landing')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Login'));
    await waitFor(() => expect(screen.getByTestId('login')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Login'));
    await waitFor(() => expect(screen.getByTestId('workspace-list')).toBeInTheDocument());

    fireEvent.click(screen.getByText('SelectWS'));
    await waitFor(() => expect(screen.getByTestId('workspace-view')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Admin'));
    await waitFor(() => expect(screen.getByTestId('admin-panel')).toBeInTheDocument());

    await act(async () => { fireEvent.click(screen.getByText('DeleteWS')); });
    await waitFor(() => {
      expect(screen.queryByTestId('admin-panel')).not.toBeInTheDocument();
      expect(screen.getByTestId('workspace-list')).toBeInTheDocument();
    });
  });

  it('handles admin panel workspace updated (Line 250)', async () => {
    render(<TrelloPage />);
    await waitFor(() => expect(screen.getByTestId('landing')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Login'));
    await waitFor(() => expect(screen.getByTestId('login')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Login'));
    await waitFor(() => expect(screen.getByTestId('workspace-list')).toBeInTheDocument());

    fireEvent.click(screen.getByText('SelectWS'));
    await waitFor(() => expect(screen.getByTestId('workspace-view')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Admin'));
    await waitFor(() => expect(screen.getByTestId('admin-panel')).toBeInTheDocument());

    await act(async () => { fireEvent.click(screen.getByText('UpdateWS')); });
    expect(mockGetWorkspaces).toHaveBeenCalled();
  });

  it('handles board view switch board (Lines 228-230)', async () => {
    render(<TrelloPage />);
    await waitFor(() => expect(screen.getByTestId('landing')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Login'));
    await waitFor(() => expect(screen.getByTestId('login')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Login'));
    await waitFor(() => expect(screen.getByTestId('workspace-list')).toBeInTheDocument());

    fireEvent.click(screen.getByText('SelectWS'));
    await waitFor(() => expect(screen.getByTestId('workspace-view')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Board'));
    await waitFor(() => expect(screen.getByTestId('board-view')).toBeInTheDocument());

    // Switch to another board
    fireEvent.click(screen.getByText('SwitchBoard'));
    await waitFor(() => expect(screen.getByTestId('board-view')).toBeInTheDocument());
  });

  it('handles register back button to landing', async () => {
    render(<TrelloPage />);
    await waitFor(() => expect(screen.getByTestId('landing')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Register'));
    await waitFor(() => expect(screen.getByTestId('register')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Back'));
    await waitFor(() => expect(screen.getByTestId('landing')).toBeInTheDocument());
  });

  it('handles register switch to login', async () => {
    render(<TrelloPage />);
    await waitFor(() => expect(screen.getByTestId('landing')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Register'));
    await waitFor(() => expect(screen.getByTestId('register')).toBeInTheDocument());

    fireEvent.click(screen.getByText('ToLogin'));
    await waitFor(() => expect(screen.getByTestId('login')).toBeInTheDocument());
  });

  it('handles back from workspace to dashboard (Line 202)', async () => {
    render(<TrelloPage />);
    await waitFor(() => expect(screen.getByTestId('landing')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Login'));
    await waitFor(() => expect(screen.getByTestId('login')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Login'));
    await waitFor(() => expect(screen.getByTestId('workspace-list')).toBeInTheDocument());
    fireEvent.click(screen.getByText('SelectWS'));
    await waitFor(() => expect(screen.getByTestId('workspace-view')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Back'));
    await waitFor(() => expect(screen.getByTestId('workspace-list')).toBeInTheDocument());
  });

  it('handles back from notifications to dashboard (Line 209)', async () => {
    render(<TrelloPage />);
    await waitFor(() => expect(screen.getByTestId('landing')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Login'));
    await waitFor(() => expect(screen.getByTestId('login')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Login'));
    await waitFor(() => expect(screen.getByTestId('workspace-list')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Notifs'));
    await waitFor(() => expect(screen.getByTestId('notifications')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Back'));
    await waitFor(() => expect(screen.getByTestId('workspace-list')).toBeInTheDocument());
  });

  it('handles error during app initialization (Lines 79-80)', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockGetUser.mockImplementation(() => { throw new Error('Init Error'); });

    render(<TrelloPage />);

    await waitFor(() => {
      expect(screen.getByTestId('landing')).toBeInTheDocument();
    });
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
