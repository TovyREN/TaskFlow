"use client";

import React, { useState } from 'react';
import { Plus, X, Users, Grid, Crown, Shield, Eye, MoreVertical, Trash2, Settings, Mail, UserPlus, ChevronRight } from 'lucide-react';
import { MemberRole } from '../types';

interface WorkspaceListProps {
  workspaces: any[];
  onSelectWorkspace: (id: string) => void;
  onCreateWorkspace: (name: string, description?: string, color?: string) => Promise<void>;
  pendingInvitations: any[];
  onRespondToInvitation: (invitationId: string, accept: boolean) => Promise<void>;
}

const WORKSPACE_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#6366f1'
];

export default function WorkspaceList({ 
  workspaces, 
  onSelectWorkspace, 
  onCreateWorkspace,
  pendingInvitations,
  onRespondToInvitation
}: WorkspaceListProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState(WORKSPACE_COLORS[0]);
  const [isPending, setIsPending] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    
    setIsPending(true);
    await onCreateWorkspace(newName, newDescription, selectedColor);
    setNewName('');
    setNewDescription('');
    setSelectedColor(WORKSPACE_COLORS[0]);
    setIsCreating(false);
    setIsPending(false);
  };

  const getRoleIcon = (role: MemberRole) => {
    switch (role) {
      case 'ADMIN': return <Crown className="w-3 h-3 text-yellow-500" />;
      case 'MEMBER': return <Shield className="w-3 h-3 text-blue-500" />;
      case 'VIEWER': return <Eye className="w-3 h-3 text-gray-500" />;
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto animate-fade-in">
      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Pending Invitations
          </h2>
          <div className="space-y-3">
            {pendingInvitations.map((invitation) => (
              <div 
                key={invitation.id}
                className="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-between shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: invitation.workspace.color || '#3b82f6' }}
                  >
                    {invitation.workspace.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">{invitation.workspace.name}</p>
                    <p className="text-sm text-slate-500">
                      Invited by {invitation.inviter.name || invitation.inviter.email} as {invitation.role.toLowerCase()}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onRespondToInvitation(invitation.id, false)}
                    className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Decline
                  </button>
                  <button
                    onClick={() => onRespondToInvitation(invitation.id, true)}
                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Accept
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
            <Users className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Your Workspaces</h1>
        </div>
        <button 
          onClick={() => setIsCreating(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 font-medium shadow-sm hover:shadow-md"
        >
          <Plus className="w-5 h-5" />
          New Workspace
        </button>
      </div>

      {/* Create Workspace Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm animate-scale-in" onClick={() => setIsCreating(false)}>
          <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-slate-800">Create Workspace</h3>
              <button onClick={() => setIsCreating(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="mb-4">
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Workspace Name</label>
                <input 
                  autoFocus
                  className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 placeholder:text-slate-400 transition-all"
                  placeholder="e.g. Marketing Team"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  disabled={isPending}
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Description (optional)</label>
                <textarea 
                  className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 placeholder:text-slate-400 transition-all resize-none"
                  placeholder="What's this workspace for?"
                  rows={3}
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  disabled={isPending}
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {WORKSPACE_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      className={`w-8 h-8 rounded-full transition-all ${
                        selectedColor === color ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
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
                  disabled={isPending || !newName.trim()}
                >
                  {isPending ? 'Creating...' : 'Create Workspace'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Workspaces Grid */}
      {workspaces.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">No workspaces yet</h3>
          <p className="text-slate-500 mb-6">Create your first workspace to get started</p>
          <button 
            onClick={() => setIsCreating(true)}
            className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
          >
            Create Workspace
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workspaces.map((workspace) => (
            <div 
              key={workspace.id}
              onClick={() => onSelectWorkspace(workspace.id)}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all cursor-pointer group"
            >
              {/* Header */}
              <div 
                className="h-20 p-4 flex items-end"
                style={{ backgroundColor: workspace.color || '#3b82f6' }}
              >
                <h3 className="text-xl font-bold text-white drop-shadow-sm">{workspace.name}</h3>
              </div>
              
              {/* Body */}
              <div className="p-4">
                {workspace.description && (
                  <p className="text-sm text-slate-500 mb-3 line-clamp-2">{workspace.description}</p>
                )}
                
                <div className="flex items-center justify-between text-sm text-slate-500">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Grid className="w-4 h-4" />
                      {workspace._count?.boards || 0} boards
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {workspace._count?.members || 0} members
                    </span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
