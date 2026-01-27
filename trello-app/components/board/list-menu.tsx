'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateList, deleteList } from '@/actions/list-actions';
import { Button } from '@/components/ui/button';

interface ListMenuProps {
  listId: string;
  currentTitle: string;
  currentBackground: string | null;
  onClose: () => void;
}

const BACKGROUND_COLORS = [
  { name: 'Aucun', value: null },
  { name: 'Bleu', value: '#0079bf' },
  { name: 'Vert', value: '#61bd4f' },
  { name: 'Orange', value: '#ff9f1a' },
  { name: 'Rouge', value: '#eb5a46' },
  { name: 'Violet', value: '#c377e0' },
  { name: 'Rose', value: '#ff78cb' },
  { name: 'Gris', value: '#b3bac5' },
];

export function ListMenu({ listId, currentTitle, currentBackground, onClose }: ListMenuProps) {
  const router = useRouter();
  const [title, setTitle] = useState(currentTitle);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleUpdateTitle = async () => {
    if (!title.trim() || title === currentTitle) {
      setIsEditingTitle(false);
      return;
    }

    setIsLoading(true);
    try {
      await updateList(listId, title.trim());
      setIsEditingTitle(false);
      router.refresh();
      onClose();
    } catch (error) {
      console.error('Error updating list:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateBackground = async (background: string | null) => {
    setIsLoading(true);
    try {
      await updateList(listId, currentTitle, background);
      setShowColorPicker(false);
      router.refresh();
      onClose();
    } catch (error) {
      console.error('Error updating background:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette liste et toutes ses cartes ?')) return;

    setIsLoading(true);
    try {
      await deleteList(listId);
      router.refresh();
      onClose();
    } catch (error) {
      console.error('Error deleting list:', error);
      setIsLoading(false);
    }
  };

  return (
    <div className="absolute top-10 right-0 z-50 w-72 bg-white rounded-lg shadow-xl border border-gray-200">
      <div className="p-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Actions de la liste</h3>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="p-2">
        {!showColorPicker ? (
          <>
            {isEditingTitle ? (
              <div className="p-2">
                <input
                  autoFocus
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleUpdateTitle();
                    if (e.key === 'Escape') {
                      setTitle(currentTitle);
                      setIsEditingTitle(false);
                    }
                  }}
                  className="w-full px-3 py-2 border rounded text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                />
                <div className="flex gap-2 mt-2">
                  <Button
                    onClick={handleUpdateTitle}
                    disabled={isLoading}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm"
                  >
                    Enregistrer
                  </Button>
                  <Button
                    onClick={() => {
                      setTitle(currentTitle);
                      setIsEditingTitle(false);
                    }}
                    disabled={isLoading}
                    className="bg-gray-300 hover:bg-gray-400 text-gray-800 text-sm"
                  >
                    Annuler
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <button
                  onClick={() => setIsEditingTitle(true)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-sm"
                >
                  ✏️ Modifier le titre
                </button>
                <button
                  onClick={() => setShowColorPicker(true)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-sm"
                >
                  🎨 Changer la couleur
                </button>
                <button
                  onClick={() => {/* TODO: Copy list */}}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-sm"
                >
                  📋 Copier la liste
                </button>
                <hr className="my-2" />
                <button
                  onClick={handleDelete}
                  disabled={isLoading}
                  className="w-full text-left px-3 py-2 hover:bg-red-100 text-red-600 rounded text-sm"
                >
                  🗑️ Supprimer la liste
                </button>
              </>
            )}
          </>
        ) : (
          <div className="p-2">
            <button
              onClick={() => setShowColorPicker(false)}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 mb-3"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Retour
            </button>
            <div className="grid grid-cols-4 gap-2">
              {BACKGROUND_COLORS.map((color) => (
                <button
                  key={color.name}
                  onClick={() => handleUpdateBackground(color.value)}
                  disabled={isLoading}
                  className={`h-12 rounded hover:opacity-80 transition-opacity ${
                    currentBackground === color.value ? 'ring-2 ring-blue-500' : ''
                  }`}
                  style={{
                    backgroundColor: color.value || '#f3f4f6',
                  }}
                  title={color.name}
                >
                  {!color.value && <span className="text-xs text-gray-500">Aucun</span>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
