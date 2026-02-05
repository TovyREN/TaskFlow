// Socket event emitter for server-side use (in Server Actions)
// This file is used to emit real-time updates to connected clients

type EventType = 
  // Workspace events
  | 'workspace:updated'
  | 'workspace:deleted'
  | 'workspace:member-added'
  | 'workspace:member-removed'
  | 'workspace:member-role-changed'
  | 'workspace:invitation-created'
  | 'workspace:invitation-cancelled'
  // Board events
  | 'board:created'
  | 'board:updated'
  | 'board:deleted'
  | 'board:settings-changed'
  | 'board:label-created'
  | 'board:label-updated'
  | 'board:label-deleted'
  // List events
  | 'list:created'
  | 'list:updated'
  | 'list:deleted'
  | 'list:reordered'
  // Task events
  | 'task:created'
  | 'task:updated'
  | 'task:deleted'
  | 'task:moved'
  | 'task:reordered'
  | 'task:assignee-added'
  | 'task:assignee-removed'
  | 'task:label-added'
  | 'task:label-removed'
  | 'task:comment-added'
  | 'task:comment-deleted'
  | 'task:checklist-created'
  | 'task:checklist-deleted'
  | 'task:checklist-item-added'
  | 'task:checklist-item-updated'
  | 'task:checklist-item-deleted';

interface EmitOptions {
  // Room to emit to (workspace:id or board:id)
  room: string;
  // Event type
  event: EventType;
  // Data payload
  data: any;
  // Optional: exclude a specific socket (e.g., the one that triggered the action)
  excludeUserId?: string;
}

declare global {
  var io: any;
}

export function emitSocketEvent({ room, event, data, excludeUserId }: EmitOptions) {
  const io = global.io;
  
  if (!io) {
    console.warn('Socket.io not initialized - running in build mode or socket server not started');
    return;
  }

  try {
    if (excludeUserId) {
      // Emit to all in room except the user who triggered the action
      io.to(room).except(`user:${excludeUserId}`).emit(event, data);
    } else {
      // Emit to all in room
      io.to(room).emit(event, data);
    }
    console.log(`Emitted ${event} to ${room}`, data);
  } catch (error) {
    console.error('Error emitting socket event:', error);
  }
}

// Convenience functions for common patterns

export function emitToWorkspace(workspaceId: string, event: EventType, data: any, excludeUserId?: string) {
  emitSocketEvent({
    room: `workspace:${workspaceId}`,
    event,
    data,
    excludeUserId
  });
}

export function emitToBoard(boardId: string, event: EventType, data: any, excludeUserId?: string) {
  emitSocketEvent({
    room: `board:${boardId}`,
    event,
    data,
    excludeUserId
  });
}
