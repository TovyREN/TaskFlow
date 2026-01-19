import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { userDb } from '@/db/db-helpers';
import type { ApiError } from '@/types/auth';

export const runtime = 'nodejs';

function getTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return request.cookies.get('sb-access-token')?.value ?? null;
}

// Mettre à jour le profil utilisateur
export async function PUT(request: NextRequest) {
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
    
    const body = await request.json();
    const { name, avatar, bio, contactInfo } = body;
    
    // Validation des données
    const updateData: {
      name?: string | null;
      avatar?: string | null;
      bio?: string | null;
      contactInfo?: string | null;
    } = {};
    
    if (name !== undefined) {
      if (name !== null && typeof name !== 'string') {
        return NextResponse.json<ApiError>(
          { error: 'Le nom doit être une chaîne de caractères' },
          { status: 400 }
        );
      }
      updateData.name = name;
    }
    
    if (avatar !== undefined) {
      if (avatar !== null && typeof avatar !== 'string') {
        return NextResponse.json<ApiError>(
          { error: 'L\'avatar doit être une URL valide' },
          { status: 400 }
        );
      }
      updateData.avatar = avatar;
    }
    
    if (bio !== undefined) {
      if (bio !== null && typeof bio !== 'string') {
        return NextResponse.json<ApiError>(
          { error: 'La bio doit être une chaîne de caractères' },
          { status: 400 }
        );
      }
      if (bio && bio.length > 500) {
        return NextResponse.json<ApiError>(
          { error: 'La bio ne peut pas dépasser 500 caractères' },
          { status: 400 }
        );
      }
      updateData.bio = bio;
    }
    
    if (contactInfo !== undefined) {
      if (contactInfo !== null && typeof contactInfo !== 'string') {
        return NextResponse.json<ApiError>(
          { error: 'Les informations de contact doivent être une chaîne de caractères' },
          { status: 400 }
        );
      }
      updateData.contactInfo = contactInfo;
    }
    
    // Mettre à jour le profil
    const updatedUser = userDb.update(user.id, updateData);
    
    if (!updatedUser) {
      return NextResponse.json<ApiError>(
        { error: 'Erreur lors de la mise à jour du profil' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      avatar: updatedUser.avatar,
      bio: updatedUser.bio,
      contactInfo: updatedUser.contactInfo,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json<ApiError>(
      { error: 'Une erreur est survenue' },
      { status: 500 }
    );
  }
}
