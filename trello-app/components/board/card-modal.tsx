'use client';

import { useState } from 'react';
import { updateCard, deleteCard } from '@/actions/list-actions';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import type { Card } from '@/types/list';

interface CardModalProps {
  card: Card;
  onClose: () => void;
}

export function CardModal({ card, onClose }: CardModalProps) {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || '');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSaveTitle = async () => {
    if (!title.trim()) return;
    
    setIsLoading(true);
    try {
      await updateCard(card.id, { title: title.trim() });
      setIsEditingTitle(false);
    } catch (error) {
      console.error('Error updating title:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveDescription = async () => {
    setIsLoading(true);
    try {
      const desc = description.trim();
      await updateCard(card.id, { description: desc || undefined });
      setIsEditingDescription(false);
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
      onClose();
    } catch (error) {
      console.error('Error deleting card:', error);
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose}>
      <div className="w-full max-w-3xl bg-white rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
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
                    className="w-full text-xl font-semibold border-2 border-blue-500 rounded px-2 py-1 focus:outline-none"
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
                dans la liste <span className="font-medium">Liste</span>
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
                      className="w-full min-h-[120px] p-3 border-2 border-blue-500 rounded resize-none focus:outline-none"
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
                      placeholder="Écrire un commentaire..."
                      className="w-full min-h-[80px] p-2 border rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <Button className="mt-2 bg-blue-600 hover:bg-blue-700 text-white">
                      Enregistrer
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar actions */}
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-600 mb-2">AJOUTER À LA CARTE</h4>
                <div className="space-y-2">
                  <button className="w-full text-left px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium transition-colors">
                    👥 Membres
                  </button>
                  <button className="w-full text-left px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium transition-colors">
                    🏷️ Étiquettes
                  </button>
                  <button className="w-full text-left px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium transition-colors">
                    ✅ Checklist
                  </button>
                  <button className="w-full text-left px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium transition-colors">
                    📅 Dates
                  </button>
                  <button className="w-full text-left px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium transition-colors">
                    📎 Pièce jointe
                  </button>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-600 mb-2">ACTIONS</h4>
                <div className="space-y-2">
                  <button className="w-full text-left px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium transition-colors">
                    ➡️ Déplacer
                  </button>
                  <button className="w-full text-left px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium transition-colors">
                    📋 Copier
                  </button>
                  <button className="w-full text-left px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium transition-colors">
                    📦 Archiver
                  </button>
                  <button 
                    onClick={handleDelete}
                    disabled={isLoading}
                    className="w-full text-left px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded text-sm font-medium transition-colors"
                  >
                    🗑️ Supprimer
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
