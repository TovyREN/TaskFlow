'use client';

import Link from 'next/link';
import { Board } from '@/types/board';
import { BoardCard } from './board-card';

interface BoardsListProps {
  boards: Board[];
}

export function BoardsList({ boards }: BoardsListProps) {
  if (boards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="rounded-full bg-blue-100 p-6 mb-4">
          <svg
            className="h-12 w-12 text-blue-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Aucun board pour le moment
        </h2>
        <p className="text-gray-600 mb-6">
          Créez votre premier board pour commencer à organiser vos projets
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Vos boards ({boards.length})
        </h2>
      </div>
      
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {boards.map((board) => (
          <Link key={board.id} href={`/boards/${board.id}`}>
            <BoardCard board={board} />
          </Link>
        ))}
      </div>
    </div>
  );
}
