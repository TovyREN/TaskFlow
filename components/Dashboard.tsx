"use client";

import React from 'react';
import { User, Board } from '../types';
import UserSettings from './UserSettings';

interface DashboardProps {
  boards: Board[];
  onSelectBoard: (id: string) => void;
  onUpdateBoards: (boards: Board[]) => void;
  userId: string;
}

export default function Dashboard({ boards, onSelectBoard, onUpdateBoards, userId }: DashboardProps) {
  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Your Workspaces</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">
          Create New Board
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {boards.map((board) => (
          <div
            key={board.id}
            onClick={() => onSelectBoard(board.id)}
            className="h-32 rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-shadow p-4 flex flex-col justify-end"
            style={{ backgroundColor: board.color || '#3b82f6' }}
          >
            <h3 className="text-white font-bold text-lg">{board.title}</h3>
          </div>
        ))}
      </div>

      <div className="mt-12">
        <UserSettings />
      </div>
    </div>
  );
}