"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Bell, CheckCheck, UserPlus, Clock, ArrowLeft, Mail } from 'lucide-react';
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
} from '../app/actions/notificationActions';
import { useSocket } from './SocketProvider';
import { AppNotification } from '../types';

interface NotificationsViewProps {
  userId: string;
  onBack: () => void;
  onNavigateToBoard: (boardId: string, workspaceId: string) => void;
  onRespondToInvitation: (invitationId: string, accept: boolean) => Promise<void>;
}

function timeAgo(dateStr: string | Date): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "A l'instant";
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays < 7) return `Il y a ${diffDays}j`;
  return date.toLocaleDateString('fr-FR');
}

export default function NotificationsView({ userId, onBack, onNavigateToBoard, onRespondToInvitation }: NotificationsViewProps) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingIds, setRespondingIds] = useState<Set<string>>(new Set());
  const { on, off, isConnected } = useSocket();

  const loadNotifications = async () => {
    setLoading(true);
    const data = await getNotifications(userId);
    setNotifications(data as AppNotification[]);
    setLoading(false);
  };

  useEffect(() => {
    loadNotifications();
  }, [userId]);

  const handleNewNotification = useCallback((notification: AppNotification) => {
    setNotifications(prev => [notification, ...prev]);
  }, []);

  useEffect(() => {
    if (!isConnected) return;

    on('notification:new', handleNewNotification);
    return () => {
      off('notification:new', handleNewNotification);
    };
  }, [isConnected, on, off, handleNewNotification]);

  const handleMarkAsRead = async (id: string) => {
    await markNotificationAsRead(id, userId);
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, isRead: true } : n)
    );
  };

  const handleMarkAllAsRead = async () => {
    await markAllNotificationsAsRead(userId);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const handleNotificationClick = (notification: AppNotification) => {
    if (notification.type === 'WORKSPACE_INVITATION') return;
    if (!notification.isRead) {
      handleMarkAsRead(notification.id);
    }
    const board = notification.task?.list?.board;
    if (board) {
      onNavigateToBoard(board.id, board.workspaceId);
    }
  };

  const handleInvitationResponse = async (notification: AppNotification, accept: boolean) => {
    if (!notification.workspaceInvitationId) return;
    setRespondingIds(prev => new Set(prev).add(notification.id));
    try {
      await onRespondToInvitation(notification.workspaceInvitationId, accept);
      await handleMarkAsRead(notification.id);
      setNotifications(prev =>
        prev.map(n => n.id === notification.id
          ? {
              ...n,
              isRead: true,
              workspaceInvitation: n.workspaceInvitation
                ? { ...n.workspaceInvitation, status: accept ? 'ACCEPTED' : 'DECLINED' }
                : n.workspaceInvitation
            }
          : n
        )
      );
    } finally {
      setRespondingIds(prev => {
        const next = new Set(prev);
        next.delete(notification.id);
        return next;
      });
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'TASK_ASSIGNED':
        return <UserPlus className="w-5 h-5 text-blue-500" />;
      case 'DUE_DATE_APPROACHING':
        return <Clock className="w-5 h-5 text-orange-500" />;
      case 'WORKSPACE_INVITATION':
        return <Mail className="w-5 h-5 text-purple-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const isInvitationPending = (notification: AppNotification) =>
    notification.type === 'WORKSPACE_INVITATION' &&
    notification.workspaceInvitation?.status === 'PENDING';

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-2xl font-bold text-gray-800">Notifications</h1>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            <CheckCheck className="w-4 h-4" />
            Tout marquer comme lu
          </button>
        )}
      </div>

      {/* Notification List */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">
          Chargement des notifications...
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-12">
          <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Aucune notification</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(notification => (
            <div
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={`flex items-start gap-3 p-4 rounded-lg border transition-colors ${
                notification.type === 'WORKSPACE_INVITATION' ? '' : 'cursor-pointer'
              } ${
                notification.isRead
                  ? 'bg-white border-gray-200 hover:bg-gray-50'
                  : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
              }`}
            >
              <div className="flex-shrink-0 mt-0.5">
                {getIcon(notification.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${notification.isRead ? 'text-gray-600' : 'text-gray-800 font-medium'}`}>
                  {notification.message}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-400">
                    {timeAgo(notification.createdAt)}
                  </span>
                  {notification.actor && (
                    <span className="text-xs text-gray-400">
                      par {notification.actor.name || notification.actor.email}
                    </span>
                  )}
                </div>
                {/* Accept/Decline buttons for pending invitations */}
                {isInvitationPending(notification) && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleInvitationResponse(notification, true);
                      }}
                      disabled={respondingIds.has(notification.id)}
                      className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      Accepter
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleInvitationResponse(notification, false);
                      }}
                      disabled={respondingIds.has(notification.id)}
                      className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                    >
                      Refuser
                    </button>
                  </div>
                )}
                {/* Show status for already responded invitations */}
                {notification.type === 'WORKSPACE_INVITATION' &&
                  notification.workspaceInvitation?.status === 'ACCEPTED' && (
                  <span className="inline-block mt-2 text-xs text-green-600 font-medium">Acceptee</span>
                )}
                {notification.type === 'WORKSPACE_INVITATION' &&
                  notification.workspaceInvitation?.status === 'DECLINED' && (
                  <span className="inline-block mt-2 text-xs text-red-500 font-medium">Refusee</span>
                )}
              </div>
              {!notification.isRead && (
                <div className="flex-shrink-0">
                  <div className="w-2.5 h-2.5 bg-blue-500 rounded-full"></div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
