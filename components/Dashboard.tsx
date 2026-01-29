import React, { useState, useEffect } from 'react';
import { Board, User } from '../types';
import { storageService } from '../services/storageService';
import { Plus, LayoutGrid, LogOut, Settings } from 'lucide-react';
import UserSettings from './UserSettings';

interface DashboardProps {
  user: User;
  onLogout: () => void;
  onSelectBoard: (board: Board) => void;
}

const AVAILABLE_COLORS = [
  'bg-blue-600', 'bg-emerald-600', 'bg-indigo-600', 'bg-rose-600', 'bg-amber-600', 'bg-slate-700', 'bg-violet-600'
];

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout, onSelectBoard }) => {
  const [boards, setBoards] = useState<Board[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [newBoardColor, setNewBoardColor] = useState(AVAILABLE_COLORS[0]);
  
  // Settings Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(user);

  useEffect(() => {
    setBoards(storageService.getBoards());
  }, []);

  const handleCreateBoard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoardTitle.trim()) return;

    const newBoard = storageService.createBoard(newBoardTitle, newBoardColor);

    setBoards([...boards, newBoard]);
    setIsModalOpen(false);
    setNewBoardTitle('');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-8 h-8 text-indigo-600" />
          <h1 className="text-xl font-bold text-slate-800">TaskFlow</h1>
        </div>
        <div className="flex items-center gap-4">
           <button 
             onClick={() => setIsSettingsOpen(true)}
             className="flex items-center gap-2 hover:bg-slate-100 p-1 pr-3 rounded-full transition-colors group"
           >
              <img src={currentUser.avatar} alt={currentUser.name} className="w-8 h-8 rounded-full border border-slate-200" />
              <span className="text-sm font-medium text-slate-700 hidden sm:block group-hover:text-indigo-600">{currentUser.name}</span>
           </button>
           <button 
             onClick={onLogout}
             className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
             title="Logout"
           >
             <LogOut className="w-5 h-5" />
           </button>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-slate-800">Your Boards</h2>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            <span>Create Board</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {boards.map(board => (
            <div 
              key={board.id}
              onClick={() => onSelectBoard(board)}
              className={`${board.color} h-32 rounded-lg p-4 shadow-md hover:shadow-xl transition-all cursor-pointer transform hover:-translate-y-1 relative group`}
            >
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 rounded-lg transition-all" />
              <h3 className="text-white font-bold text-lg truncate pr-2 relative z-10">{board.title}</h3>
              <div className="absolute bottom-4 right-4 text-white/80 text-xs font-medium">
                {board.members?.length || 1} Member{board.members?.length !== 1 ? 's' : ''}
              </div>
            </div>
          ))}

          {/* Create New Placeholder */}
          <button 
            onClick={() => setIsModalOpen(true)}
            className="h-32 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-500 hover:border-indigo-400 hover:text-indigo-500 hover:bg-indigo-50 transition-all group"
          >
            <Plus className="w-8 h-8 mb-1 text-slate-400 group-hover:text-indigo-500 transition-colors" />
            <span className="font-medium">Create new board</span>
          </button>
        </div>
      </main>

      {/* Create Board Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 m-4">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Create Board</h3>
            <form onSubmit={handleCreateBoard}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">Board Title</label>
                <input 
                  type="text" 
                  autoFocus
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={newBoardTitle}
                  onChange={(e) => setNewBoardTitle(e.target.value)}
                  placeholder="e.g. Q4 Roadmap"
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">Background Color</label>
                <div className="flex gap-2 flex-wrap">
                  {AVAILABLE_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      className={`w-8 h-8 rounded-full ${color} ${newBoardColor === color ? 'ring-2 ring-offset-2 ring-slate-800' : ''}`}
                      onClick={() => setNewBoardColor(color)}
                    />
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Settings Modal */}
      {isSettingsOpen && (
        <UserSettings 
          user={currentUser} 
          onClose={() => setIsSettingsOpen(false)} 
          onUpdateUser={setCurrentUser}
        />
      )}
    </div>
  );
};

export default Dashboard;