'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createList } from '@/actions/list-actions';
import { Button } from '@/components/ui/button';

interface AddListButtonProps {
  boardId: string;
}

export function AddListButton({ boardId }: AddListButtonProps) {
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);
  const [listTitle, setListTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!listTitle.trim()) return;

    setIsLoading(true);
    try {
      await createList(boardId, listTitle.trim());
      setListTitle('');
      setIsAdding(false);
      router.refresh();
    } catch (error) {
      console.error('Error creating list:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isAdding) {
    return (
      <div className="bg-gray-100 rounded-lg p-3 w-72 flex-shrink-0 text-gray-800">
        <form onSubmit={handleSubmit}>
          <input
            autoFocus
            type="text"
            value={listTitle}
            onChange={(e) => setListTitle(e.target.value)}
            placeholder="Entrez le titre de la liste..."
            className="w-full p-2 text-sm border rounded text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
            disabled={isLoading}
          />
          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={isLoading || !listTitle.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? 'Ajout...' : 'Ajouter'}
            </Button>
            <Button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setListTitle('');
              }}
              disabled={isLoading}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800"
            >
              Annuler
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsAdding(true)}
      className="bg-white/20 hover:bg-white/30 rounded-lg p-3 w-72 flex-shrink-0 text-white font-medium transition-colors"
    >
      + Ajouter une liste
    </button>
  );
}
