import React, { useState, useEffect } from 'react';
import { User, Board, ViewState } from './types';
import { storageService } from './services/storageService';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import BoardView from './components/BoardView';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<ViewState>('LOGIN');
  const [currentBoard, setCurrentBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // Check for existing session
    const existingUser = storageService.getUser();
    if (existingUser) {
      setUser(existingUser);
      setView('DASHBOARD');
    }
    setLoading(false);
  }, []);

  const handleLogin = (email: string, password: string) => {
    try {
      setAuthError(null);
      const loggedInUser = storageService.login(email, password);
      setUser(loggedInUser);
      setView('DASHBOARD');
    } catch (err: any) {
      setAuthError(err.message);
    }
  };

  const handleRegister = (name: string, email: string, password: string) => {
    try {
      setAuthError(null);
      const newUser = storageService.register(name, email, password);
      setUser(newUser);
      setView('DASHBOARD');
    } catch (err: any) {
      setAuthError(err.message);
    }
  };

  const handleLogout = () => {
    storageService.logout();
    setUser(null);
    setCurrentBoard(null);
    setView('LOGIN');
    setAuthError(null);
  };

  const handleSelectBoard = (board: Board) => {
    setCurrentBoard(board);
    setView('BOARD');
  };

  const handleBackToDashboard = () => {
    setCurrentBoard(null);
    setView('DASHBOARD');
  };

  if (loading) return null;

  return (
    <>
      {view === 'LOGIN' && (
        <Login 
          onLogin={handleLogin} 
          onSwitchToRegister={() => { setView('REGISTER'); setAuthError(null); }}
          error={authError}
        />
      )}

      {view === 'REGISTER' && (
        <Register 
          onRegister={handleRegister} 
          onSwitchToLogin={() => { setView('LOGIN'); setAuthError(null); }}
          error={authError}
        />
      )}
      
      {view === 'DASHBOARD' && user && (
        <Dashboard 
          user={user} 
          onLogout={handleLogout} 
          onSelectBoard={handleSelectBoard} 
        />
      )}
      
      {view === 'BOARD' && currentBoard && user && (
        <BoardView 
          board={currentBoard} 
          currentUser={user}
          onBack={handleBackToDashboard}
          onUpdateBoard={setCurrentBoard}
        />
      )}
    </>
  );
}

export default App;