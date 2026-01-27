'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDroppable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { createCard } from '@/actions/list-actions';
import { Button } from '@/components/ui/button';
import { CardItem } from '@/components/board/card-item';
import { ListMenu } from './list-menu';
import type { Card } from '@/types/list';

interface BoardListProps {
  boardId: string;
  list: {
    id: string;
    title: string;
    background: string | null;
    board_id: string;
  };
  cards: Card[];
  isOverlay?: boolean;
  canEdit?: boolean;
}

export function BoardList({ boardId, list, cards, isOverlay = false, canEdit = true }: BoardListProps) {
  const router = useRouter();

  const { setNodeRef: setCardsDropRef } = useDroppable({
    id: `list-drop-${list.id}`,
    data: {
      type: 'list-drop',
      listId: list.id,
    },
  });

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    setActivatorNodeRef,
  } = useSortable({ 
    id: list.id,
    data: {
      type: 'list',
      list,
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [cardTitle, setCardTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!cardTitle.trim()) return;

    setIsLoading(true);
    try {
      await createCard(list.id, cardTitle.trim());
      setCardTitle('');
      setIsAddingCard(false);
      router.refresh();
    } catch (error) {
      console.error('Error creating card:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const cardIds = cards.map(card => card.id);

  const backgroundColor = list.background || '#f3f4f6';

  return (
    <div 
      ref={setNodeRef} 
      style={{
        ...style,
        backgroundColor,
      }}
      className="rounded-lg p-3 w-72 flex-shrink-0"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {canEdit && (
            <button
              ref={setActivatorNodeRef}
              type="button"
              aria-label="Déplacer la liste"
              className="text-gray-500 hover:text-gray-700 p-1 hover:bg-gray-200 rounded cursor-move"
              {...attributes}
              {...listeners}
              onClick={(e) => e.stopPropagation()}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 6h.01M8 12h.01M8 18h.01M12 6h.01M12 12h.01M12 18h.01M16 6h.01M16 12h.01M16 18h.01"
                />
              </svg>
            </button>
          )}

          <h3 className="font-semibold text-gray-800 flex-1 truncate">
            {list.title}
          </h3>
        </div>
        {canEdit && (
          <div className="relative">
            <button 
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => setShowMenu(!showMenu)}
              className="text-gray-500 hover:text-gray-700 p-1 hover:bg-gray-200 rounded"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
            {showMenu && (
              <ListMenu
                listId={list.id}
                currentTitle={list.title}
                currentBackground={list.background}
                onClose={() => setShowMenu(false)}
              />
            )}
          </div>
        )}
      </div>

      <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
        <div className={`space-y-2 mb-2 max-h-[calc(100vh-300px)] overflow-y-auto min-h-[50px] rounded p-2 transition-colors ${
          isOverlay ? 'bg-blue-50 ring-2 ring-blue-400 ring-inset' : ''
        }`} ref={setCardsDropRef}>
          {cards.map((card) => (
            <CardItem key={card.id} card={card} boardId={boardId} listTitle={list.title} canEdit={canEdit} />
          ))}
          {cards.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">
              Déposez une carte ici
            </div>
          )}
        </div>
      </SortableContext>

      {isAddingCard ? (
        <form onSubmit={handleAddCard} className="mt-2">
          <textarea
            autoFocus
            value={cardTitle}
            onChange={(e) => setCardTitle(e.target.value)}
            placeholder="Entrez un titre pour cette carte..."
            className="w-full p-2 text-sm border rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            disabled={isLoading}
          />
          <div className="flex gap-2 mt-2">
            <Button
              type="submit"
              disabled={isLoading || !cardTitle.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? 'Ajout...' : 'Ajouter'}
            </Button>
            <Button
              type="button"
              onClick={() => {
                setIsAddingCard(false);
                setCardTitle('');
              }}
              disabled={isLoading}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800"
            >
              Annuler
            </Button>
          </div>
        </form>
      ) : canEdit ? (
        <button
          onClick={() => setIsAddingCard(true)}
          className="w-full text-left text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded p-2 transition-colors"
        >
          + Ajouter une carte
        </button>
      ) : null}
    </div>
  );
}
