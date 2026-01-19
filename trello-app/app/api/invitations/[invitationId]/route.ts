import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { boardMemberDb } from '@/db/board-member-db';
import type { ApiError } from '@/types/auth';

export const runtime = 'nodejs';

function getTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return request.cookies.get('sb-access-token')?.value ?? null;
}

// Accepter une invitation
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ invitationId: string }> }
) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json<ApiError>({ error: 'Non authentifié' }, { status: 401 });
    }

    const user = getUserFromToken(token);
    
    if (!user) {
      return NextResponse.json<ApiError>(
        { error: 'Session invalide' },
        { status: 401 }
      );
    }

    const params = await props.params;
    const { invitationId } = params;

    const body = await request.json();
    const { action } = body; // 'accept' ou 'reject'

    if (action === 'accept') {
      const success = boardMemberDb.acceptInvitation(invitationId, user.id);
      if (!success) {
        return NextResponse.json<ApiError>(
          { error: 'Invitation introuvable ou déjà traitée' },
          { status: 404 }
        );
      }
      return NextResponse.json({ message: 'Invitation acceptée' });
    } else if (action === 'reject') {
      const success = boardMemberDb.rejectInvitation(invitationId, user.id);
      if (!success) {
        return NextResponse.json<ApiError>(
          { error: 'Invitation introuvable ou déjà traitée' },
          { status: 404 }
        );
      }
      return NextResponse.json({ message: 'Invitation refusée' });
    } else {
      return NextResponse.json<ApiError>(
        { error: 'Action invalide' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Handle invitation error:', error);
    return NextResponse.json<ApiError>(
      { error: 'Une erreur est survenue' },
      { status: 500 }
    );
  }
}
