'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBoardLabel } from '@/actions/card-actions';
import { Button } from '@/components/ui/button';

interface BoardMenuProps {
  boardId: string;
}

type LabelColor = 'green' | 'yellow' | 'orange' | 'red' | 'purple' | 'blue' | 'sky' | 'lime' | 'pink' | 'gray';

export function BoardMenu({ boardId }: BoardMenuProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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

          <div className="absolute right-0 mt-2 z-50 w-80 bg-white rounded-lg shadow-xl border border-gray-200">
            <div className="p-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">Menu du board</h3>
              <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-gray-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-3">
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
    </div>
  );
}
