'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CardModal } from './card-modal';
import type { Card } from '@/types/list';

interface CardItemProps {
  card: Card;
  boardId: string;
  listTitle: string;
}

function getInitials(nameOrEmail: string): string {
  const trimmed = nameOrEmail.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || '?';
  const second = (parts.length > 1 ? parts[parts.length - 1]?.[0] : parts[0]?.[1]) || '';
  return (first + second).toUpperCase();
}

function labelColorClass(color: string): string {
  // Minimal Trello-like palette mapped to Tailwind tokens
  switch (color) {
    case 'green':
      return 'bg-green-500';
    case 'yellow':
      return 'bg-yellow-400';
    case 'orange':
      return 'bg-orange-500';
    case 'red':
      return 'bg-red-500';
    case 'purple':
      return 'bg-purple-500';
    case 'blue':
      return 'bg-blue-500';
    case 'sky':
      return 'bg-sky-500';
    case 'lime':
      return 'bg-lime-500';
    case 'pink':
      return 'bg-pink-500';
    case 'gray':
    default:
      return 'bg-gray-400';
  }
}

export function CardItem({ card, boardId, listTitle }: CardItemProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: {
      type: 'card',
      card,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    router.refresh();
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        onClick={() => setIsModalOpen(true)}
        className="bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {!!card.labels?.length && (
              <div className="flex flex-wrap gap-1 mb-2">
                {card.labels.slice(0, 4).map((label) => (
                  <span
                    key={label.id}
                    className={`h-2 w-10 rounded ${labelColorClass(label.color)}`}
                    title={label.name}
                  />
                ))}
              </div>
            )}

            <p className="text-sm text-gray-800 break-words">{card.title}</p>
            {card.description && (
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{card.description}</p>
            )}
          </div>

          <button
            type="button"
            aria-label="Déplacer la carte"
            className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-grab"
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6h.01M10 12h.01M10 18h.01M14 6h.01M14 12h.01M14 18h.01"
              />
            </svg>
          </button>
        </div>

        <div className="flex items-center justify-between gap-2 mt-2">
          <div className="flex items-center gap-2 flex-wrap">
            {card.due_date && (
              <span className="text-[11px] bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                📅 {new Date(card.due_date).toLocaleDateString('fr-FR')}
              </span>
            )}

            {card.checklist && card.checklist.total > 0 && (
              <span className="text-[11px] bg-gray-100 text-gray-700 px-2 py-1 rounded" title="Checklist">
                ✅ {card.checklist.completed}/{card.checklist.total}
              </span>
            )}

            {typeof card.commentsCount === 'number' && card.commentsCount > 0 && (
              <span className="text-[11px] bg-gray-100 text-gray-700 px-2 py-1 rounded" title="Commentaires">
                💬 {card.commentsCount}
              </span>
            )}
          </div>

          {!!card.assignees?.length && (
            <div className="flex -space-x-1">
              {card.assignees.slice(0, 3).map((u) => {
                const display = u.name || u.email;
                return (
                  <div
                    key={u.id}
                    title={display}
                    className="h-6 w-6 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center ring-2 ring-white"
                  >
                    {getInitials(display)}
                  </div>
                );
              })}
              {card.assignees.length > 3 && (
                <div className="h-6 w-6 rounded-full bg-gray-600 text-white text-[10px] flex items-center justify-center ring-2 ring-white">
                  +{card.assignees.length - 3}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <CardModal card={card} boardId={boardId} listTitle={listTitle} onClose={handleCloseModal} />
      )}
    </>
  );
}
