'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface Invitation {
  invitation_id: string;
  board_id: string;
  board_name: string;
  board_description: string | null;
  inviter_id: string;
  inviter_name: string | null;
  inviter_email: string;
  role: 'owner' | 'admin' | 'member';
  invited_at: number;
}

export function InvitationsList() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadInvitations = async () => {
    try {
      setLoading(true);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[InvitationsList] Loading invitations...');
      }
      
      const response = await fetch('/api/invitations', {
        credentials: 'include',
      });

      if (process.env.NODE_ENV === 'development') {
        console.log('[InvitationsList] Response status:', response.status);
      }

      if (response.ok) {
        const data = await response.json();
        
        if (process.env.NODE_ENV === 'development') {
          console.log('[InvitationsList] Invitations loaded:', data.invitations);
        }
        
        setInvitations(data.invitations);
      } else {
        console.error('[InvitationsList] Error response:', await response.text());
      }
    } catch (error) {
      console.error('Error loading invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvitations();
  }, []);

  const handleInvitation = async (invitationId: string, action: 'accept' | 'reject') => {
    try {
      setProcessingId(invitationId);
      const response = await fetch(`/api/invitations/${invitationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        // Retirer l'invitation de la liste
        setInvitations(invitations.filter(inv => inv.invitation_id !== invitationId));
        
        if (action === 'accept') {
          // Recharger la page pour afficher le nouveau board
          window.location.reload();
        }
      } else {
        const data = await response.json();
        alert(data.error || 'Erreur lors du traitement de l\'invitation');
      }
    } catch (error) {
      console.error('Error handling invitation:', error);
      alert('Erreur lors du traitement de l\'invitation');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">Chargement des invitations...</p>
      </div>
    );
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('[InvitationsList] Render - invitations count:', invitations.length);
  }

  if (invitations.length === 0) {
    // Afficher un message en dev pour debug
    if (process.env.NODE_ENV === 'development') {
      return (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-600">Aucune invitation en attente</p>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="space-y-3 mb-6">
      <h2 className="text-lg font-semibold text-gray-900">Invitations en attente</h2>
      {invitations.map((invitation) => (
        <div
          key={invitation.invitation_id}
          className="bg-blue-50 border border-blue-200 rounded-lg p-4"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">{invitation.board_name}</h3>
              {invitation.board_description && (
                <p className="text-sm text-gray-600 mt-1">{invitation.board_description}</p>
              )}
              <p className="text-sm text-gray-500 mt-2">
                Invitation de <span className="font-medium">{invitation.inviter_name || invitation.inviter_email}</span>
                {' '}pour rejoindre en tant que <span className="font-medium">{invitation.role}</span>
              </p>
            </div>
            <div className="flex gap-2 ml-4">
              <Button
                onClick={() => handleInvitation(invitation.invitation_id, 'accept')}
                disabled={processingId === invitation.invitation_id}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {processingId === invitation.invitation_id ? 'En cours...' : 'Accepter'}
              </Button>
              <Button
                onClick={() => handleInvitation(invitation.invitation_id, 'reject')}
                disabled={processingId === invitation.invitation_id}
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-50"
              >
                Refuser
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
