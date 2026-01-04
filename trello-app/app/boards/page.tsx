import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { BoardsList } from '@/components/board/boards-list';
import { CreateBoardButton } from '@/components/board/create-board-button';
import { LoadingSpinner } from '@/components/shared/loading';
import { getUserBoards } from '@/actions/board-actions';
import { verifyToken } from '@/lib/jwt';

export default async function BoardsPage() {
  // Vérifier l'authentification via les cookies
  const cookieStore = await cookies();
  const token = cookieStore.get('sb-access-token')?.value;
  
  if (!token) {
    redirect('/auth/login');
  }

  // Vérifier et décoder le token JWT
  const payload = verifyToken(token);
  if (!payload) {
    redirect('/auth/login');
  }
  
  const userId = payload.userId;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded bg-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">
                Mes Boards
              </h1>
            </div>
            <CreateBoardButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Suspense fallback={<LoadingSpinner />}>
          <BoardsContent userId={userId} />
        </Suspense>
      </main>
    </div>
  );
}

async function BoardsContent({ userId }: { userId: string }) {
  const boards = await getUserBoards(userId);

  return <BoardsList boards={boards} />;
}
