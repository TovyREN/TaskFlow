import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { getBoard } from '@/actions/board-actions';
import { getBoardLists, getListCards } from '@/actions/list-actions';
import { verifyToken } from '@/lib/jwt';
import { boardMemberDb } from '@/db/board-member-db';
import { BoardContent } from '@/components/board/board-content';
import { BoardMenu } from '@/components/board/board-menu';
import { UserMenu } from '@/components/shared/user-menu';
import { RealtimeProvider } from '@/components/shared/realtime-provider';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface BoardPageProps {
  params: Promise<{
    boardId: string;
  }>;
}

export default async function BoardPage({ params }: BoardPageProps) {
  const { boardId } = await params;

  // Vérifier l'authentification
  const cookieStore = await cookies();
  const token = cookieStore.get('sb-access-token')?.value;
  
  if (!token) {
    redirect('/auth/login');
  }

  const payload = verifyToken(token);
  if (!payload) {
    redirect('/auth/login');
  }

  const userId = payload.userId;

  // Récupérer le board
  const board = await getBoard(boardId);
  
  if (!board) {
    redirect('/boards');
  }

  // Déterminer le rôle de l'utilisateur
  let userRole: 'owner' | 'admin' | 'member' | 'readonly' = 'member';
  if (board.owner_id === userId) {
    userRole = 'owner';
  } else {
    const role = boardMemberDb.getMemberRole(boardId, userId);
    if (role) {
      userRole = role;
    }
  }

  const canEdit = userRole !== 'readonly';

  // Récupérer les listes du board
  const lists = await getBoardLists(boardId);

  // Récupérer les cartes pour chaque liste
  const listsWithCards = await Promise.all(
    lists.map(async (list) => {
      const cards = await getListCards(list.id);
      return { list, cards };
    })
  );

  return (
    <RealtimeProvider boardId={boardId}>
      <div 
        className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700"
        style={
          board.background
            ? { background: board.background }
            : undefined
        }
      >
        {/* Header */}
        <header className="bg-black/20 backdrop-blur-sm border-b border-white/10">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link 
                  href="/boards"
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </Link>
                <h1 className="text-2xl font-bold text-white">{board.name}</h1>
              </div>
              
              <div className="flex items-center gap-3">
                <BoardMenu boardId={boardId} currentUserId={userId} userRole={userRole} />
                <UserMenu />
              </div>
            </div>
            
            {board.description && (
              <p className="mt-2 text-white/80 text-sm">{board.description}</p>
            )}
          </div>
        </header>

        {/* Board Content */}
        <BoardContent boardId={boardId} listsWithCards={listsWithCards} canEdit={canEdit} />
      </div>
    </RealtimeProvider>
  );
}
