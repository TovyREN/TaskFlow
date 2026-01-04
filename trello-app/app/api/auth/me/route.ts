import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import type { ApiError } from '@/types/auth';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json<ApiError>(
        { error: 'Token manquant' },
        { status: 401 }
      );
    }
    
    const token = authHeader.substring(7);
    const user = getUserFromToken(token);
    
    if (!user) {
      return NextResponse.json<ApiError>(
        { error: 'Token invalide' },
        { status: 401 }
      );
    }
    
    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json<ApiError>(
      { error: 'Une erreur est survenue' },
      { status: 500 }
    );
  }
}
