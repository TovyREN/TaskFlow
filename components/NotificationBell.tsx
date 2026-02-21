"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Bell } from 'lucide-react';
import { getUnreadNotificationCount } from '../app/actions/notificationActions';
import { useSocket } from './SocketProvider';

interface NotificationBellProps {
  userId: string;
  onClick: () => void;
}

export default function NotificationBell({ userId, onClick }: NotificationBellProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const { on, off, isConnected } = useSocket();

  const refetchCount = useCallback(() => {
    getUnreadNotificationCount(userId).then(setUnreadCount);
  }, [userId]);

  useEffect(() => {
    refetchCount();
  }, [refetchCount]);

  const handleNewNotification = useCallback(() => {
    setUnreadCount(prev => prev + 1);
  }, []);

  useEffect(() => {
    if (!isConnected) return;

    on('notification:new', handleNewNotification);
    return () => {
      off('notification:new', handleNewNotification);
    };
  }, [isConnected, on, off, handleNewNotification]);

  const handleClick = () => {
    setUnreadCount(0);
    onClick();
  };

  return (
    <button
      onClick={handleClick}
      className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
      title="Notifications"
    >
      <Bell className="w-5 h-5 text-gray-600" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}
