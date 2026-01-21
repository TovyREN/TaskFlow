import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { boardMemberDb } from '@/db/board-member-db';
import type { ApiError } from '@/types/auth';

export const dynamic = "force-static";
export const runtime = 'nodejs';

function getTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return request.cookies.get('sb-access-token')?.value ?? null;
}

// Obtenir les invitations en attente de l'utilisateur
export async function GET(request: NextRequest) {
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

    const invitations = boardMemberDb.findPendingInvitations(user.id);

    return NextResponse.json({ invitations });
  } catch (error) {
    console.error('Get invitations error:', error);
    return NextResponse.json<ApiError>(
      { error: 'Une erreur est survenue' },
      { status: 500 }
    );
  }
}
