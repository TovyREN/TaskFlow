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
import { SortableContext, horizontalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { BoardList } from './board-list';
import { AddListButton } from './add-list-button';
import { moveList, moveCard } from '@/actions/list-actions';
import { useErrorModal } from '@/components/ui/error-modal';
import type { List, Card } from '@/types/list';

interface BoardContentProps {
  boardId: string;
  listsWithCards: Array<{
    list: List;
    cards: Card[];
  }>;
  canEdit?: boolean;
}

export function BoardContent({ boardId, listsWithCards, canEdit = true }: BoardContentProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [items, setItems] = useState(listsWithCards);
  const [overId, setOverId] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const { showReadonlyError } = useErrorModal();

  // Monter uniquement côté client pour éviter les erreurs d'hydratation avec dnd-kit
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Synchroniser l'état local avec les props lorsqu'elles changent (après un refresh)
  useEffect(() => {
    setItems(listsWithCards);
  }, [listsWithCards]);

  const handleDragStart = (event: DragStartEvent) => {
    // Si l'utilisateur n'a pas le droit d'éditer, montrer un message et bloquer
    if (!canEdit) {
      showReadonlyError();
      return;
    }
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (!over) {
      setOverId(null);
      return;
    }

    const overType = over.data.current?.type;
    if (overType === 'list-drop') {
      setOverId(over.data.current?.listId as string);
      return;
    }

    setOverId(over.id as string);
  };

  const findCardLocation = (cardId: string): { listIndex: number; cardIndex: number } | null => {
    for (let listIndex = 0; listIndex < items.length; listIndex++) {
      const cardIndex = items[listIndex].cards.findIndex((c) => c.id === cardId);
      if (cardIndex !== -1) return { listIndex, cardIndex };
    }
    return null;
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
      const sourceLoc = findCardLocation(activeId);
      if (!sourceLoc) {
        setActiveId(null);
        return;
      }

      const overType = over.data.current?.type as string | undefined;

      // Déterminer la liste cible + index cible
      let targetListId: string | null = null;
      let targetIndex: number | null = null;

      if (overType === 'card') {
        const overLoc = findCardLocation(overId);
        if (!overLoc) {
          setActiveId(null);
          return;
        }
        targetListId = items[overLoc.listIndex].list.id;
        targetIndex = overLoc.cardIndex;
      } else if (overType === 'list-drop') {
        targetListId = (over.data.current?.listId as string) || null;
        const targetList = items.find((it) => it.list.id === targetListId);
        targetIndex = targetList ? targetList.cards.length : null;
      } else if (overType === 'list') {
        targetListId = overId;
        const targetList = items.find((it) => it.list.id === targetListId);
        targetIndex = targetList ? targetList.cards.length : null;
      } else {
        setActiveId(null);
        return;
      }

      if (!targetListId || targetIndex === null) {
        setActiveId(null);
        return;
      }

      const sourceListId = items[sourceLoc.listIndex].list.id;
      const isSameList = sourceListId === targetListId;

      // Mémoriser l'état courant pour rollback en cas d'erreur
      const previousItems = items;

      if (isSameList) {
        const cards = items[sourceLoc.listIndex].cards;

        // Si on drop sur la zone de liste (pas une carte), on met en fin.
        const resolvedIndex = overType === 'card' ? targetIndex : Math.max(0, cards.length - 1);

        if (sourceLoc.cardIndex !== resolvedIndex) {
          const newCards = arrayMove(cards, sourceLoc.cardIndex, resolvedIndex);
          const newItems = items.map((it, idx) => (idx === sourceLoc.listIndex ? { ...it, cards: newCards } : it));
          setItems(newItems);

          try {
            await moveCard(activeId, targetListId, resolvedIndex);
          } catch (error) {
            console.error('Error moving card:', error);
            setItems(previousItems);
          }
        }
      } else {
        const targetListIndex = items.findIndex((it) => it.list.id === targetListId);
        if (targetListIndex === -1) {
          setActiveId(null);
          return;
        }

        const sourceCards = [...items[sourceLoc.listIndex].cards];
        const targetCards = [...items[targetListIndex].cards];

        const [moved] = sourceCards.splice(sourceLoc.cardIndex, 1);
        targetCards.splice(targetIndex, 0, moved);

        const newItems = items.map((it, idx) => {
          if (idx === sourceLoc.listIndex) return { ...it, cards: sourceCards };
          if (idx === targetListIndex) return { ...it, cards: targetCards };
          return it;
        });

        setItems(newItems);

        try {
          await moveCard(activeId, targetListId, targetIndex);
        } catch (error) {
          console.error('Error moving card:', error);
          setItems(previousItems);
        }
      }
    }

    setActiveId(null);
  };

  const listIds = items.map(item => item.list.id);

  const SortableContextForJSX = SortableContext as unknown as (props: any) => any;
  const DragOverlayForJSX = DragOverlay as unknown as (props: any) => any;
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
        <div className="flex items-start gap-4 pb-6">
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
          {canEdit && (
            <div className="w-72 flex-shrink-0">
              <AddListButton boardId={boardId} />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Si l'utilisateur ne peut pas éditer, afficher une version statique sans drag-and-drop
  if (!canEdit) {
    return (
      <div className="p-6 overflow-x-auto">
        <div className="flex gap-4 pb-6">
          {items.map(({ list, cards }) => (
            <BoardList 
              key={list.id} 
              boardId={boardId}
              list={list} 
              cards={cards}
              isOverlay={false}
              canEdit={false}
            />
          ))}
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
      <div className="flex items-start gap-4 pb-6">
          <SortableContextForJSX items={listIds} strategy={horizontalListSortingStrategy}>
            {items.map(({ list, cards }) => (
              <BoardList 
                key={list.id} 
                boardId={boardId}
                list={list} 
                cards={cards}
                isOverlay={overId === list.id}
                canEdit={canEdit}
              />
            ))}
          </SortableContextForJSX>
          
          {canEdit && <AddListButton boardId={boardId} />}
        </div>
      </div>

      <DragOverlayForJSX>
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
  </DragOverlayForJSX>
    </DndContext>
  );
}
