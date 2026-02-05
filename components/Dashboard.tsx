"use client";

import React, { useState } from 'react';
import { Board } from '../types';
import UserSettings from './UserSettings';
import { createBoard } from '../app/actions/boardActions';
import { Plus, X, Layout } from 'lucide-react';

interface DashboardProps {
  boards: Board[];
  onSelectBoard: (id: string) => void;
  onUpdateBoards: (boards: Board[]) => void;
  userId: string;
}

export default function Dashboard({ boards, onSelectBoard, onUpdateBoards, userId }: DashboardProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [isPending, setIsPending] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    
    setIsPending(true);
    // Call the server action to create the board in the DB
    const result = await createBoard(newTitle, userId);
    
    if (result.success && result.board) {
      // Update local state by adding the new board to the list
      // We assume the returned board matches the Board type enough for the UI
      onUpdateBoards([result.board as unknown as Board, ...boards]);
      setNewTitle('');
      setIsCreating(false);
    } else {
      alert('Failed to create board');
    }
    setIsPending(false);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
             <Layout className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Your Workspaces</h1>
        </div>
        <button 
          onClick={() => setIsCreating(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 font-medium shadow-sm hover:shadow-md"
        >
          <Plus className="w-5 h-5" />
          Create New Board
        </button>
      </div>

      {/* Create Board Modal Overlay */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm animate-scale-in" onClick={() => setIsCreating(false)}>
          <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-slate-800">Create Board</h3>
              <button onClick={() => setIsCreating(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="mb-4">
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Board Title</label>
                <input 
                  autoFocus
                  className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 placeholder:text-slate-400 transition-all"
                  placeholder="e.g. Marketing Launch 2024"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  disabled={isPending}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                  disabled={isPending}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:bg-indigo-400 disabled:cursor-not-allowed shadow-sm transition-all"
                  disabled={isPending}
                >
                  {isPending ? 'Creating...' : 'Create Board'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Board Cards */}
        {boards.map((board) => (
          <div
            key={board.id}
            onClick={() => onSelectBoard(board.id)}
            className={`h-32 rounded-xl shadow-sm cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all p-5 flex flex-col justify-between group relative overflow-hidden ${board.color || 'bg-blue-600'}`}
          >
             <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-60" />
             <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors" />

            <h3 className="text-white font-bold text-xl relative z-10 drop-shadow-sm">{board.title}</h3>
            <div className="relative z-10 flex justify-between items-end">
              <span className="text-white/90 text-xs font-medium bg-black/20 px-2 py-1 rounded backdrop-blur-sm">
                Board
              </span>
            </div>
          </div>
        ))}

        {/* Empty State / Add Button */}
        {boards.length === 0 && !isCreating && (
          <button 
            onClick={() => setIsCreating(true)}
            className="h-32 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-500 hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all group"
          >
            <Plus className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" />
            <span className="font-medium">Create your first board</span>
          </button>
        )}
      </div>

      <div className="mt-16 border-t border-slate-200 pt-8">
        <UserSettings />
      </div>
    </div>
  );
}