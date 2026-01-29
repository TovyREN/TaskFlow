import React, { useState } from 'react';
import { User } from '../types';
import { storageService } from '../services/storageService';
import { X, Save, RefreshCw } from 'lucide-react';

interface UserSettingsProps {
  user: User;
  onClose: () => void;
  onUpdateUser: (updatedUser: User) => void;
}

const UserSettings: React.FC<UserSettingsProps> = ({ user, onClose, onUpdateUser }) => {
  const [name, setName] = useState(user.name);
  const [avatarUrl, setAvatarUrl] = useState(user.avatar);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      const updatedUser = { ...user, name, avatar: avatarUrl };
      storageService.updateUser(updatedUser);
      onUpdateUser(updatedUser);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }
  };

  const generateRandomAvatar = () => {
     const seed = Math.random().toString(36).substring(7);
     setAvatarUrl(`https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=random&color=fff&seed=${seed}`);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
           <h2 className="text-xl font-bold text-slate-800">Profile Settings</h2>
           <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
              <X className="w-5 h-5" />
           </button>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
           {/* Avatar Section */}
           <div className="flex flex-col items-center gap-4">
              <img src={avatarUrl} alt="Profile" className="w-24 h-24 rounded-full border-4 border-slate-100 shadow-md" />
              <div className="flex gap-2">
                 <button 
                   type="button" 
                   onClick={generateRandomAvatar}
                   className="px-3 py-1.5 text-xs font-medium bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100 flex items-center gap-1 transition-colors"
                 >
                    <RefreshCw className="w-3 h-3" /> Randomize
                 </button>
              </div>
           </div>

           {/* Fields */}
           <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Display Name</label>
              <input 
                type="text" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
           </div>

           <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Avatar URL</label>
              <input 
                type="text" 
                value={avatarUrl} 
                onChange={e => setAvatarUrl(e.target.value)} 
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="https://..."
              />
              <p className="text-xs text-slate-400 mt-1">Paste a direct image link or use the Randomize button.</p>
           </div>

           <div className="pt-2">
              <button 
                type="submit" 
                className={`w-full py-2.5 rounded-lg text-white font-medium flex items-center justify-center gap-2 transition-all ${isSaved ? 'bg-green-600 hover:bg-green-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
              >
                 {isSaved ? 'Saved Successfully!' : <><Save className="w-4 h-4" /> Save Changes</>}
              </button>
           </div>
        </form>
      </div>
    </div>
  );
};

export default UserSettings;