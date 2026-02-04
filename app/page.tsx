"use client";

import React, { useState, useEffect } from 'react';
import { User, Board, ViewState } from '../types';
import { storageService } from '../services/storageService';
import { getBoards } from './actions/boardActions';
import Login from '../components/Login';
import Register from '../components/Register';
import Dashboard from '../components/Dashboard';
import BoardView from '../components/BoardView';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import LandingPage from '../components/LandingPage';

export default function TrelloPage() {
  const [user, setUser] = useState<User | null>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  
  // Start on LANDING by default
  const [viewState, setViewState] = useState<ViewState>({ type: 'LANDING' });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initApp = async () => {
      try {
        const currentUser = storageService.getUser();
        
        if (currentUser) {
          setUser(currentUser);
          const dbBoards = await getBoards(currentUser.id);
          setBoards(dbBoards as unknown as Board[]);
          setViewState({ type: 'DASHBOARD' });
        } else {
          setViewState({ type: 'LANDING' });
        }
      } catch (error) {
        console.error("Failed to initialize app:", error);
      } finally {
        setIsLoading(false);
      }
    };
    initApp();
  }, []);

  const handleLogin = async (loggedUser: User) => {
    setUser(loggedUser);
    localStorage.setItem('taskflow_user', JSON.stringify(loggedUser));

    const dbBoards = await getBoards(loggedUser.id);
    setBoards(dbBoards as unknown as Board[]);
    
    setViewState({ type: 'DASHBOARD' });
  };

  const handleLogout = () => {
    storageService.logout();
    setUser(null);
    setBoards([]);
    setViewState({ type: 'LANDING' });
  };

  const handleSelectBoard = (boardId: string) => {
    setViewState({ type: 'BOARD', boardId });
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
      />
    );
  }

  // 3. Login View
  if (!user || viewState.type === 'LOGIN') {
    return <Login onLogin={handleLogin} />;
  }

  // 4. Authenticated Views
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar 
        boards={boards} 
        onSelectBoard={handleSelectBoard}
        onGoDashboard={() => setViewState({ type: 'DASHBOARD' })}
        activeBoardId={viewState.type === 'BOARD' ? viewState.boardId : undefined}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header user={user} onLogout={handleLogout} />
        <main className="flex-1 overflow-y-auto relative">
          {viewState.type === 'DASHBOARD' ? (
            <Dashboard 
              boards={boards} 
              onSelectBoard={handleSelectBoard}
              onUpdateBoards={setBoards}
              userId={user.id}
            />
          ) : viewState.type === 'BOARD' ? (
            <BoardView 
              boardId={viewState.boardId}
              onBack={() => setViewState({ type: 'DASHBOARD' })}
            />
          ) : null}
        </main>
      </div>
    </div>
  );
}