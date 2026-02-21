"use client";

import React, { useState, useEffect } from 'react';
import { User, Workspace, ViewState } from '../types';
import { storageService } from '../services/storageService';
import { getWorkspaces, createWorkspace, respondToInvitation } from './actions/workspaceActions';
import Login from '../components/Login';
import Register from '../components/Register';
import WorkspaceList from '../components/WorkspaceList';
import WorkspaceView from '../components/WorkspaceView';
import WorkspaceAdminPanel from '../components/WorkspaceAdminPanel';
import BoardView from '../components/BoardView';
import Header from '../components/Header';
import LandingPage from '../components/LandingPage';
import NotificationsView from '../components/NotificationsView';
import { SocketProvider } from '../components/SocketProvider';
import { checkDueDateNotifications } from './actions/notificationActions';

export default function TrelloPage() {
  const [user, setUser] = useState<User | null>(null);
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  
  // Start on LANDING by default
  const [viewState, setViewState] = useState<ViewState>({ type: 'LANDING' });
  const [isLoading, setIsLoading] = useState(true);

  // Admin panel state
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminWorkspaceId, setAdminWorkspaceId] = useState<string | null>(null);

  // Save viewState to sessionStorage when it changes
  useEffect(() => {
    if (!isLoading && viewState.type !== 'LANDING') {
      sessionStorage.setItem('taskflow_viewState', JSON.stringify(viewState));
    }
  }, [viewState, isLoading]);

  useEffect(() => {
    const initApp = async () => {
      try {
        const currentUser = storageService.getUser();

        if (currentUser) {
          setUser(currentUser);
          const dbWorkspaces = await getWorkspaces(currentUser.id);
          setWorkspaces(dbWorkspaces);
          checkDueDateNotifications(currentUser.id);

          // Restore previous viewState if exists
          const savedViewState = sessionStorage.getItem('taskflow_viewState');
          if (savedViewState) {
            try {
              const parsedViewState = JSON.parse(savedViewState);
              setViewState(parsedViewState);
            } catch {
              setViewState({ type: 'DASHBOARD' });
            }
          } else {
            setViewState({ type: 'DASHBOARD' });
          }
        } else {
          // Restore viewState for non-authenticated pages (LOGIN, REGISTER)
          const savedViewState = sessionStorage.getItem('taskflow_viewState');
          if (savedViewState) {
            try {
              const parsedViewState = JSON.parse(savedViewState);
              if (parsedViewState.type === 'LOGIN' || parsedViewState.type === 'REGISTER') {
                setViewState(parsedViewState);
              } else {
                setViewState({ type: 'LANDING' });
              }
            } catch {
              setViewState({ type: 'LANDING' });
            }
          } else {
            setViewState({ type: 'LANDING' });
          }
        }
      } catch (error) {
        console.error("Failed to initialize app:", error);
      } finally {
        setIsLoading(false);
      }
    };
    initApp();
  }, []);

  const refreshWorkspaces = async () => {
    if (!user) return;
    const dbWorkspaces = await getWorkspaces(user.id);
    setWorkspaces(dbWorkspaces);
  };

  const handleLogin = async (loggedUser: User) => {
    setUser(loggedUser);
    localStorage.setItem('taskflow_user', JSON.stringify(loggedUser));

    const dbWorkspaces = await getWorkspaces(loggedUser.id);
    setWorkspaces(dbWorkspaces);
    checkDueDateNotifications(loggedUser.id);

    setViewState({ type: 'DASHBOARD' });
  };

  const handleLogout = () => {
    storageService.logout();
    sessionStorage.removeItem('taskflow_viewState'); // Clear saved view state
    setUser(null);
    setWorkspaces([]);
    setViewState({ type: 'LANDING' });
  };

  const handleSelectWorkspace = (workspaceId: string) => {
    setViewState({ type: 'WORKSPACE', workspaceId });
  };

  const handleSelectBoard = (boardId: string, workspaceId: string) => {
    setViewState({ type: 'BOARD', boardId, workspaceId });
  };

  const handleCreateWorkspace = async (name: string, description?: string, color?: string) => {
    if (!user) return;
    const result = await createWorkspace(name, user.id, description, color);
    if (result.success && result.workspace) {
      setWorkspaces(prev => [result.workspace, ...prev]);
    }
  };

  const handleRespondToInvitation = async (invitationId: string, accept: boolean) => {
    if (!user) return;
    const result = await respondToInvitation(invitationId, user.id, accept);
    if (result.success) {
      await refreshWorkspaces();
    }
  };

  const handleOpenAdmin = (workspaceId: string) => {
    setAdminWorkspaceId(workspaceId);
    setShowAdminPanel(true);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="text-xl font-semibold text-gray-600">Loading TaskFlow...</div>
      </div>
    );
  }

  // 1. Landing Page View
  if (!user && viewState.type === 'LANDING') {
    return (
      <LandingPage 
        onLoginClick={() => setViewState({ type: 'LOGIN' })} 
        onRegisterClick={() => setViewState({ type: 'REGISTER' })}
      />
    );
  }

  // 2. Register View
  if (!user && viewState.type === 'REGISTER') {
    return (
      <Register
        onSwitchToLogin={() => setViewState({ type: 'LOGIN' })}
        onRegisterSuccess={handleLogin}
        onBack={() => setViewState({ type: 'LANDING' })}
      />
    );
  }

  // 3. Login View
  if (!user || viewState.type === 'LOGIN') {
    return (
      <Login
        onLogin={handleLogin}
        onBack={() => setViewState({ type: 'LANDING' })}
      />
    );
  }

  // 4. Authenticated Views
  return (
    <SocketProvider userId={user.id}>
      <div className="flex h-screen bg-gray-50 overflow-hidden flex-col">
        <Header
          user={user}
          onLogout={handleLogout}
          onLogoClick={() => setViewState({ type: 'DASHBOARD' })}
          onNotificationsClick={() => setViewState({ type: 'NOTIFICATIONS' })}
        />
        <main className="flex-1 overflow-y-auto relative">
          {viewState.type === 'DASHBOARD' ? (
            <WorkspaceList
              workspaces={workspaces}
              onSelectWorkspace={handleSelectWorkspace}
              onCreateWorkspace={handleCreateWorkspace}
            />
          ) : viewState.type === 'WORKSPACE' ? (
            <WorkspaceView 
              workspaceId={viewState.workspaceId}
              userId={user.id}
              onBack={() => setViewState({ type: 'DASHBOARD' })}
              onSelectBoard={handleSelectBoard}
              onOpenAdmin={() => handleOpenAdmin(viewState.workspaceId)}
            />
          ) : viewState.type === 'NOTIFICATIONS' ? (
            <NotificationsView
              userId={user.id}
              onBack={() => setViewState({ type: 'DASHBOARD' })}
              onNavigateToBoard={(boardId, workspaceId) => {
                setViewState({ type: 'BOARD', boardId, workspaceId });
              }}
              onRespondToInvitation={async (invitationId, accept) => {
                await handleRespondToInvitation(invitationId, accept);
              }}
            />
          ) : viewState.type === 'BOARD' ? (
            <BoardView
              boardId={viewState.boardId}
              workspaceId={viewState.workspaceId}
              userId={user.id}
              isAdmin={(() => {
                const workspace = workspaces.find((w: any) => w.id === viewState.workspaceId);
                const member = workspace?.members?.find((m: any) => m.userId === user.id);
                return member?.role === 'ADMIN' || member?.role === 'OWNER';
              })()}
              onBack={() => setViewState({ type: 'WORKSPACE', workspaceId: viewState.workspaceId })}
              onSwitchBoard={(newBoardId) => {
                setViewState({ type: 'BOARD', boardId: newBoardId, workspaceId: viewState.workspaceId });
              }}
            />
          ) : null}
        </main>

        {/* Admin Panel Modal */}
        {showAdminPanel && adminWorkspaceId && (
          <WorkspaceAdminPanel
            workspaceId={adminWorkspaceId}
            userId={user.id}
            onClose={() => {
              setShowAdminPanel(false);
              setAdminWorkspaceId(null);
            }}
            onWorkspaceDeleted={() => {
              setShowAdminPanel(false);
              setAdminWorkspaceId(null);
              setViewState({ type: 'DASHBOARD' });
              refreshWorkspaces();
            }}
            onWorkspaceUpdated={refreshWorkspaces}
          />
        )}
      </div>
    </SocketProvider>
  );
}