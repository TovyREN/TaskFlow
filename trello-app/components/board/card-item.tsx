'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CardModal } from './card-modal';
import type { Card } from '@/types/list';

interface CardItemProps {
  card: Card;
}

export function CardItem({ card }: CardItemProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: card.id,
    data: {
      type: 'card',
      card,
    }
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
        {...attributes}
        {...listeners}
        onClick={() => setIsModalOpen(true)}
        className="bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
      >
        <p className="text-sm text-gray-800">{card.title}</p>
        {card.description && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{card.description}</p>
        )}
        
        <div className="flex items-center gap-2 mt-2">
          {card.due_date && (
            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
              📅 {new Date(card.due_date).toLocaleDateString('fr-FR')}
            </span>
          )}
        </div>
      </div>

      {isModalOpen && (
        <CardModal
          card={card}
          onClose={handleCloseModal}
        />
      )}
    </>
  );
}
