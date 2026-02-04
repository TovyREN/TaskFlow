"use client";

import React from 'react';
import { Board } from '../types';

interface SidebarProps {
  boards: Board[];
  onSelectBoard: (id: string) => void;
  onGoDashboard: () => void;
  activeBoardId?: string;
}

export default function Sidebar({ boards, onSelectBoard, onGoDashboard, activeBoardId }: SidebarProps) {
  return (
    <aside className="w-64 bg-gray-900 text-gray-300 flex flex-col h-full border-r border-gray-800">
      <div className="p-4 border-b border-gray-800 flex items-center gap-3 cursor-pointer hover:bg-gray-800 transition-colors" onClick={onGoDashboard}>
        <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center text-white font-bold">T</div>
        <span className="font-bold text-white text-lg">TaskFlow</span>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        <div className="px-4 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Your Boards
        </div>
        <ul className="space-y-1">
          {boards.map((board) => (
            <li key={board.id}>
              <button
                onClick={() => onSelectBoard(board.id)}
                className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-medium transition-colors ${
                  activeBoardId === board.id 
                    ? 'bg-blue-600 text-white' 
                    : 'hover:bg-gray-800 hover:text-white'
                }`}
              >
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: board.color || '#3b82f6' }} 
                />
                <span className="truncate">{board.title}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t border-gray-800">
        <button 
          onClick={onGoDashboard}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-gray-800 hover:bg-gray-700 rounded text-sm font-medium transition-colors"
        >
          <span>🏠 Dashboard</span>
        </button>
      </div>
    </aside>
  );
}
