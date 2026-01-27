import { NextRequest } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { boardMemberDb } from '@/db/board-member-db';
import { boardDb } from '@/db/board-db';
import { boardEventEmitter, type BoardEvent } from '@/lib/realtime/event-emitter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return request.cookies.get('sb-access-token')?.value ?? null;
}

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ boardId: string }> }
) {
  const token = getTokenFromRequest(request);
  if (!token) {
    return new Response('Unauthorized', { status: 401 });
  }

  const user = getUserFromToken(token);
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const params = await props.params;
  const { boardId } = params;

  // Vérifier l'accès au board
  const board = boardDb.findById(boardId);
  if (!board) {
    return new Response('Board not found', { status: 404 });
  }

  const isOwner = board.owner_id === user.id;
  const isMember = boardMemberDb.isMember(boardId, user.id);

  if (!isOwner && !isMember) {
    return new Response('Forbidden', { status: 403 });
  }

  // Créer le stream SSE
  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let heartbeatInterval: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // Envoyer un événement de connexion
      const connectEvent = `data: ${JSON.stringify({ type: 'connected', boardId, userId: user.id })}\n\n`;
      controller.enqueue(encoder.encode(connectEvent));

      // Heartbeat toutes les 30 secondes pour garder la connexion ouverte
      heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch {
          // Stream fermé
        }
      }, 30000);

      // S'abonner aux événements du board
      unsubscribe = boardEventEmitter.subscribe(boardId, (event: BoardEvent) => {
        // Ne pas envoyer l'événement à l'utilisateur qui l'a déclenché
        if (event.userId === user.id) {
          return;
        }

        try {
          const sseData = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(sseData));
        } catch {
          // Stream fermé
        }
      });
    },
    cancel() {
      if (unsubscribe) {
        unsubscribe();
      }
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}
