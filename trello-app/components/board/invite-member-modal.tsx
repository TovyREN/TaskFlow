'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardId: string;
  onMemberAdded?: () => void;
}

export function InviteMemberModal({ isOpen, onClose, boardId, onMemberAdded }: InviteMemberModalProps) {
  const params = useParams();

  // Résoudre le boardId de manière robuste
  const resolveBoardId = (): string => {
    // 1. Depuis les props (priorité la plus haute)
    if (boardId && boardId !== 'undefined' && typeof boardId === 'string') {
      return boardId;
    }

    // 2. Depuis useParams
    const paramsId = (params as any)?.boardId;
    if (paramsId && paramsId !== 'undefined' && typeof paramsId === 'string') {
      return paramsId;
    }

    // 3. Depuis l'URL window.location (fallback)
    if (typeof window !== 'undefined') {
      const parts = window.location.pathname.split('/').filter(Boolean);
      if (parts[0] === 'boards' && parts[1] && parts[1] !== 'undefined') {
        return parts[1];
      }
    }

    return '';
  };

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'member' | 'admin' | 'owner' | 'readonly'>('member');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Diagnostic au montage en dev
  if (process.env.NODE_ENV === 'development' && isOpen) {
    const resolved = resolveBoardId();
    console.log('🔍 [InviteMemberModal] boardId prop:', boardId, '| params:', (params as any)?.boardId, '| resolved:', resolved);
    if (!resolved || resolved === 'undefined') {
      console.error('⚠️ boardId invalide détecté !');
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const effectiveBoardId = resolveBoardId();

    // Validation stricte du boardId
    if (!effectiveBoardId || effectiveBoardId === 'undefined') {
      setLoading(false);
      const debugInfo = process.env.NODE_ENV === 'development' 
        ? ` (prop: ${boardId}, params: ${(params as any)?.boardId})`
        : '';
      setError(`Impossible d'inviter: boardId invalide${debugInfo}`);
      console.error('❌ Tentative d\'invitation avec boardId invalide:', { boardId, params, effectiveBoardId });
      return;
    }

    console.log('✅ Envoi invitation pour boardId:', effectiveBoardId);

    try {
      const response = await fetch(`/api/boards/${effectiveBoardId}/members`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, role }),
      });

      const data = await response.json();

      if (!response.ok) {
        const baseMessage = data.error || 'Erreur lors de l\'invitation';
        if (process.env.NODE_ENV === 'development' && data?.debug) {
          console.error('Invite member debug:', data.debug);
          const dbPath = data.debug?.dbPath ? String(data.debug.dbPath) : '';
          const cwd = data.debug?.cwd ? String(data.debug.cwd) : '';
          const extra = [dbPath ? `dbPath=${dbPath}` : '', cwd ? `cwd=${cwd}` : '']
            .filter(Boolean)
            .join(' | ');
          throw new Error(extra ? `${baseMessage} (${extra})` : baseMessage);
        }

        throw new Error(baseMessage);
      }

      setSuccess(`${email} a été ajouté au board avec succès!`);
      setEmail('');
      setRole('member');
      
      // Appeler le callback pour rafraîchir la liste
      if (onMemberAdded) {
        onMemberAdded();
      }

      // Fermer après un court délai
      setTimeout(() => {
        onClose();
        setSuccess('');
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setRole('member');
    setError('');
    setSuccess('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Inviter un membre">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email de l'utilisateur
          </label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="utilisateur@exemple.com"
            required
            disabled={loading}
          />
          <p className="mt-1 text-xs text-gray-500">
            L'utilisateur doit avoir un compte existant
          </p>
        </div>

        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
            Rôle
          </label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value as 'member' | 'admin' | 'owner' | 'readonly')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            disabled={loading}
          >
            <option value="readonly">Lecture seule</option>
            <option value="member">Membre</option>
            <option value="admin">Administrateur</option>
            <option value="owner">Propriétaire</option>
          </select>
          <div className="mt-2 text-xs text-gray-600 space-y-1">
            <p><strong>Lecture seule:</strong> Peut uniquement consulter le board</p>
            <p><strong>Membre:</strong> Peut créer et modifier des cartes</p>
            <p><strong>Administrateur:</strong> Peut inviter des membres et gérer le board</p>
            <p><strong>Propriétaire:</strong> Accès complet, peut supprimer le board</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded text-sm">
            {success}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800"
          >
            Annuler
          </Button>
          <Button
            type="submit"
            disabled={loading || !email}
          >
            {loading ? 'Envoi...' : 'Inviter'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
