import React from 'react';
import { ArrowLeft, UserPlus } from 'lucide-react';
import { Board, User } from '../../types';

interface BoardHeaderProps {
  board: Board;
  allUsers: User[];
  onBack: () => void;
  onUpdateTitle: (newTitle: string) => void;
  onInvite: () => void;
}

const BoardHeader: React.FC<BoardHeaderProps> = ({ board, allUsers, onBack, onUpdateTitle, onInvite }) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const [titleInput, setTitleInput] = React.useState(board.title);

  const saveTitle = () => {
    if (titleInput.trim() !== board.title) {
      onUpdateTitle(titleInput);
    }
    setIsEditing(false);
  };

  return (
    <div className="h-14 bg-black/20 flex items-center justify-between px-4 text-white backdrop-blur-sm shrink-0">
      <div className="flex items-center gap-4">
        <button 
          onClick={onBack}
          className="p-1.5 hover:bg-white/20 rounded transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        
        {isEditing ? (
          <input
            autoFocus
            className="bg-white text-slate-900 px-2 py-1 rounded font-bold outline-none border-2 border-indigo-500"
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => e.key === 'Enter' && saveTitle()}
          />
        ) : (
          <h1 
            onClick={() => setIsEditing(true)}
            className="text-xl font-bold px-2 py-1 rounded hover:bg-white/20 cursor-pointer transition-colors"
          >
            {board.title}
          </h1>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        <div className="flex -space-x-2">
          {allUsers.slice(0, 5).map(u => (
            <img 
              key={u.id} 
              src={u.avatar} 
              alt={u.name} 
              className="w-8 h-8 rounded-full border-2 border-white/20" 
              title={u.name} 
            />
          ))}
        </div>
        <button 
          onClick={onInvite}
          className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-1"
        >
          <UserPlus className="w-4 h-4" /> Share
        </button>
      </div>
    </div>
  );
};

export default BoardHeader;