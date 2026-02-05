"use client";

import React, { useEffect, useState } from 'react';
import { getBoardDetails, createList } from '../app/actions/boardActions';
import { Plus, Loader2 } from 'lucide-react';
import { TaskList as TaskListType, Task } from '../types';

interface BoardViewProps {
  boardId: string;
  onBack: () => void;
}

// Helper type since Prisma structure might differ slightly from types.ts
type DBBoard = {
  id: string;
  title: string;
  lists: (TaskListType & { tasks: Task[] })[];
};

export default function BoardView({ boardId, onBack }: BoardViewProps) {
  const [board, setBoard] = useState<DBBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddingList, setIsAddingList] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');

  // Fetch Board Data on Mount
  useEffect(() => {
    const loadData = async () => {
      const data = await getBoardDetails(boardId);
      if (data) {
        // Cast the DB response to our UI types for now
        setBoard(data as unknown as DBBoard);
      }
      setLoading(false);
    };
    loadData();
  }, [boardId]);

  const handleAddList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListTitle.trim() || !board) return;

    const result = await createList(board.id, newListTitle);
    if (result.success && result.list) {
      // Optimistic update
      setBoard({
        ...board,
        lists: [...board.lists, result.list as unknown as (TaskListType & { tasks: Task[] })]
      });
      setNewListTitle('');
      setIsAddingList(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-blue-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!board) {
    return <div className="p-8 text-center">Board not found. <button onClick={onBack} className="text-blue-600 underline">Go back</button></div>;
  }

  return (
    <div className="h-full flex flex-col bg-blue-50">
      {/* Header */}
      <div className="p-4 flex items-center gap-4 bg-white/50 backdrop-blur-md border-b shrink-0">
        <button 
          onClick={onBack}
          className="text-slate-600 hover:text-slate-900 font-medium px-3 py-1 hover:bg-black/5 rounded transition-colors"
        >
          ← Back
        </button>
        <h2 className="text-xl font-bold text-slate-800">{board.title}</h2>
      </div>
      
      {/* Horizontal Scroll Area */}
      <div className="flex-1 p-6 flex gap-6 overflow-x-auto items-start">
        
        {/* Render Real Lists */}
        {board.lists.map((list) => (
          <div key={list.id} className="w-72 bg-slate-100 rounded-xl p-3 shrink-0 flex flex-col gap-2 shadow-sm border border-slate-200">
            <h4 className="font-semibold px-2 text-slate-700">{list.title}</h4>
            
            {/* Empty Tasks Area (We haven't implemented Task creation UI yet) */}
            <div className="min-h-[20px]">
                {list.tasks.length === 0 && <p className="text-xs text-slate-400 text-center py-2">No tasks yet</p>}
                {list.tasks.map(task => (
                    <div key={task.id} className="bg-white p-2 mb-2 rounded shadow-sm text-sm">{task.title}</div>
                ))}
            </div>
            
            <button className="text-slate-500 hover:bg-slate-200 p-2 rounded text-left text-sm flex items-center gap-1 transition-colors">
              <Plus className="w-4 h-4" /> Add a card
            </button>
          </div>
        ))}

        {/* Add New List Button/Form */}
        <div className="w-72 shrink-0">
          {isAddingList ? (
            <form onSubmit={handleAddList} className="bg-slate-100 p-3 rounded-xl shadow-sm border border-slate-200 animate-fade-in">
              <input 
                autoFocus
                placeholder="Enter list title..."
                className="w-full p-2 mb-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                value={newListTitle}
                onChange={e => setNewListTitle(e.target.value)}
              />
              <div className="flex gap-2">
                <button type="submit" className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-blue-700">Add List</button>
                <button type="button" onClick={() => setIsAddingList(false)} className="text-slate-600 hover:bg-slate-200 px-3 py-1.5 rounded text-sm">Cancel</button>
              </div>
            </form>
          ) : (
            <button 
              onClick={() => setIsAddingList(true)}
              className="w-full bg-white/40 hover:bg-white/60 p-3 rounded-xl text-slate-700 font-medium transition-colors flex items-center gap-2 border border-transparent hover:border-white/50"
            >
              <Plus className="w-5 h-5" /> Add another list
            </button>
          )}
        </div>

      </div>
    </div>
  );
}