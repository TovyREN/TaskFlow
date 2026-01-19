'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBoard, updateBoard } from '@/actions/board-actions';
import { createBoardLabel } from '@/actions/card-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { InviteMemberModal } from './invite-member-modal';
import { BoardMembersList } from './board-members-list';

interface BoardMenuProps {
  boardId: string;
  currentUserId: string;
}

type LabelColor = 'green' | 'yellow' | 'orange' | 'red' | 'purple' | 'blue' | 'sky' | 'lime' | 'pink' | 'gray';

export function BoardMenu({ boardId, currentUserId }: BoardMenuProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Diagnostic en dev
  if (process.env.NODE_ENV === 'development') {
    console.log('🔧 [BoardMenu] boardId reçu:', boardId);
  }

  const [isEditBoardOpen, setIsEditBoardOpen] = useState(false);
  const [isSavingBoard, setIsSavingBoard] = useState(false);
  const [boardName, setBoardName] = useState('');
  const [boardDescription, setBoardDescription] = useState('');
  const [boardBackground, setBoardBackground] = useState('');

  const [isInviteMemberOpen, setIsInviteMemberOpen] = useState(false);
  const [isMembersOpen, setIsMembersOpen] = useState(false);
  const [membersRefreshKey, setMembersRefreshKey] = useState(0);

  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState<LabelColor>('green');

  const labelOptions = useMemo(
    () => [
      { value: 'green', className: 'bg-green-500' },
      { value: 'yellow', className: 'bg-yellow-400' },
      { value: 'orange', className: 'bg-orange-500' },
      { value: 'red', className: 'bg-red-500' },
      { value: 'purple', className: 'bg-purple-500' },
      { value: 'blue', className: 'bg-blue-500' },
      { value: 'sky', className: 'bg-sky-500' },
      { value: 'lime', className: 'bg-lime-500' },
      { value: 'pink', className: 'bg-pink-500' },
      { value: 'gray', className: 'bg-gray-400' },
    ],
    []
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  const handleCreateLabel = async () => {
    if (!newLabelName.trim()) return;
    setIsLoading(true);
    try {
      await createBoardLabel(boardId, newLabelName.trim(), newLabelColor);
      setNewLabelName('');
      setIsOpen(false);
      router.refresh();
    } catch (error) {
      console.error('Error creating label from board menu:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const openEditBoard = async () => {
    setIsOpen(false);
    setIsEditBoardOpen(true);
    setIsLoading(true);
    try {
      const board = await getBoard(boardId);
      setBoardName(board?.name || '');
      setBoardDescription(board?.description || '');
      setBoardBackground(board?.background || '');
    } catch (error) {
      console.error('Error loading board for edit:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveBoard = async () => {
    const name = boardName.trim();
    if (!name) return;

    setIsSavingBoard(true);
    try {
      const desc = boardDescription.trim();
      const bg = boardBackground.trim();
      await updateBoard(boardId, {
        name,
        description: desc ? desc : null,
        background: bg ? bg : null,
      });
      setIsEditBoardOpen(false);
      router.refresh();
    } catch (error) {
      console.error('Error updating board:', error);
    } finally {
      setIsSavingBoard(false);
    }
  };

  const handleInviteMember = () => {
    setIsOpen(false);
    setIsInviteMemberOpen(true);
  };

  const handleViewMembers = () => {
    setIsOpen(false);
    setIsMembersOpen(true);
  };

  const handleMemberAdded = () => {
    setMembersRefreshKey(prev => prev + 1);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
      >
        Menu
      </button>

      {isOpen && (
        <>
          <button
            type="button"
            aria-label="Fermer le menu"
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-40"
          />

          <div className="absolute right-0 mt-2 z-50 w-96 bg-white rounded-lg shadow-xl border border-gray-200">
            <div className="p-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">Menu du board</h3>
              <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-gray-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-3">
              <Button
                onClick={openEditBoard}
                disabled={isLoading}
                variant="outline"
                className="w-full mb-2"
              >
                Modifier le board
              </Button>

              <Button
                onClick={handleInviteMember}
                disabled={isLoading}
                variant="outline"
                className="w-full mb-2"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Inviter un membre
              </Button>

              <Button
                onClick={handleViewMembers}
                disabled={isLoading}
                variant="outline"
                className="w-full mb-4"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                Voir les membres
              </Button>

              <div className="text-xs font-semibold text-gray-600 mb-2">Créer une étiquette</div>

              <div className="flex gap-2">
                <input
                  value={newLabelName}
                  onChange={(e) => setNewLabelName(e.target.value)}
                  placeholder="Nom"
                  className="flex-1 p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                />

                <select
                  value={newLabelColor}
                  onChange={(e) => setNewLabelColor(e.target.value as LabelColor)}
                  className="p-2 border rounded"
                  disabled={isLoading}
                >
                  {labelOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.value}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 mt-2">
                <div
                  className={`h-3 w-10 rounded ${
                    labelOptions.find((o) => o.value === newLabelColor)?.className || 'bg-gray-400'
                  }`}
                />
                <div className="text-xs text-gray-500">Aperçu</div>
              </div>

              <Button
                onClick={handleCreateLabel}
                disabled={isLoading || !newLabelName.trim()}
                className="mt-3 bg-blue-600 hover:bg-blue-700 text-white w-full"
              >
                {isLoading ? 'Création...' : 'Créer'}
              </Button>
            </div>
          </div>
        </>
      )}

      <Modal
        isOpen={isEditBoardOpen}
        onClose={() => setIsEditBoardOpen(false)}
        title="Modifier le board"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Nom"
            value={boardName}
            onChange={(e) => setBoardName(e.target.value)}
            placeholder="Nom du board"
            disabled={isSavingBoard}
          />

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={boardDescription}
              onChange={(e) => setBoardDescription(e.target.value)}
              placeholder="Description (optionnel)"
              className="w-full min-h-[100px] rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isSavingBoard}
            />
            <p className="mt-1 text-xs text-gray-500">Laissez vide pour supprimer la description.</p>
          </div>

          <Input
            label="Background"
            value={boardBackground}
            onChange={(e) => setBoardBackground(e.target.value)}
            placeholder="Ex: linear-gradient(to br, #2563eb, #7c3aed)"
            disabled={isSavingBoard}
          />
          <p className="text-xs text-gray-500">
            Valeur CSS (utilisée comme propriété <span className="font-mono">background</span>). Laissez vide pour revenir au fond par défaut.
          </p>

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setIsEditBoardOpen(false)}
              disabled={isSavingBoard}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSaveBoard}
              disabled={isSavingBoard || !boardName.trim()}
              isLoading={isSavingBoard}
            >
              Enregistrer
            </Button>
          </div>
        </div>
      </Modal>

      <InviteMemberModal
        isOpen={isInviteMemberOpen}
        onClose={() => setIsInviteMemberOpen(false)}
        boardId={boardId}
        onMemberAdded={handleMemberAdded}
      />

      <Modal
        isOpen={isMembersOpen}
        onClose={() => setIsMembersOpen(false)}
        title="Membres du board"
        size="lg"
      >
        <BoardMembersList
          boardId={boardId}
          currentUserId={currentUserId}
          onRefresh={membersRefreshKey}
        />
      </Modal>
    </div>
  );
}
