'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateCard, deleteCard } from '@/actions/list-actions';
import {
  addCardComment,
  addChecklistItem,
  createBoardLabel,
  createChecklist,
  deleteChecklist,
  deleteChecklistItem,
  getBoardLabels,
  getBoardMembers,
  getCardChecklists,
  getCardComments,
  toggleCardAssignee,
  toggleCardLabel,
  toggleChecklistItem,
} from '@/actions/card-actions';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import type { Card } from '@/types/list';

interface CardModalProps {
  card: Card;
  boardId: string;
  listTitle: string;
  onClose: () => void;
}

export function CardModal({ card, boardId, listTitle, onClose }: CardModalProps) {
  const router = useRouter();
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || '');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Sidebar panels
  const [activePanel, setActivePanel] = useState<null | 'members' | 'labels' | 'dates'>(null);

  // Due date (YYYY-MM-DD)
  const [dueDate, setDueDate] = useState<string>(() => {
    if (!card.due_date) return '';
    const d = new Date(card.due_date);
    // Convert to yyyy-mm-dd for input[type=date]
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  // Labels
  const [labels, setLabels] = useState<Array<{ id: string; name: string; color: string }>>([]);
  const [selectedLabelIds, setSelectedLabelIds] = useState<Set<string>>(
    () => new Set((card.labels || []).map((l) => l.id))
  );

  // Members
  const [members, setMembers] = useState<Array<{ id: string; email: string; name: string | null; avatar: string | null; role: string }>>([]);
  const [assignedUserIds, setAssignedUserIds] = useState<Set<string>>(
    () => new Set((card.assignees || []).map((a) => a.id))
  );

  // Checklists
  type ChecklistItem = { id: string; checklist_id: string; title: string; completed: boolean };
  type Checklist = { id: string; card_id: string; title: string; position: number; items: ChecklistItem[] };
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [newItemByChecklist, setNewItemByChecklist] = useState<Record<string, string>>({});

  // Comments
  type Comment = {
    id: string;
    card_id: string;
    user_id: string;
    content: string;
    created_at: string;
    user: { id: string; email: string; name: string | null; avatar: string | null };
  };
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');

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
    let cancelled = false;
    (async () => {
      try {
        const [boardLabels, boardMembers, cardChecklists, cardComments] = await Promise.all([
          getBoardLabels(boardId),
          getBoardMembers(boardId),
          getCardChecklists(card.id),
          getCardComments(card.id),
        ]);

        if (cancelled) return;
        setLabels(boardLabels);
        setMembers(boardMembers);
        setChecklists(cardChecklists as any);
        setComments(cardComments as any);
      } catch (error) {
        console.error('Error loading card modal data:', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [boardId, card.id]);

  const handleSaveTitle = async () => {
    if (!title.trim()) return;
    
    setIsLoading(true);
    try {
      await updateCard(card.id, { title: title.trim() });
      setIsEditingTitle(false);
      router.refresh();
    } catch (error) {
      console.error('Error updating title:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveDueDate = async () => {
    setIsLoading(true);
    try {
      const iso = dueDate ? new Date(`${dueDate}T00:00:00.000Z`).toISOString() : null;
      await updateCard(card.id, { due_date: iso });
      router.refresh();
    } catch (error) {
      console.error('Error updating due date:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearDueDate = async () => {
    setDueDate('');
    setIsLoading(true);
    try {
      await updateCard(card.id, { due_date: null });
      router.refresh();
    } catch (error) {
      console.error('Error clearing due date:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleLabel = async (labelId: string) => {
    setIsLoading(true);
    try {
      await toggleCardLabel(boardId, card.id, labelId);
      setSelectedLabelIds((prev) => {
        const next = new Set(prev);
        if (next.has(labelId)) next.delete(labelId);
        else next.add(labelId);
        return next;
      });
      router.refresh();
    } catch (error) {
      console.error('Error toggling label:', error);
    } finally {
      setIsLoading(false);
    }
  };



  const handleToggleAssignee = async (userId: string) => {
    setIsLoading(true);
    try {
      await toggleCardAssignee(boardId, card.id, userId);
      setAssignedUserIds((prev) => {
        const next = new Set(prev);
        if (next.has(userId)) next.delete(userId);
        else next.add(userId);
        return next;
      });
      router.refresh();
    } catch (error) {
      console.error('Error toggling assignee:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateChecklist = async () => {
    if (!newChecklistTitle.trim()) return;
    setIsLoading(true);
    try {
      const created = await createChecklist(boardId, card.id, newChecklistTitle.trim());
      setChecklists((prev) => [...prev, { ...(created as any), items: [] }]);
      setNewChecklistTitle('');
      router.refresh();
    } catch (error) {
      console.error('Error creating checklist:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddChecklistItem = async (checklistId: string) => {
    const title = (newItemByChecklist[checklistId] || '').trim();
    if (!title) return;
    setIsLoading(true);
    try {
      const item = await addChecklistItem(boardId, checklistId, title);
      setChecklists((prev) =>
        prev.map((cl) => (cl.id === checklistId ? { ...cl, items: [...cl.items, item as any] } : cl))
      );
      setNewItemByChecklist((prev) => ({ ...prev, [checklistId]: '' }));
      router.refresh();
    } catch (error) {
      console.error('Error adding checklist item:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleChecklistItem = async (itemId: string, completed: boolean) => {
    setIsLoading(true);
    try {
      await toggleChecklistItem(boardId, itemId, completed);
      setChecklists((prev) =>
        prev.map((cl) => ({
          ...cl,
          items: cl.items.map((it) => (it.id === itemId ? { ...it, completed } : it)),
        }))
      );
      router.refresh();
    } catch (error) {
      console.error('Error toggling checklist item:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteChecklistItem = async (itemId: string) => {
    setIsLoading(true);
    try {
      await deleteChecklistItem(boardId, itemId);
      setChecklists((prev) =>
        prev.map((cl) => ({
          ...cl,
          items: cl.items.filter((it) => it.id !== itemId),
        }))
      );
      router.refresh();
    } catch (error) {
      console.error('Error deleting checklist item:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteChecklist = async (checklistId: string) => {
    setIsLoading(true);
    try {
      await deleteChecklist(boardId, checklistId);
      setChecklists((prev) => prev.filter((cl) => cl.id !== checklistId));
      router.refresh();
    } catch (error) {
      console.error('Error deleting checklist:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddComment = async () => {
    const content = newComment.trim();
    if (!content) return;
    setIsLoading(true);
    try {
      const created = await addCardComment(boardId, card.id, content);
      setComments((prev) => [created as any, ...prev]);
      setNewComment('');
      router.refresh();
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedLabels = useMemo(() => {
    const byId = new Map(labels.map((l) => [l.id, l] as const));
    return Array.from(selectedLabelIds)
      .map((id) => byId.get(id))
      .filter(Boolean) as Array<{ id: string; name: string; color: string }>;
  }, [labels, selectedLabelIds]);

  const handleSaveDescription = async () => {
    setIsLoading(true);
    try {
      const desc = description.trim();
      await updateCard(card.id, { description: desc || undefined });
      setIsEditingDescription(false);
      router.refresh();
    } catch (error) {
      console.error('Error updating description:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette carte ?')) return;
    
    setIsLoading(true);
    try {
      await deleteCard(card.id);
      router.refresh();
      onClose();
    } catch (error) {
      console.error('Error deleting card:', error);
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} size="2xl">
      <div className="max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-gray-600 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            
            <div className="flex-1">
              {isEditingTitle ? (
                <div>
                  <input
                    autoFocus
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={handleSaveTitle}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveTitle();
                      if (e.key === 'Escape') {
                        setTitle(card.title);
                        setIsEditingTitle(false);
                      }
                    }}
                    className="w-full text-xl font-semibold border-2 border-blue-500 rounded px-2 py-1 text-gray-900 focus:outline-none"
                    disabled={isLoading}
                  />
                </div>
              ) : (
                <h2
                  onClick={() => setIsEditingTitle(true)}
                  className="text-xl font-semibold text-gray-800 hover:bg-gray-100 px-2 py-1 rounded cursor-pointer"
                >
                  {card.title}
                </h2>
              )}
              <p className="text-sm text-gray-500 mt-1">
                dans la liste <span className="font-medium">{listTitle}</span>
              </p>
            </div>

            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 p-1"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-3 gap-6">
            {/* Main content */}
            <div className="col-span-2 space-y-6">
              {/* Badges summary */}
              <div className="flex flex-wrap gap-2">
                {!!selectedLabels.length && (
                  <div className="flex flex-wrap gap-1">
                    {selectedLabels.slice(0, 8).map((l) => {
                      const cls = labelOptions.find((o) => o.value === l.color)?.className || 'bg-gray-400';
                      return (
                        <span key={l.id} className={`${cls} text-white text-[11px] px-2 py-1 rounded`}>
                          {l.name}
                        </span>
                      );
                    })}
                  </div>
                )}

                {dueDate && (
                  <span className="text-[11px] bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Échéance : {new Date(`${dueDate}T00:00:00.000Z`).toLocaleDateString('fr-FR')}</span>
                )}
              </div>

              {/* Description */}
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-800">Description</h3>
                </div>

                {isEditingDescription ? (
                  <div>
                    <textarea
                      autoFocus
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Ajouter une description plus détaillée..."
                      className="w-full min-h-[120px] p-3 border-2 border-blue-500 rounded resize-none text-gray-900 focus:outline-none"
                      disabled={isLoading}
                    />
                    <div className="flex gap-2 mt-2">
                      <Button
                        onClick={handleSaveDescription}
                        disabled={isLoading}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {isLoading ? 'Enregistrement...' : 'Enregistrer'}
                      </Button>
                      <Button
                        onClick={() => {
                          setDescription(card.description || '');
                          setIsEditingDescription(false);
                        }}
                        disabled={isLoading}
                        className="bg-gray-300 hover:bg-gray-400 text-gray-800"
                      >
                        Annuler
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => setIsEditingDescription(true)}
                    className="min-h-[60px] p-3 bg-gray-50 hover:bg-gray-100 rounded cursor-pointer transition-colors"
                  >
                    {card.description ? (
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{card.description}</p>
                    ) : (
                      <p className="text-sm text-gray-500">Ajouter une description plus détaillée...</p>
                    )}
                  </div>
                )}
              </div>

              {/* Activity / Comments */}
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-800">Activité</h3>
                </div>

                <div className="space-y-3">
                  <div className="bg-gray-50 rounded p-3">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Écrire un commentaire..."
                      className="w-full min-h-[80px] p-2 border rounded resize-none text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isLoading}
                    />
                    <Button
                      onClick={handleAddComment}
                      disabled={isLoading || !newComment.trim()}
                      className="mt-2 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {isLoading ? 'Enregistrement...' : 'Enregistrer'}
                    </Button>
                  </div>

                  {!!comments.length && (
                    <div className="space-y-3">
                      {comments.map((c) => (
                        <div key={c.id} className="bg-white border rounded p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-sm font-medium text-gray-800">
                              {c.user.name || c.user.email}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(c.created_at).toLocaleString('fr-FR')}
                            </div>
                          </div>
                          <div className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{c.content}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Checklists */}
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5h12M9 12h12M9 19h12M5 5h.01M5 12h.01M5 19h.01" />
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-800">Checklists</h3>
                </div>

                <div className="flex gap-2">
                  <input
                    value={newChecklistTitle}
                    onChange={(e) => setNewChecklistTitle(e.target.value)}
                    placeholder="Titre de la checklist..."
                    className="flex-1 p-2 border rounded text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                  />
                  <Button
                    onClick={handleCreateChecklist}
                    disabled={isLoading || !newChecklistTitle.trim()}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Ajouter
                  </Button>
                </div>

                <div className="space-y-4 mt-4">
                  {checklists.map((cl) => {
                    const total = cl.items.length;
                    const completed = cl.items.filter((i) => i.completed).length;
                    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

                    return (
                      <div key={cl.id} className="border rounded p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="font-semibold text-gray-800">{cl.title}</div>
                            <div className="text-xs text-gray-500">{completed}/{total} • {progress}%</div>
                          </div>
                          <button
                            onClick={() => handleDeleteChecklist(cl.id)}
                            disabled={isLoading}
                            className="text-sm text-red-600 hover:text-red-700"
                          >
                            Supprimer
                          </button>
                        </div>

                        {total > 0 && (
                          <div className="h-2 bg-gray-200 rounded mt-2 overflow-hidden">
                            <div className="h-2 bg-green-500" style={{ width: `${progress}%` }} />
                          </div>
                        )}

                        <div className="space-y-2 mt-3">
                          {cl.items.map((it) => (
                            <div key={it.id} className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={it.completed}
                                onChange={(e) => handleToggleChecklistItem(it.id, e.target.checked)}
                                disabled={isLoading}
                              />
                                  <div className={`flex-1 text-sm ${it.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                                {it.title}
                              </div>
                              <button
                                onClick={() => handleDeleteChecklistItem(it.id)}
                                disabled={isLoading}
                                className="text-xs text-gray-500 hover:text-red-600"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>

                        <div className="flex gap-2 mt-3">
                          <input
                            value={newItemByChecklist[cl.id] || ''}
                            onChange={(e) => setNewItemByChecklist((prev) => ({ ...prev, [cl.id]: e.target.value }))}
                            placeholder="Ajouter un élément..."
                            className="flex-1 p-2 border rounded text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={isLoading}
                          />
                          <Button
                            onClick={() => handleAddChecklistItem(cl.id)}
                            disabled={isLoading || !(newItemByChecklist[cl.id] || '').trim()}
                            className="bg-gray-900 hover:bg-gray-800 text-white"
                          >
                            Ajouter
                          </Button>
                        </div>
                      </div>
                    );
                  })}

                  {checklists.length === 0 && (
                    <div className="text-sm text-gray-500">Aucune checklist pour le moment.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar actions */}
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-600 mb-2">AJOUTER À LA CARTE</h4>
                <div className="space-y-2">
                  <button
                    onClick={() => setActivePanel((p) => (p === 'members' ? null : 'members'))}
                    className="w-full text-left px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium transition-colors"
                  >
                    Membres
                  </button>
                  <button
                    onClick={() => setActivePanel((p) => (p === 'labels' ? null : 'labels'))}
                    className="w-full text-left px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium transition-colors"
                  >
                    Étiquettes
                  </button>
                  <button
                    onClick={() => setActivePanel((p) => (p === 'dates' ? null : 'dates'))}
                    className="w-full text-left px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium transition-colors"
                  >
                    Dates
                  </button>
                </div>

                {activePanel === 'members' && (
                  <div className="mt-3 border rounded p-3 bg-white">
                    <div className="text-xs font-semibold text-gray-600 mb-2">Membres</div>
                    <div className="space-y-2">
                      {members.map((m) => {
                        const checked = assignedUserIds.has(m.id);
                        return (
                          <label key={m.id} className="flex items-center gap-2 text-sm text-gray-800 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handleToggleAssignee(m.id)}
                              disabled={isLoading}
                            />
                            <span className="flex-1">{m.name || m.email}</span>
                            <span className="text-xs text-gray-500">{m.role}</span>
                          </label>
                        );
                      })}
                      {members.length === 0 && <div className="text-sm text-gray-500">Aucun membre.</div>}
                    </div>
                  </div>
                )}

                {activePanel === 'labels' && (
                  <div className="mt-3 border rounded p-3 bg-white">
                    <div className="text-xs font-semibold text-gray-600 mb-2">Étiquettes</div>

                    <div className="space-y-2">
                      {labels.map((l) => {
                        const checked = selectedLabelIds.has(l.id);
                        const cls = labelOptions.find((o) => o.value === l.color)?.className || 'bg-gray-400';
                        return (
                          <label key={l.id} className="flex items-center gap-2 text-sm text-gray-800 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handleToggleLabel(l.id)}
                              disabled={isLoading}
                            />
                            <span className={`h-3 w-8 rounded ${cls}`} />
                            <span className="flex-1">{l.name}</span>
                          </label>
                        );
                      })}
                      {labels.length === 0 && <div className="text-sm text-gray-500">Aucune étiquette sur ce board.</div>}
                    </div>

                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-gray-600">
                        Pour créer de nouvelles étiquettes, utilisez le menu du board.
                      </p>
                    </div>
                  </div>
                )}

                {activePanel === 'dates' && (
                  <div className="mt-3 border rounded p-3 bg-white">
                    <div className="text-xs font-semibold text-gray-600 mb-2">Date d'échéance</div>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full p-2 border rounded text-gray-900"
                      disabled={isLoading}
                    />
                    <div className="flex gap-2 mt-2">
                      <Button
                        onClick={handleSaveDueDate}
                        disabled={isLoading}
                        className="bg-blue-600 hover:bg-blue-700 text-white flex-1"
                      >
                        Enregistrer
                      </Button>
                      <Button
                        onClick={handleClearDueDate}
                        disabled={isLoading}
                        className="bg-gray-300 hover:bg-gray-400 text-gray-800"
                      >
                        Effacer
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-600 mb-2">ACTIONS</h4>
                <div className="space-y-2">
                  <button className="w-full text-left px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium transition-colors">
                    Déplacer
                  </button>
                  <button className="w-full text-left px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium transition-colors">
                    Copier
                  </button>
                  <button className="w-full text-left px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium transition-colors">
                    Archiver
                  </button>
                  <button 
                    onClick={handleDelete}
                    disabled={isLoading}
                    className="w-full text-left px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded text-sm font-medium transition-colors"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

