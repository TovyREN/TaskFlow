"use client";

import React, { useState, useEffect } from 'react';
import { Plus, X, Grid, Crown, Shield, Eye, Settings, Users, ArrowLeft, Loader2, MoreVertical, Trash2 } from 'lucide-react';
import { getWorkspaceDetails, createBoardInWorkspace, deleteBoardFromWorkspace, getUserRole } from '../app/actions/workspaceActions';
import { MemberRole } from '../types';
import { useSocket } from './SocketProvider';

interface WorkspaceViewProps {
  workspaceId: string;
  userId: string;
  onBack: () => void;
  onSelectBoard: (boardId: string, workspaceId: string) => void;
  onOpenAdmin: () => void;
}

const BOARD_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6'
];

export default function WorkspaceView({ workspaceId, userId, onBack, onSelectBoard, onOpenAdmin }: WorkspaceViewProps) {
  const [workspace, setWorkspace] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<MemberRole | null>(null);
  
  const [isCreatingBoard, setIsCreatingBoard] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [selectedBoardColor, setSelectedBoardColor] = useState(BOARD_COLORS[0]);
  const [isPending, setIsPending] = useState(false);
  
  const [menuOpenBoardId, setMenuOpenBoardId] = useState<string | null>(null);

  const { joinWorkspace, leaveWorkspace, on, off, isConnected } = useSocket();

  const loadWorkspace = async () => {
    const [data, role] = await Promise.all([
      getWorkspaceDetails(workspaceId, userId),
      getUserRole(workspaceId, userId)
    ]);
    setWorkspace(data);
    setUserRole(role);
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    loadWorkspace();
  }, [workspaceId, userId]);

  // Socket: Join workspace room and listen for real-time updates
  useEffect(() => {
    if (!isConnected || !workspaceId) return;

    joinWorkspace(workspaceId);

    // Handle board created in workspace
    const handleBoardCreated = (data: any) => {
      if (data.workspaceId !== workspaceId) return;
      setWorkspace((prev: any) => {
        if (!prev) return prev;
        if (prev.boards?.some((b: any) => b.id === data.board.id)) return prev;
        return { ...prev, boards: [data.board, ...(prev.boards || [])] };
      });
    };

    // Handle board deleted from workspace
    const handleBoardDeleted = (data: any) => {
      if (data.workspaceId !== workspaceId) return;
      setWorkspace((prev: any) => {
        if (!prev) return prev;
        return { ...prev, boards: prev.boards?.filter((b: any) => b.id !== data.boardId) };
      });
    };

    // Handle workspace updated (settings changed)
    const handleWorkspaceUpdated = (data: any) => {
      if (data.workspaceId !== workspaceId) return;
      loadWorkspace(); // Reload to get latest settings
    };

    // Handle member changes
    const handleMemberAdded = () => loadWorkspace();
    const handleMemberRemoved = (data: any) => {
      if (data.userId === userId) {
        // Current user was removed - go back to dashboard
        onBack();
      } else {
        loadWorkspace();
      }
    };
    const handleMemberRoleChanged = (data: any) => {
      if (data.workspaceId !== workspaceId) return;
      loadWorkspace(); // Reload to get updated permissions
    };

    on('board:created', handleBoardCreated);
    on('board:deleted', handleBoardDeleted);
    on('workspace:updated', handleWorkspaceUpdated);
    on('workspace:member-added', handleMemberAdded);
    on('workspace:member-removed', handleMemberRemoved);
    on('workspace:member-role-changed', handleMemberRoleChanged);

    return () => {
      leaveWorkspace(workspaceId);
      off('board:created', handleBoardCreated);
      off('board:deleted', handleBoardDeleted);
      off('workspace:updated', handleWorkspaceUpdated);
      off('workspace:member-added', handleMemberAdded);
      off('workspace:member-removed', handleMemberRemoved);
      off('workspace:member-role-changed', handleMemberRoleChanged);
    };
  }, [workspaceId, isConnected, joinWorkspace, leaveWorkspace, on, off, userId, onBack]);

  // Polling fallback when sockets are not connected (e.g. Vercel deployment)
  // Skip polling when user is interacting (creating board or has menu open)
  useEffect(() => {
    if (isConnected || isCreatingBoard || menuOpenBoardId) return;
    const interval = setInterval(() => {
      loadWorkspace();
    }, 10000);
    return () => clearInterval(interval);
  }, [isConnected, workspaceId, userId, isCreatingBoard, menuOpenBoardId]);

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoardTitle.trim()) return;

    setIsPending(true);
    const result = await createBoardInWorkspace(workspaceId, newBoardTitle, userId, selectedBoardColor);
    if (result.success && result.board) {
      // Add the board to local state immediately
      setWorkspace((prev: any) => {
        if (!prev) return prev;
        if (prev.boards?.some((b: any) => b.id === result.board.id)) return prev;
        return { ...prev, boards: [result.board, ...(prev.boards || [])] };
      });
      setNewBoardTitle('');
      setSelectedBoardColor(BOARD_COLORS[0]);
      setIsCreatingBoard(false);
    }
    setIsPending(false);
  };

  const handleDeleteBoard = async (boardId: string) => {
    if (!confirm('Are you sure you want to delete this board? This action cannot be undone.')) return;
    
    const result = await deleteBoardFromWorkspace(boardId, userId);
    if (result.success) {
      setWorkspace((prev: any) => ({
        ...prev,
        boards: prev.boards.filter((b: any) => b.id !== boardId)
      }));
    }
    setMenuOpenBoardId(null);
  };

  const getRoleIcon = (role: MemberRole) => {
    switch (role) {
      case 'ADMIN': return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'MEMBER': return <Shield className="w-4 h-4 text-blue-500" />;
      case 'VIEWER': return <Eye className="w-4 h-4 text-gray-500" />;
    }
  };

  const getRoleName = (role: MemberRole) => {
    switch (role) {
      case 'ADMIN': return 'Admin';
      case 'MEMBER': return 'Member';
      case 'VIEWER': return 'Viewer';
    }
  };

  const canEdit = userRole === 'ADMIN' || userRole === 'MEMBER';
  const canManage = userRole === 'ADMIN';

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-600 mb-4">Workspace not found or you don't have access.</p>
        <button onClick={onBack} className="text-blue-600 hover:underline">Go back</button>
      </div>
    );
  }

  return (
    <div className="h-full flex bg-gray-50">
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div 
          className="p-6 text-white"
          style={{ backgroundColor: workspace.color || '#3b82f6' }}
        >
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-4 mb-4">
              <button 
                onClick={onBack}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-2xl font-bold">{workspace.name}</h1>
              {canManage && (
                <button 
                  onClick={onOpenAdmin}
                  className="ml-auto p-2 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Settings className="w-5 h-5" />
                  <span className="text-sm font-medium">Settings</span>
                </button>
              )}
            </div>
            {workspace.description && (
              <p className="text-white/80 max-w-2xl">{workspace.description}</p>
            )}
          </div>
        </div>

        {/* Boards Section */}
        <div className="p-6 max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Grid className="w-5 h-5" />
              Boards
            </h2>
            {canManage && (
              <button 
                onClick={() => setIsCreatingBoard(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 font-medium text-sm"
              >
                <Plus className="w-4 h-4" />
                New Board
              </button>
            )}
          </div>

          {/* Create Board Modal */}
          {isCreatingBoard && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm" onClick={() => setIsCreatingBoard(false)}>
              <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-5">
                  <h3 className="text-lg font-bold text-slate-800">Create Board</h3>
                  <button onClick={() => setIsCreatingBoard(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleCreateBoard}>
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Board Title</label>
                    <input 
                      autoFocus
                      className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                      placeholder="e.g. Project Roadmap"
                      value={newBoardTitle}
                      onChange={e => setNewBoardTitle(e.target.value)}
                      disabled={isPending}
                    />
                  </div>
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Background Color</label>
                    <div className="flex gap-2 flex-wrap">
                      {BOARD_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setSelectedBoardColor(color)}
                          className={`w-10 h-8 rounded transition-all ${
                            selectedBoardColor === color ? 'ring-2 ring-offset-2 ring-indigo-500' : ''
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button 
                      type="button" 
                      onClick={() => setIsCreatingBoard(false)}
                      className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg font-medium"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:bg-indigo-400"
                      disabled={isPending || !newBoardTitle.trim()}
                    >
                      {isPending ? 'Creating...' : 'Create'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Boards Grid */}
          {workspace.boards?.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
              <Grid className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 mb-4">No boards in this workspace yet</p>
              {canManage && (
                <button 
                  onClick={() => setIsCreatingBoard(true)}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm"
                >
                  Create First Board
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {workspace.boards?.map((board: any) => (
                <div 
                  key={board.id}
                  className="relative group"
                >
                  <div
                    onClick={() => onSelectBoard(board.id, workspaceId)}
                    className="h-28 rounded-lg p-4 cursor-pointer hover:opacity-90 transition-opacity flex flex-col justify-between"
                    style={{ backgroundColor: board.color || '#3b82f6' }}
                  >
                    <h4 className="font-semibold text-white drop-shadow-sm">{board.title}</h4>
                  </div>
                  
                  {/* Board Menu */}
                  {canManage && (
                    <div className="absolute top-2 right-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpenBoardId(menuOpenBoardId === board.id ? null : board.id);
                        }}
                        className="p-1.5 bg-black/20 hover:bg-black/30 rounded text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {menuOpenBoardId === board.id && (
                        <div className="absolute top-8 right-0 bg-white rounded-lg shadow-xl border border-slate-200 py-1 min-w-[140px] z-10">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteBoard(board.id);
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete Board
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Members Sidebar */}
      <div className="w-72 bg-white border-l border-slate-200 p-4 overflow-y-auto hidden lg:block">
        <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Members ({workspace.members?.length || 0})
        </h3>
        
        <div className="space-y-3">
          {workspace.members?.map((member: any) => (
            <div key={member.id} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-medium text-sm">
                {member.user?.name?.charAt(0).toUpperCase() || member.user?.email?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">
                  {member.user?.name || member.user?.email?.split('@')[0]}
                </p>
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  {getRoleIcon(member.role)}
                  <span>{getRoleName(member.role)}</span>
                  {workspace.ownerId === member.userId && (
                    <span className="text-yellow-600 ml-1">(Owner)</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pending Invitations in this workspace */}
        {workspace.invitations?.length > 0 && canManage && (
          <div className="mt-6 pt-4 border-t border-slate-200">
            <h4 className="text-sm font-semibold text-slate-600 mb-3">Pending Invitations</h4>
            <div className="space-y-2">
              {workspace.invitations.map((inv: any) => (
                <div key={inv.id} className="text-sm text-slate-500 bg-slate-50 rounded p-2">
                  <p className="truncate">{inv.inviteeEmail}</p>
                  <div className="flex items-center gap-1 text-xs mt-1">
                    {getRoleIcon(inv.role)}
                    <span>{getRoleName(inv.role)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
