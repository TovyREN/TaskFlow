"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  // Join/leave rooms
  joinWorkspace: (workspaceId: string) => void;
  leaveWorkspace: (workspaceId: string) => void;
  joinBoard: (boardId: string) => void;
  leaveBoard: (boardId: string) => void;
  // Event subscription
  on: (event: string, callback: (data: any) => void) => void;
  off: (event: string, callback: (data: any) => void) => void;
}

const SocketContext = createContext<SocketContextType | null>(null);

interface SocketProviderProps {
  children: React.ReactNode;
  userId: string | null;
}

export function SocketProvider({ children, userId }: SocketProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!userId) {
      // Disconnect if user logs out
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Connect to socket server
    const socketInstance = io({
      path: '/socket.io',
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socketInstance;
    setSocket(socketInstance);

    socketInstance.on('connect', () => {
      console.log('Socket connected:', socketInstance.id);
      setIsConnected(true);
      // Authenticate with user ID
      socketInstance.emit('authenticate', userId);
      // Join user-specific room for direct notifications
      socketInstance.emit('join-user', userId);
    });

    socketInstance.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    return () => {
      socketInstance.disconnect();
      socketRef.current = null;
    };
  }, [userId]);

  const joinWorkspace = useCallback((workspaceId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('join-workspace', workspaceId);
    }
  }, []);

  const leaveWorkspace = useCallback((workspaceId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('leave-workspace', workspaceId);
    }
  }, []);

  const joinBoard = useCallback((boardId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('join-board', boardId);
    }
  }, []);

  const leaveBoard = useCallback((boardId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('leave-board', boardId);
    }
  }, []);

  const on = useCallback((event: string, callback: (data: any) => void) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
    }
  }, []);

  const off = useCallback((event: string, callback: (data: any) => void) => {
    if (socketRef.current) {
      socketRef.current.off(event, callback);
    }
  }, []);

  return (
    <SocketContext.Provider value={{
      socket,
      isConnected,
      joinWorkspace,
      leaveWorkspace,
      joinBoard,
      leaveBoard,
      on,
      off,
    }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}

// Hook for subscribing to socket events with auto-cleanup
export function useSocketEvent(event: string, callback: (data: any) => void, deps: any[] = []) {
  const { on, off } = useSocket();

  useEffect(() => {
    on(event, callback);
    return () => {
      off(event, callback);
    };
  }, [event, on, off, ...deps]);
}
