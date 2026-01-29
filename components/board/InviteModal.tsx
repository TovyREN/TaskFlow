import React, { useState } from 'react';
import { Role } from '../../types';
import { User, Shield, Eye, Edit3 } from 'lucide-react';

interface InviteModalProps {
  onInvite: (email: string, role: Role) => void;
  onClose: () => void;
}

const InviteModal: React.FC<InviteModalProps> = ({ onInvite, onClose }) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('MEMBER');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      onInvite(email, role);
      onClose();
    }
  };

  const roles: { value: Role; label: string; icon: React.ReactNode; desc: string }[] = [
    { value: 'ADMIN', label: 'Admin', icon: <Shield className="w-4 h-4" />, desc: 'Can edit board settings and manage members.' },
    { value: 'MEMBER', label: 'Member', icon: <Edit3 className="w-4 h-4" />, desc: 'Can create and edit content.' },
    { value: 'VIEWER', label: 'Viewer', icon: <Eye className="w-4 h-4" />, desc: 'Can only view the board.' },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-xl font-bold text-slate-800">Invite to Board</h3>
          <p className="text-slate-500 text-sm mt-1">Share this board with your team.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
             <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
             <input 
                type="email" 
                placeholder="colleague@example.com" 
                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 bg-white"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoFocus
                required
             />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Permission Level</label>
            <div className="space-y-3">
              {roles.map((r) => (
                <div 
                  key={r.value}
                  onClick={() => setRole(r.value)}
                  className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer border transition-all ${
                    role === r.value 
                      ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' 
                      : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                  }`}
                >
                  <div className={`mt-0.5 ${role === r.value ? 'text-indigo-600' : 'text-slate-500'}`}>
                    {r.icon}
                  </div>
                  <div>
                    <div className={`text-sm font-semibold ${role === r.value ? 'text-indigo-900' : 'text-slate-700'}`}>
                      {r.label}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">{r.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-sm transition-colors"
            >
              Send Invitation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InviteModal;