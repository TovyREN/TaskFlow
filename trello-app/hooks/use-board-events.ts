'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { BoardEvent } from '@/lib/realtime/event-emitter';

interface UseBoardEventsOptions {
  boardId: string;
  onEvent?: (event: BoardEvent) => void;
  enabled?: boolean;
}

export function useBoardEvents({ boardId, onEvent, enabled = true }: UseBoardEventsOptions) {
  const router = useRouter();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (!enabled || !boardId) return;

    // Fermer la connexion existante
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource(`/api/boards/${boardId}/events`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('[SSE] Connected to board events:', boardId);
      reconnectAttempts.current = 0;
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as BoardEvent | { type: 'connected' };

        if (data.type === 'connected') {
          console.log('[SSE] Connection confirmed');
          return;
        }

        console.log('[SSE] Event received:', data.type);

        // Appeler le callback personnalisé si fourni
        if (onEvent) {
          onEvent(data as BoardEvent);
        }

        // Rafraîchir la page pour les événements importants
        const refreshEvents = [
          'list-created', 'list-updated', 'list-deleted', 'list-moved',
          'card-created', 'card-updated', 'card-deleted', 'card-moved',
          'member-added', 'member-removed', 'member-role-changed',
          'board-updated', 'label-created', 'label-updated',
          'comment-added', 'checklist-updated', 'refresh'
        ];

        if (refreshEvents.includes(data.type)) {
          router.refresh();
        }

        // Rediriger si le board est supprimé
        if (data.type === 'board-deleted') {
          router.push('/boards');
        }
      } catch (error) {
        console.error('[SSE] Error parsing event:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('[SSE] Connection error:', error);
      eventSource.close();

      // Tentative de reconnexion avec backoff exponentiel
      if (reconnectAttempts.current < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
        console.log(`[SSE] Reconnecting in ${delay}ms...`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttempts.current++;
          connect();
        }, delay);
      } else {
        console.log('[SSE] Max reconnection attempts reached');
      }
    };
  }, [boardId, enabled, onEvent, router]);

  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [connect]);

  // Méthode pour forcer une reconnexion
  const reconnect = useCallback(() => {
    reconnectAttempts.current = 0;
    connect();
  }, [connect]);

  return { reconnect };
}
