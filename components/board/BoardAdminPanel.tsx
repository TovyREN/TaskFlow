"use client";

import React, { useState, useEffect } from 'react';
import { X, Palette, Tag, Plus, Trash2, Edit2, Check, Image } from 'lucide-react';
import { 
  getBoardWithLabels, 
  updateBoardSettings, 
  createBoardLabel, 
  updateBoardLabel, 
  deleteBoardLabel 
} from '../../app/actions/cardActions';

interface BoardAdminPanelProps {
  boardId: string;
  onClose: () => void;
  onBoardUpdated: () => void;
}

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#64748b'
];

const PRESET_BACKGROUNDS = [
  { type: 'color', value: '#0ea5e9', name: 'Sky Blue' },
  { type: 'color', value: '#8b5cf6', name: 'Purple' },
  { type: 'color', value: '#22c55e', name: 'Green' },
  { type: 'color', value: '#f97316', name: 'Orange' },
  { type: 'color', value: '#ec4899', name: 'Pink' },
  { type: 'color', value: '#1e293b', name: 'Slate' },
  { type: 'gradient', value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', name: 'Violet' },
  { type: 'gradient', value: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', name: 'Pink Sunset' },
  { type: 'gradient', value: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', name: 'Ocean' },
  { type: 'gradient', value: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', name: 'Mint' },
];

export default function BoardAdminPanel({ boardId, onClose, onBoardUpdated }: BoardAdminPanelProps) {
  const [board, setBoard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'background' | 'labels'>('background');
  
  // Background state
  const [customBackground, setCustomBackground] = useState('');
  const [backgroundType, setBackgroundType] = useState<'color' | 'image'>('color');
  
  // Label editing state
  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const [editLabelName, setEditLabelName] = useState('');
  const [editLabelColor, setEditLabelColor] = useState('');
  
  // New label state
  const [creatingLabel, setCreatingLabel] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#3b82f6');

  useEffect(() => {
    loadBoard();
  }, [boardId]);

  const loadBoard = async () => {
    setLoading(true);
    const data = await getBoardWithLabels(boardId);
    if (data) {
      setBoard(data);
      if (data.backgroundImage) {
        setCustomBackground(data.backgroundImage);
        setBackgroundType(data.backgroundImage.startsWith('http') ? 'image' : 'color');
      }
    }
    setLoading(false);
  };

  const handleSetBackground = async (background: string) => {
    const result = await updateBoardSettings(boardId, { backgroundImage: background });
    if (result.success) {
      setBoard((prev: any) => ({ ...prev, backgroundImage: background }));
      onBoardUpdated();
    }
  };

  const handleCreateLabel = async () => {
    if (newLabelName.trim() === '') return;
    const result = await createBoardLabel(boardId, newLabelName, newLabelColor);
    if (result.success && result.label) {
      setBoard((prev: any) => ({
        ...prev,
        labels: [...prev.labels, result.label]
      }));
      setNewLabelName('');
      setNewLabelColor('#3b82f6');
      setCreatingLabel(false);
      onBoardUpdated();
    }
  };

  const handleUpdateLabel = async (labelId: string) => {
    if (editLabelName.trim() === '') return;
    const result = await updateBoardLabel(labelId, { name: editLabelName, color: editLabelColor });
    if (result.success) {
      setBoard((prev: any) => ({
        ...prev,
        labels: prev.labels.map((l: any) =>
          l.id === labelId ? { ...l, name: editLabelName, color: editLabelColor } : l
        )
      }));
      setEditingLabel(null);
      onBoardUpdated();
    }
  };

  const handleDeleteLabel = async (labelId: string) => {
    const result = await deleteBoardLabel(labelId);
    if (result.success) {
      setBoard((prev: any) => ({
        ...prev,
        labels: prev.labels.filter((l: any) => l.id !== labelId)
      }));
      onBoardUpdated();
    }
  };

  const startEditingLabel = (label: any) => {
    setEditingLabel(label.id);
    setEditLabelName(label.name);
    setEditLabelColor(label.color);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
        <div className="bg-white rounded-xl p-8">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">Board Settings</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('background')}
            className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'background'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Palette className="w-4 h-4" />
            Background
          </button>
          <button
            onClick={() => setActiveTab('labels')}
            className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'labels'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Tag className="w-4 h-4" />
            Labels
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'background' && (
            <div className="space-y-6">
              {/* Preset Backgrounds */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Colors & Gradients</h3>
                <div className="grid grid-cols-5 gap-2">
                  {PRESET_BACKGROUNDS.map((bg, index) => (
                    <button
                      key={index}
                      onClick={() => handleSetBackground(bg.value)}
                      className={`h-16 rounded-lg transition-all hover:scale-105 hover:shadow-lg ${
                        board?.backgroundImage === bg.value ? 'ring-2 ring-blue-500 ring-offset-2' : ''
                      }`}
                      style={{
                        background: bg.value
                      }}
                      title={bg.name}
                    />
                  ))}
                </div>
              </div>

              {/* Custom Color */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Custom Color</h3>
                <div className="flex gap-3">
                  <input
                    type="color"
                    value={customBackground.startsWith('#') ? customBackground : '#3b82f6'}
                    onChange={e => setCustomBackground(e.target.value)}
                    className="w-12 h-12 rounded-lg cursor-pointer border-0"
                  />
                  <button
                    onClick={() => handleSetBackground(customBackground)}
                    disabled={!customBackground.startsWith('#')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-slate-300"
                  >
                    Apply Color
                  </button>
                </div>
              </div>

              {/* Image URL */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Image URL</h3>
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <Image className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="url"
                      placeholder="https://example.com/image.jpg"
                      value={customBackground.startsWith('http') ? customBackground : ''}
                      onChange={e => setCustomBackground(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    onClick={() => handleSetBackground(customBackground)}
                    disabled={!customBackground.startsWith('http')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-slate-300 whitespace-nowrap"
                  >
                    Apply Image
                  </button>
                </div>
              </div>

              {/* Clear Background */}
              {board?.backgroundImage && (
                <button
                  onClick={() => handleSetBackground('')}
                  className="w-full py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  Remove Background
                </button>
              )}
            </div>
          )}

          {activeTab === 'labels' && (
            <div className="space-y-4">
              {/* Existing Labels */}
              {board?.labels?.map((label: any) => (
                <div key={label.id} className="flex items-center gap-3">
                  {editingLabel === label.id ? (
                    <>
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          type="color"
                          value={editLabelColor}
                          onChange={e => setEditLabelColor(e.target.value)}
                          className="w-8 h-8 rounded cursor-pointer border-0"
                        />
                        <input
                          autoFocus
                          type="text"
                          value={editLabelName}
                          onChange={e => setEditLabelName(e.target.value)}
                          className="flex-1 px-3 py-1.5 border border-slate-300 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500"
                          onKeyDown={e => e.key === 'Enter' && handleUpdateLabel(label.id)}
                        />
                      </div>
                      <button
                        onClick={() => handleUpdateLabel(label.id)}
                        className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingLabel(null)}
                        className="p-1.5 text-slate-400 hover:bg-slate-100 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <div
                        className="h-8 rounded flex-1 flex items-center px-3"
                        style={{ backgroundColor: label.color }}
                      >
                        <span className="text-white text-sm font-medium">{label.name}</span>
                      </div>
                      <button
                        onClick={() => startEditingLabel(label)}
                        className="p-1.5 text-slate-400 hover:bg-slate-100 rounded"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteLabel(label.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              ))}

              {/* Create New Label */}
              {creatingLabel ? (
                <div className="p-4 bg-slate-50 rounded-lg space-y-3">
                  <input
                    autoFocus
                    type="text"
                    placeholder="Label name"
                    value={newLabelName}
                    onChange={e => setNewLabelName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyDown={e => e.key === 'Enter' && handleCreateLabel()}
                  />
                  <div className="flex flex-wrap gap-2">
                    {PRESET_COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => setNewLabelColor(color)}
                        className={`w-8 h-8 rounded transition-all ${
                          newLabelColor === color ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : ''
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateLabel}
                      className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
                    >
                      Create
                    </button>
                    <button
                      onClick={() => {
                        setCreatingLabel(false);
                        setNewLabelName('');
                      }}
                      className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setCreatingLabel(true)}
                  className="w-full py-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 hover:text-slate-700 hover:border-slate-400 flex items-center justify-center gap-2 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create a new label
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
