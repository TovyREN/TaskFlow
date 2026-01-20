import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { boardMemberDb } from '@/db/board-member-db';
import { boardDb } from '@/db/board-db';
import { getDatabaseDebugInfo } from '@/db/database';
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

// Obtenir tous les membres d'un board
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ boardId: string }> }
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
    const { boardId } = params;

    // Debug: log avant recherche
    if (process.env.NODE_ENV === 'development') {
      console.log('[GET /members] Searching for boardId:', boardId);
      console.log('[GET /members] User:', user.id);
    }

    const board = boardDb.findById(boardId);
    
    // Debug: log résultat
    if (process.env.NODE_ENV === 'development') {
      console.log('[GET /members] Board found:', board ? `Yes (owner: ${board.owner_id})` : 'No');
    }
    
    if (!board) {
      const debug = process.env.NODE_ENV === 'development' ? { boardId, ...getDatabaseDebugInfo() } : undefined;
      return NextResponse.json<ApiError & { debug?: unknown }>({ error: `Board introuvable (${boardId})`, debug }, { status: 404 });
    }

    const isOwner = board.owner_id === user.id;

    // Backfill: s'assurer que le owner existe dans board_members (pour les anciennes DB)
    if (isOwner && !boardMemberDb.isMember(boardId, user.id)) {
      try {
        boardMemberDb.addMember(boardId, user.id, 'owner', 'accepted');
      } catch {
        // ignore
      }
    }

    // Vérifier que l'utilisateur a accès au board
    const isMember = boardMemberDb.isMember(boardId, user.id);
    if (!isMember && !isOwner) {
      return NextResponse.json<ApiError>(
        { error: 'Accès non autorisé à ce board' },
        { status: 403 }
      );
    }

    const members = boardMemberDb.findMembersByBoardId(boardId);

    return NextResponse.json({ members });
  } catch (error) {
    console.error('Get board members error:', error);
    return NextResponse.json<ApiError>(
      { error: 'Une erreur est survenue' },
      { status: 500 }
    );
  }
}

// Inviter un membre au board
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ boardId: string }> }
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
    const { boardId } = params;

    // Debug: log avant recherche
    if (process.env.NODE_ENV === 'development') {
      console.log('[POST /members] Searching for boardId:', boardId);
      console.log('[POST /members] DB info:', getDatabaseDebugInfo());
    }

    const board = boardDb.findById(boardId);
    
    // Debug: log résultat
    if (process.env.NODE_ENV === 'development') {
      console.log('[POST /members] Board found:', board ? `Yes (owner: ${board.owner_id})` : 'No');
    }
    
    if (!board) {
      const debug = process.env.NODE_ENV === 'development' ? { boardId, ...getDatabaseDebugInfo() } : undefined;
      return NextResponse.json<ApiError & { debug?: unknown }>({ error: `Board introuvable (${boardId})`, debug }, { status: 404 });
    }

    const isOwner = board.owner_id === user.id;

    // Backfill owner membership
    if (isOwner && !boardMemberDb.isMember(boardId, user.id)) {
      try {
        boardMemberDb.addMember(boardId, user.id, 'owner');
      } catch {
        // ignore
      }
    }

    // Vérifier que l'utilisateur est owner ou admin du board
    const memberRole = isOwner ? 'owner' : boardMemberDb.getMemberRole(boardId, user.id);
    if (!memberRole || (memberRole !== 'owner' && memberRole !== 'admin')) {
      return NextResponse.json<ApiError>(
        { error: 'Vous devez être propriétaire ou administrateur pour inviter des membres' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, role = 'member' } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json<ApiError>(
        { error: 'Email requis' },
        { status: 400 }
      );
    }

    if (!['owner', 'admin', 'member'].includes(role)) {
      return NextResponse.json<ApiError>(
        { error: 'Rôle invalide' },
        { status: 400 }
      );
    }

    // Trouver l'utilisateur par email
    const invitedUser = userDb.findByEmailPublic(email);
    if (!invitedUser) {
      return NextResponse.json<ApiError>(
        { error: 'Aucun utilisateur trouvé avec cet email' },
        { status: 404 }
      );
    }

    // Vérifier si l'utilisateur est déjà membre
    const isAlreadyMember = boardMemberDb.isMember(boardId, invitedUser.id);
    if (isAlreadyMember) {
      return NextResponse.json<ApiError>(
        { error: 'Cet utilisateur est déjà membre du board' },
        { status: 400 }
      );
    }

    // Ajouter le membre avec statut 'pending'
    boardMemberDb.addMember(boardId, invitedUser.id, role, 'pending');

    return NextResponse.json({ 
      message: 'Invitation envoyée avec succès'
    }, { status: 201 });
  } catch (error) {
    console.error('Add board member error:', error);
    return NextResponse.json<ApiError>(
      { error: 'Une erreur est survenue' },
      { status: 500 }
    );
  }
}

// Modifier le rôle d'un membre du board
export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ boardId: string }> }
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
    const { boardId } = params;

    const board = boardDb.findById(boardId);
    if (!board) {
      const debug = process.env.NODE_ENV === 'development' ? { boardId, ...getDatabaseDebugInfo() } : undefined;
      return NextResponse.json<ApiError & { debug?: unknown }>({ error: `Board introuvable (${boardId})`, debug }, { status: 404 });
    }

    const isOwner = board.owner_id === user.id;

    // Backfill owner membership
    if (isOwner && !boardMemberDb.isMember(boardId, user.id)) {
      try {
        boardMemberDb.addMember(boardId, user.id, 'owner', 'accepted');
      } catch {
        // ignore
      }
    }

    // Vérifier que l'utilisateur est owner ou admin du board
    const memberRole = isOwner ? 'owner' : boardMemberDb.getMemberRole(boardId, user.id);
    if (!memberRole || (memberRole !== 'owner' && memberRole !== 'admin')) {
      return NextResponse.json<ApiError>(
        { error: 'Vous devez être propriétaire ou administrateur pour modifier les rôles' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId, role } = body;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json<ApiError>(
        { error: 'ID utilisateur requis' },
        { status: 400 }
      );
    }

    if (!role || !['owner', 'admin', 'member'].includes(role)) {
      return NextResponse.json<ApiError>(
        { error: 'Rôle invalide' },
        { status: 400 }
      );
    }

    // Vérifier que le membre à modifier existe
    const targetCurrentRole = boardMemberDb.getMemberRole(boardId, userId);
    if (!targetCurrentRole) {
      return NextResponse.json<ApiError>(
        { error: 'Ce membre n\'appartient pas au board' },
        { status: 404 }
      );
    }

    // Empêcher de modifier le rôle d'un owner si on n'est pas owner soi-même
    if (targetCurrentRole === 'owner' && memberRole !== 'owner') {
      return NextResponse.json<ApiError>(
        { error: 'Vous ne pouvez pas modifier le rôle du propriétaire du board' },
        { status: 403 }
      );
    }

    // Empêcher un admin de promouvoir quelqu'un owner
    if (role === 'owner' && memberRole !== 'owner') {
      return NextResponse.json<ApiError>(
        { error: 'Seul le propriétaire peut promouvoir quelqu\'un au rôle de propriétaire' },
        { status: 403 }
      );
    }

    // Modifier le rôle
    boardMemberDb.updateMemberRole(boardId, userId, role);

    return NextResponse.json({ 
      message: 'Rôle modifié avec succès',
      role
    });
  } catch (error) {
    console.error('Update member role error:', error);
    return NextResponse.json<ApiError>(
      { error: 'Une erreur est survenue' },
      { status: 500 }
    );
  }
}

// Supprimer un membre du board
export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ boardId: string }> }
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
    const { boardId } = params;

    const board = boardDb.findById(boardId);
    if (!board) {
      const debug = process.env.NODE_ENV === 'development' ? { boardId, ...getDatabaseDebugInfo() } : undefined;
      return NextResponse.json<ApiError & { debug?: unknown }>({ error: `Board introuvable (${boardId})`, debug }, { status: 404 });
    }

    const isOwner = board.owner_id === user.id;

    // Backfill owner membership
    if (isOwner && !boardMemberDb.isMember(boardId, user.id)) {
      try {
        boardMemberDb.addMember(boardId, user.id, 'owner');
      } catch {
        // ignore
      }
    }

    const { searchParams } = new URL(request.url);
    const userIdToRemove = searchParams.get('userId');

    if (!userIdToRemove) {
      return NextResponse.json<ApiError>(
        { error: 'ID utilisateur requis' },
        { status: 400 }
      );
    }

    // Vérifier que l'utilisateur est owner ou admin du board
    const memberRole = isOwner ? 'owner' : boardMemberDb.getMemberRole(boardId, user.id);
    if (!memberRole || (memberRole !== 'owner' && memberRole !== 'admin')) {
      return NextResponse.json<ApiError>(
        { error: 'Vous devez être propriétaire ou administrateur pour retirer des membres' },
        { status: 403 }
      );
    }

    // Vérifier que le membre à retirer existe
    const targetRole = boardMemberDb.getMemberRole(boardId, userIdToRemove);
    if (!targetRole) {
      return NextResponse.json<ApiError>(
        { error: 'Ce membre n\'appartient pas au board' },
        { status: 404 }
      );
    }

    // Empêcher de retirer un owner si on n'est pas owner soi-même
    if (targetRole === 'owner' && memberRole !== 'owner') {
      return NextResponse.json<ApiError>(
        { error: 'Vous ne pouvez pas retirer le propriétaire du board' },
        { status: 403 }
      );
    }

    // Retirer le membre
    boardMemberDb.removeMember(boardId, userIdToRemove);

    return NextResponse.json({ 
      message: 'Membre retiré avec succès'
    });
  } catch (error) {
    console.error('Remove board member error:', error);
    return NextResponse.json<ApiError>(
      { error: 'Une erreur est survenue' },
      { status: 500 }
    );
  }
}
