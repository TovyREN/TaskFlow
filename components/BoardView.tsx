"use client";

import React from 'react';

interface BoardViewProps {
  boardId: string;
  onBack: () => void;
}

export default function BoardView({ boardId, onBack }: BoardViewProps) {
  return (
    <div className="h-full flex flex-col bg-blue-50">
      <div className="p-4 flex items-center gap-4 bg-white/50 backdrop-blur-md border-b">
        <button 
          onClick={onBack}
          className="text-gray-600 hover:text-gray-900 font-medium"
        >
          ← Back to Dashboard
        </button>
        <h2 className="text-xl font-bold">Board ID: {boardId}</h2>
      </div>
      
      <div className="flex-1 p-6 flex gap-6 overflow-x-auto">
        <div className="w-72 bg-gray-100/80 rounded-lg p-3 h-fit flex flex-col gap-2">
          <h4 className="font-semibold px-2 mb-2">To Do</h4>
          <div className="bg-white p-3 rounded shadow-sm text-sm">Create Prisma Schema</div>
          <div className="bg-white p-3 rounded shadow-sm text-sm">Dockerize Application</div>
          <button className="text-gray-500 text-sm p-2 hover:bg-gray-200 rounded text-left mt-2">
            + Add a card
          </button>
        </div>

        <button className="w-72 bg-gray-200/50 hover:bg-gray-200/80 rounded-lg h-fit p-3 text-gray-700 font-medium transition-colors">
          + Add another list
        </button>
      </div>
    </div>
  );
}