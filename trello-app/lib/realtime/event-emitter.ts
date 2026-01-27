// Simple event emitter pour les mises à jour en temps réel
type Listener = (data: BoardEvent) => void;

export interface BoardEvent {
  type: 'list-created' | 'list-updated' | 'list-deleted' | 'list-moved' |
        'card-created' | 'card-updated' | 'card-deleted' | 'card-moved' |
        'member-added' | 'member-removed' | 'member-role-changed' |
        'board-updated' | 'board-deleted' | 'label-created' | 'label-updated' |
        'comment-added' | 'checklist-updated' | 'refresh';
  boardId: string;
  userId: string; // L'utilisateur qui a fait l'action
  payload?: any;
  timestamp: number;
}

class BoardEventEmitter {
  private listeners: Map<string, Set<Listener>> = new Map();

  subscribe(boardId: string, listener: Listener): () => void {
    if (!this.listeners.has(boardId)) {
      this.listeners.set(boardId, new Set());
    }
    this.listeners.get(boardId)!.add(listener);
    
    console.log(`[EventEmitter] Subscribed to board ${boardId}. Total subscribers: ${this.listeners.get(boardId)!.size}`);

    // Retourne une fonction pour se désabonner
    return () => {
      const boardListeners = this.listeners.get(boardId);
      if (boardListeners) {
        boardListeners.delete(listener);
        console.log(`[EventEmitter] Unsubscribed from board ${boardId}. Remaining: ${boardListeners.size}`);
        if (boardListeners.size === 0) {
          this.listeners.delete(boardId);
        }
      }
    };
  }

  emit(event: BoardEvent): void {
    console.log(`[EventEmitter] Emitting ${event.type} for board ${event.boardId}`);
    const boardListeners = this.listeners.get(event.boardId);
    if (boardListeners) {
      console.log(`[EventEmitter] Found ${boardListeners.size} listeners`);
      boardListeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error('Error in board event listener:', error);
        }
      });
    } else {
      console.log(`[EventEmitter] No listeners for board ${event.boardId}`);
    }
  }

  getSubscriberCount(boardId: string): number {
    return this.listeners.get(boardId)?.size || 0;
  }
}

// Singleton global utilisant globalThis pour s'assurer qu'il y a une seule instance
// même si le module est importé depuis différents bundles (Server Actions vs API Routes)
declare global {
  // eslint-disable-next-line no-var
  var __boardEventEmitter: BoardEventEmitter | undefined;
}

export const boardEventEmitter = globalThis.__boardEventEmitter ?? new BoardEventEmitter();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__boardEventEmitter = boardEventEmitter;
}
