import { NextRequest, NextResponse } from 'next/server';
import { sessionDb } from '@/db/db-helpers';

export const runtime = 'nodejs';

function getTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return request.cookies.get('sb-access-token')?.value ?? null;
}

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);

    if (token) {
      // Supprimer la session côté DB (best-effort)
      try {
        sessionDb.deleteByToken(token);
      } catch {
        // ignore
      }
    }

    const response = NextResponse.json({ ok: true });

    // Clear cookie
    response.cookies.set('sb-access-token', '', {
      httpOnly: true,
      secure: request.nextUrl.protocol === 'https:',
      sameSite: 'lax',
      expires: new Date(0),
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Logout error:', error);

    // Always try to clear cookie
    const response = NextResponse.json({ ok: true });
    response.cookies.set('sb-access-token', '', {
      httpOnly: true,
      secure: request.nextUrl.protocol === 'https:',
      sameSite: 'lax',
      expires: new Date(0),
      path: '/',
    });

    return response;
  }
}
