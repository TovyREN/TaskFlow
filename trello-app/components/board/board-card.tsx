'use client';

import { useState } from 'react';
import { Board } from '@/types/board';
import { cn } from '@/lib/utils/cn';

interface BoardCardProps {
  board: Board;
}

export function BoardCard({ board }: BoardCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={cn(
        'group relative h-32 overflow-hidden rounded-lg transition-all duration-200',
        'cursor-pointer border-2 border-transparent',
        'hover:border-blue-600 hover:shadow-xl'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: board.background || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      {/* Overlay */}
      <div
        className={cn(
          'absolute inset-0 bg-black/20 transition-opacity',
          isHovered ? 'opacity-30' : 'opacity-0'
        )}
      />

      {/* Content */}
      <div className="relative flex h-full flex-col justify-between p-4">
        <div>
          <h3 className="text-lg font-semibold text-white line-clamp-2">
            {board.name}
          </h3>
          {board.description && (
            <p className="mt-1 text-sm text-white/80 line-clamp-1">
              {board.description}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {/* Star indicator if board is favorite */}
            <svg
              className="h-4 w-4 text-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>

          {board.visibility && (
            <span className="text-xs text-white/70 capitalize">
              {board.visibility}
            </span>
          )}
        </div>
      </div>

      {/* Hover indicator */}
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 h-1 bg-blue-600 transition-transform',
          isHovered ? 'translate-y-0' : 'translate-y-full'
        )}
      />
    </div>
  );
}
