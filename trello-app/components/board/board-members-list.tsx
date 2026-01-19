'use client';

import { useState, useEffect } from 'react';

interface BoardMember {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  role: 'owner' | 'admin' | 'member';
}

interface BoardMembersListProps {
  boardId: string;
  currentUserId: string;
  onRefresh?: number;
}

export function BoardMembersList({ boardId, currentUserId, onRefresh }: BoardMembersListProps) {
  const [members, setMembers] = useState<BoardMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUserRole, setCurrentUserRole] = useState<'owner' | 'admin' | 'member' | null>(null);

  const loadMembers = async () => {
    try {
      setLoading(true);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[BoardMembersList] Loading members for boardId:', boardId);
      }
      
      const response = await fetch(`/api/boards/${boardId}/members`, {
        credentials: 'include',
      });

      if (process.env.NODE_ENV === 'development') {
        console.log('[BoardMembersList] Response status:', response.status);
      }

      if (response.ok) {
        const data = await response.json();
        
        if (process.env.NODE_ENV === 'development') {
          console.log('[BoardMembersList] Members loaded:', data.members?.length || 0);
        }
        
        setMembers(data.members);
        
        // Trouver le rôle de l'utilisateur courant
        const currentUser = data.members.find((m: BoardMember) => m.id === currentUserId);
        setCurrentUserRole(currentUser?.role || null);
      } else {
        const errorData = await response.json();
        
        if (process.env.NODE_ENV === 'development') {
          console.error('[BoardMembersList] Error response:', errorData);
        }
        
        setError('Erreur lors du chargement des membres');
      }
    } catch (err) {
      console.error('Error loading members:', err);
      setError('Erreur lors du chargement des membres');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, [boardId, onRefresh]);

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir retirer ce membre ?')) return;

    try {
      const response = await fetch(`/api/boards/${boardId}/members?userId=${memberId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        setMembers(members.filter(m => m.id !== memberId));
      } else {
        const data = await response.json();
        alert(data.error || 'Erreur lors de la suppression');
      }
    } catch (err) {
      console.error('Error removing member:', err);
      alert('Erreur lors de la suppression');
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-800';
      case 'admin':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner':
        return 'Propriétaire';
      case 'admin':
        return 'Admin';
      default:
        return 'Membre';
    }
  };

  const canRemoveMember = (memberRole: string) => {
    if (!currentUserRole) return false;
    if (currentUserRole === 'member') return false;
    if (memberRole === 'owner' && currentUserRole !== 'owner') return false;
    return true;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-600 text-sm py-2">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">
        Membres du board ({members.length})
      </h3>
      
      <div className="space-y-2">
        {members.map((member) => (
          <div
            key={member.id}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {member.avatar ? (
                <img
                  src={member.avatar}
                  alt={member.name || member.email}
                  className="h-8 w-8 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {(member.name || member.email).charAt(0).toUpperCase()}
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {member.name || 'Sans nom'}
                  {member.id === currentUserId && (
                    <span className="text-gray-500 ml-1">(Vous)</span>
                  )}
                </p>
                <p className="text-xs text-gray-500 truncate">{member.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(member.role)}`}>
                {getRoleLabel(member.role)}
              </span>
              
              {member.id !== currentUserId && canRemoveMember(member.role) && (
                <button
                  onClick={() => handleRemoveMember(member.id)}
                  className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Retirer ce membre"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {members.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-4">
          Aucun membre dans ce board
        </p>
      )}
    </div>
  );
}
