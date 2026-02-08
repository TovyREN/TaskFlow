"use client";

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface BoardTabsProps {
  boards: Array<{ id: string; title: string; color?: string }>;
  currentBoardId: string;
  onBoardSelect: (boardId: string) => void;
}

export default function BoardTabs({ boards, currentBoardId, onBoardSelect }: BoardTabsProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 200;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  if (boards.length <= 1) return null; // Hide if single board

  return (
    <div className="flex items-center gap-2 border-b border-slate-200">
      {/* Scroll Left Button */}
      <button
        onClick={() => scroll('left')}
        className="p-1 hover:bg-slate-100 rounded shrink-0"
        aria-label="Scroll left"
      >
        <ChevronLeft className="w-4 h-4 text-slate-600" />
      </button>

      {/* Tabs Container */}
      <div
        ref={scrollRef}
        className="flex-1 flex gap-1 overflow-x-auto scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {boards.map(board => {
          const isActive = board.id === currentBoardId;
          return (
            <button
              key={board.id}
              onClick={() => !isActive && onBoardSelect(board.id)}
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap rounded-t transition-colors ${
                isActive
                  ? 'text-slate-900 bg-white border-b-2'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
              style={isActive ? { borderBottomColor: board.color || '#3b82f6' } : {}}
            >
              {board.title.length > 20 ? board.title.substring(0, 20) + '...' : board.title}
            </button>
          );
        })}
      </div>

      {/* Scroll Right Button */}
      <button
        onClick={() => scroll('right')}
        className="p-1 hover:bg-slate-100 rounded shrink-0"
        aria-label="Scroll right"
      >
        <ChevronRight className="w-4 h-4 text-slate-600" />
      </button>
    </div>
  );
}
