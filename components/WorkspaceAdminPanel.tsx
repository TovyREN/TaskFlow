"use client";

import React, { useState, useEffect } from 'react';
import {
  X, Settings, Users, Mail, Crown, Shield, Eye, Trash2,
  UserPlus, ChevronDown, AlertTriangle, Loader2, Check
} from 'lucide-react';
import {
  getWorkspaceDetails, updateWorkspace, deleteWorkspace,
  updateMemberRole, removeMember, createInvitation, cancelInvitation
} from '../app/actions/workspaceActions';
import { MemberRole } from '../types';
import { useSocket } from './SocketProvider';

interface WorkspaceAdminPanelProps {
  workspaceId: string;
  userId: string;
  onClose: () => void;
  onWorkspaceDeleted: () => void;
  onWorkspaceUpdated: () => void;
}

const WORKSPACE_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#6366f1'
];

type TabType = 'settings' | 'members' | 'invitations';

export default function WorkspaceAdminPanel({ 
  workspaceId, 
  userId, 
  onClose, 
  onWorkspaceDeleted,
  onWorkspaceUpdated 
}: WorkspaceAdminPanelProps) {
  const [workspace, setWorkspace] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('settings');
  
  // Settings state
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editColor, setEditColor] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  
  // Invite state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<MemberRole>('MEMBER');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  
  // Role change dropdown
  const [roleDropdownMemberId, setRoleDropdownMemberId] = useState<string | null>(null);

  const isOwner = workspace?.ownerId === userId;
  const { joinWorkspace, leaveWorkspace, on, off, isConnected } = useSocket();

  useEffect(() => {
    loadWorkspace();
  }, [workspaceId, userId]);

  // Socket: Join workspace room and listen for real-time updates
  useEffect(() => {
    if (!isConnected || !workspaceId) return;

    joinWorkspace(workspaceId);

    // Handle member role changed
    const handleMemberRoleChanged = (data: any) => {
      if (data.workspaceId !== workspaceId) return;
      loadWorkspace(); // Reload workspace data
    };

    // Handle member added
    const handleMemberAdded = (data: any) => {
      if (data.workspaceId !== workspaceId) return;
      loadWorkspace();
    };

    // Handle member removed
    const handleMemberRemoved = (data: any) => {
      if (data.workspaceId !== workspaceId) return;
      loadWorkspace();
    };

    // Handle invitation created/cancelled
    const handleInvitationChange = (data: any) => {
      if (data.workspaceId !== workspaceId) return;
      loadWorkspace();
    };

    on('workspace:member-role-changed', handleMemberRoleChanged);
    on('workspace:member-added', handleMemberAdded);
    on('workspace:member-removed', handleMemberRemoved);
    on('workspace:invitation-created', handleInvitationChange);
    on('workspace:invitation-cancelled', handleInvitationChange);

    return () => {
      leaveWorkspace(workspaceId);
      off('workspace:member-role-changed', handleMemberRoleChanged);
      off('workspace:member-added', handleMemberAdded);
      off('workspace:member-removed', handleMemberRemoved);
      off('workspace:invitation-created', handleInvitationChange);
      off('workspace:invitation-cancelled', handleInvitationChange);
    };
  }, [workspaceId, isConnected, joinWorkspace, leaveWorkspace, on, off]);

  const loadWorkspace = async () => {
    setLoading(true);
    const data = await getWorkspaceDetails(workspaceId, userId);
    if (data) {
      setWorkspace(data);
      setEditName(data.name);
      setEditDescription(data.description || '');
      setEditColor(data.color || '#3b82f6');
    }
    setLoading(false);
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    setSaveSuccess(false);
    const result = await updateWorkspace(workspaceId, userId, {
      name: editName,
      description: editDescription,
      color: editColor
    });
    if (result.success) {
      setSaveSuccess(true);
      onWorkspaceUpdated();
      setTimeout(() => setSaveSuccess(false), 2000);
    }
    setSaving(false);
  };

  const handleDeleteWorkspace = async () => {
    if (deleteConfirmText !== workspace.name) return;
    
    setDeleting(true);
    const result = await deleteWorkspace(workspaceId, userId);
    if (result.success) {
      onWorkspaceDeleted();
    }
    setDeleting(false);
  };

  const handleUpdateMemberRole = async (memberId: string, memberUserId: string, newRole: MemberRole) => {
    const result = await updateMemberRole(workspaceId, memberUserId, newRole, userId);
    if (result.success) {
      setWorkspace((prev: any) => ({
        ...prev,
        members: prev.members.map((m: any) => 
          m.id === memberId ? { ...m, role: newRole } : m
        )
      }));
    }
    setRoleDropdownMemberId(null);
  };

  const handleRemoveMember = async (memberUserId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;
    
    const result = await removeMember(workspaceId, memberUserId, userId);
    if (result.success) {
      setWorkspace((prev: any) => ({
        ...prev,
        members: prev.members.filter((m: any) => m.userId !== memberUserId)
      }));
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    
    setInviting(true);
    setInviteError('');
    
    const result = await createInvitation(workspaceId, inviteEmail, inviteRole, userId);
    
    if (result.success && result.invitation) {
      setWorkspace((prev: any) => ({
        ...prev,
        invitations: [result.invitation, ...(prev.invitations || [])]
      }));
      setInviteEmail('');
      setInviteRole('MEMBER');
    } else {
      setInviteError(result.error || 'Failed to send invitation');
    }
    setInviting(false);
  };

  const handleCancelInvitation = async (invitationId: string) => {
    const result = await cancelInvitation(invitationId, userId);
    if (result.success) {
      setWorkspace((prev: any) => ({
        ...prev,
        invitations: prev.invitations.filter((i: any) => i.id !== invitationId)
      }));
    }
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

  const getRoleDescription = (role: MemberRole) => {
    switch (role) {
      case 'ADMIN': return 'Can manage workspace settings, members, and all boards';
      case 'MEMBER': return 'Can create and edit boards and tasks';
      case 'VIEWER': return 'Can only view boards and tasks (read-only)';
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
        <div className="bg-white rounded-xl p-8">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  if (!workspace) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-3xl min-h-[70vh] max-h-[95vh] overflow-hidden mx-4 flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-800">Workspace Settings</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-6 py-3 font-medium text-sm transition-colors flex items-center gap-2 ${
              activeTab === 'settings' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Settings className="w-4 h-4" />
            General
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`px-6 py-3 font-medium text-sm transition-colors flex items-center gap-2 ${
              activeTab === 'members' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Users className="w-4 h-4" />
            Members ({workspace.members?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('invitations')}
            className={`px-6 py-3 font-medium text-sm transition-colors flex items-center gap-2 ${
              activeTab === 'invitations' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Mail className="w-4 h-4" />
            Invitations
            {workspace.invitations?.length > 0 && (
              <span className="bg-blue-100 text-blue-600 text-xs px-2 py-0.5 rounded-full">
                {workspace.invitations?.length}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Workspace Name</label>
                <input 
                  className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Description</label>
                <textarea 
                  className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 resize-none"
                  rows={3}
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  placeholder="What's this workspace for?"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {WORKSPACE_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setEditColor(color)}
                      className={`w-8 h-8 rounded-full transition-all ${
                        editColor === color ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <button
                  onClick={handleSaveSettings}
                  disabled={saving || !editName.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:bg-blue-400 flex items-center gap-2"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : saveSuccess ? (
                    <Check className="w-4 h-4" />
                  ) : null}
                  {saving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Changes'}
                </button>
              </div>

              {/* Danger Zone */}
              {isOwner && (
                <div className="mt-8 pt-6 border-t border-red-200">
                  <h3 className="text-lg font-semibold text-red-600 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Danger Zone
                  </h3>
                  <p className="text-sm text-slate-600 mb-4">
                    Once you delete a workspace, there is no going back. All boards and tasks will be permanently deleted.
                  </p>
                  
                  {!showDeleteConfirm ? (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 font-medium"
                    >
                      Delete Workspace
                    </button>
                  ) : (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-sm text-red-700 mb-3">
                        Type <strong>{workspace.name}</strong> to confirm deletion:
                      </p>
                      <input
                        className="w-full border border-red-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-red-500 text-slate-900 mb-3"
                        value={deleteConfirmText}
                        onChange={e => setDeleteConfirmText(e.target.value)}
                        placeholder={workspace.name}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleDeleteWorkspace}
                          disabled={deleting || deleteConfirmText !== workspace.name}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:bg-red-400 flex items-center gap-2"
                        >
                          {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                          {deleting ? 'Deleting...' : 'Delete Forever'}
                        </button>
                        <button
                          onClick={() => {
                            setShowDeleteConfirm(false);
                            setDeleteConfirmText('');
                          }}
                          className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Members Tab */}
          {activeTab === 'members' && (
            <div className="space-y-4">
              {workspace.members?.map((member: any) => (
                <div key={member.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-medium">
                      {member.user?.name?.charAt(0).toUpperCase() || member.user?.email?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">
                        {member.user?.name || member.user?.email?.split('@')[0]}
                        {workspace.ownerId === member.userId && (
                          <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Owner</span>
                        )}
                      </p>
                      <p className="text-sm text-slate-500">{member.user?.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Role Dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => setRoleDropdownMemberId(roleDropdownMemberId === member.id ? null : member.id)}
                        disabled={member.userId === workspace.ownerId || (!isOwner && member.role === 'ADMIN')}
                        className="flex items-center gap-2 px-3 py-1.5 border border-slate-300 rounded-lg text-sm hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {getRoleIcon(member.role)}
                        <span>{getRoleName(member.role)}</span>
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      </button>
                      
                      {roleDropdownMemberId === member.id && (
                        <div className="absolute top-full mt-1 right-0 bg-white rounded-lg shadow-xl border border-slate-200 py-1 min-w-[200px] z-10">
                          {(['ADMIN', 'MEMBER', 'VIEWER'] as MemberRole[]).map((role) => (
                            <button
                              key={role}
                              onClick={() => handleUpdateMemberRole(member.id, member.userId, role)}
                              disabled={role === 'ADMIN' && !isOwner}
                              className="w-full px-3 py-2 text-left hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <div className="flex items-center gap-2">
                                {getRoleIcon(role)}
                                <span className="font-medium text-sm">{getRoleName(role)}</span>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5 ml-6">{getRoleDescription(role)}</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Remove Button */}
                    {member.userId !== workspace.ownerId && (isOwner || member.role !== 'ADMIN') && (
                      <button
                        onClick={() => handleRemoveMember(member.userId)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Invitations Tab */}
          {activeTab === 'invitations' && (
            <div className="space-y-6">
              {/* Invite Form */}
              <form onSubmit={handleInvite} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-blue-600" />
                  Invite New Member
                </h4>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="email"
                    placeholder="Email address"
                    className="flex-1 border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                  />
                  
                  <select
                    value={inviteRole}
                    onChange={e => setInviteRole(e.target.value as MemberRole)}
                    className="border border-slate-300 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 bg-white"
                  >
                    {isOwner && <option value="ADMIN">Admin</option>}
                    <option value="MEMBER">Member</option>
                    <option value="VIEWER">Viewer (Read-only)</option>
                  </select>
                  
                  <button
                    type="submit"
                    disabled={inviting || !inviteEmail.trim()}
                    className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:bg-blue-400 flex items-center gap-2 whitespace-nowrap"
                  >
                    {inviting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Send Invite
                  </button>
                </div>
                
                {inviteError && (
                  <p className="text-sm text-red-600 mt-2">{inviteError}</p>
                )}
                
                <p className="text-xs text-slate-500 mt-2">
                  {getRoleDescription(inviteRole)}
                </p>
              </form>

              {/* Pending Invitations List */}
              <div>
                <h4 className="font-semibold text-slate-700 mb-3">Pending Invitations</h4>
                
                {workspace.invitations?.length === 0 ? (
                  <p className="text-slate-500 text-sm py-8 text-center bg-slate-50 rounded-lg">
                    No pending invitations
                  </p>
                ) : (
                  <div className="space-y-2">
                    {workspace.invitations?.map((invitation: any) => (
                      <div key={invitation.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div>
                          <p className="font-medium text-slate-800">{invitation.inviteeEmail}</p>
                          <div className="flex items-center gap-2 text-sm text-slate-500">
                            <span className="flex items-center gap-1">
                              {getRoleIcon(invitation.role)}
                              {getRoleName(invitation.role)}
                            </span>
                            <span>•</span>
                            <span>
                              Invited by {invitation.inviter?.name || invitation.inviter?.email?.split('@')[0]}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleCancelInvitation(invitation.id)}
                          className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
