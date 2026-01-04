'use client';

import { useState, useEffect } from 'react';
import { 
  DndContext, 
  DragEndEvent, 
  DragOverlay, 
  DragStartEvent, 
  DragOverEvent,
  PointerSensor,
  useSensor,
  useSensors,
  type CollisionDetection,
  closestCenter,
  pointerWithin,
  rectIntersection
} from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { BoardList } from './board-list';
import { AddListButton } from './add-list-button';
import { moveList, moveCard } from '@/actions/list-actions';
import type { List, Card } from '@/types/list';

interface BoardContentProps {
  boardId: string;
  listsWithCards: Array<{
    list: List;
    cards: Card[];
  }>;
}

export function BoardContent({ boardId, listsWithCards }: BoardContentProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [items, setItems] = useState(listsWithCards);
  const [overId, setOverId] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Monter uniquement côté client pour éviter les erreurs d'hydratation avec dnd-kit
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Synchroniser l'état local avec les props lorsqu'elles changent (après un refresh)
  useEffect(() => {
    setItems(listsWithCards);
  }, [listsWithCards]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    setOverId(over ? over.id as string : null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    setOverId(null);
    
    if (!over || active.id === over.id) {
      setActiveId(null);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;
    
    // Déterminer le type d'élément actif
    const activeType = active.data.current?.type;
    const overType = over.data.current?.type;

    // Déplacement de liste
    if (activeType === 'list' && overType === 'list') {
      const oldIndex = items.findIndex(item => item.list.id === activeId);
      const newIndex = items.findIndex(item => item.list.id === overId);

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const newItems = [...items];
        const [removed] = newItems.splice(oldIndex, 1);
        newItems.splice(newIndex, 0, removed);
        setItems(newItems);

        try {
          await moveList(activeId, newIndex);
        } catch (error) {
          console.error('Error moving list:', error);
          setItems(items);
        }
      }
    } 
    // Déplacement de carte
    else if (activeType === 'card') {
      const sourceList = items.find(item => 
        item.cards.some(card => card.id === activeId)
      );
      
      if (!sourceList) {
        setActiveId(null);
        return;
      }

      // Trouver la liste cible
      let targetList = items.find(item => 
        item.cards.some(card => card.id === overId)
      );
      
      // Si pas trouvée, c'est peut-être l'ID de la liste elle-même
      if (!targetList) {
        targetList = items.find(item => item.list.id === overId);
      }

      if (!targetList) {
        setActiveId(null);
        return;
      }

      const isSameList = sourceList.list.id === targetList.list.id;
      const sourceCards = [...sourceList.cards];
      const targetCards = isSameList ? sourceCards : [...targetList.cards];

      const activeCard = sourceCards.find(card => card.id === activeId);
      if (!activeCard) {
        setActiveId(null);
        return;
      }

      // Retirer la carte de la liste source
      const activeIndex = sourceCards.findIndex(card => card.id === activeId);
      sourceCards.splice(activeIndex, 1);

      // Trouver la position dans la liste cible
      let overIndex = targetCards.findIndex(card => card.id === overId);
      if (overIndex === -1) {
        overIndex = targetCards.length;
      }

      // Insérer la carte dans la liste cible
      targetCards.splice(overIndex, 0, activeCard);

      // Mettre à jour l'état
      const newItems = items.map(item => {
        if (item.list.id === sourceList.list.id && isSameList) {
          return { ...item, cards: targetCards };
        } else if (item.list.id === sourceList.list.id) {
          return { ...item, cards: sourceCards };
        } else if (item.list.id === targetList.list.id) {
          return { ...item, cards: targetCards };
        }
        return item;
      });

      setItems(newItems);

      try {
        await moveCard(activeId, targetList.list.id, overIndex);
      } catch (error) {
        console.error('Error moving card:', error);
        setItems(items);
      }
    }

    setActiveId(null);
  };

  const listIds = items.map(item => item.list.id);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Prevent simple clicks from activating drag
      activationConstraint: { distance: 6 },
    })
  );

  // Collision detection personnalisée:
  // - Pendant le drag d'une liste, on ne considère QUE les droppables de type "list".
  //   Sinon "over" devient une carte, et le drop ne déclenche jamais le reorder des listes.
  // - Pendant le drag d'une carte, on garde une détection plus permissive.
  const customCollisionDetection: CollisionDetection = (args) => {
    const activeType = args.active.data.current?.type;

    if (activeType === 'list') {
      const listDroppables = args.droppableContainers.filter(
        (container) => container.data.current?.type === 'list'
      );

      return closestCenter({
        ...args,
        droppableContainers: listDroppables,
      });
    }

    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) {
      return pointerCollisions;
    }

    return rectIntersection(args);
  };

  // Afficher un loader pendant l'hydratation pour éviter les erreurs
  if (!isMounted) {
    return (
      <div className="p-6 overflow-x-auto">
        <div className="flex gap-4 pb-6">
          {items.map(({ list, cards }) => (
            <div 
              key={list.id}
              className="rounded-lg p-3 w-72 flex-shrink-0"
              style={{ backgroundColor: list.background || '#f3f4f6' }}
            >
              <h3 className="font-semibold text-gray-800 mb-3">{list.title}</h3>
              <div className="space-y-2 mb-2">
                {cards.map((card) => (
                  <div key={card.id} className="bg-white rounded-lg p-3 shadow-sm">
                    <p className="text-sm text-gray-800">{card.title}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="w-72 flex-shrink-0">
            <AddListButton boardId={boardId} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      collisionDetection={customCollisionDetection}
    >
      <div className="p-6 overflow-x-auto">
        <div className="flex gap-4 pb-6">
          <SortableContext items={listIds} strategy={horizontalListSortingStrategy}>
            {items.map(({ list, cards }) => (
              <BoardList 
                key={list.id} 
                boardId={boardId}
                list={list} 
                cards={cards}
                isOverlay={overId === list.id}
              />
            ))}
          </SortableContext>
          
          <AddListButton boardId={boardId} />
        </div>
      </div>

      <DragOverlay>
        {activeId ? (
          (() => {
            const activeList = items.find(item => item.list.id === activeId);
            if (activeList) {
              return (
                <div 
                  className="rounded-lg p-3 w-72 shadow-2xl"
                  style={{
                    backgroundColor: activeList.list.background || '#f3f4f6',
                  }}
                >
                  <h3 className="font-semibold text-gray-800 mb-3">{activeList.list.title}</h3>
                  <div className="space-y-2">
                    {activeList.cards.slice(0, 3).map((card) => (
                      <div key={card.id} className="bg-white rounded-lg p-3 shadow-sm">
                        <p className="text-sm text-gray-800">{card.title}</p>
                      </div>
                    ))}
                    {activeList.cards.length > 3 && (
                      <p className="text-xs text-gray-500 text-center">
                        +{activeList.cards.length - 3} autres cartes
                      </p>
                    )}
                  </div>
                </div>
              );
            }
            
            const activeCard = items
              .flatMap(item => item.cards)
              .find(card => card.id === activeId);
            
            if (activeCard) {
              return (
                <div className="bg-white rounded-lg p-3 shadow-2xl w-72">
                  <p className="text-sm text-gray-800">{activeCard.title}</p>
                  {activeCard.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{activeCard.description}</p>
                  )}
                </div>
              );
            }
            
            return (
              <div className="bg-gray-100 rounded-lg p-3 w-72 opacity-50">
                Déplacement...
              </div>
            );
          })()
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
