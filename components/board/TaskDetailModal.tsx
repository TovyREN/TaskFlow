"use client";

import React, { useState, useEffect } from 'react';
import { 
  X, Calendar, Users, Tag, CheckSquare, MessageSquare, 
  Trash2, Plus, Check, Clock, AlignLeft,
  User, Loader2
} from 'lucide-react';
import {
  getTaskDetails, updateTaskDetails, addAssignee, removeAssignee,
  addLabelToTask, removeLabelFromTask, createChecklist, deleteChecklist,
  addChecklistItem, updateChecklistItem, deleteChecklistItem,
  addComment, deleteComment
} from '../../app/actions/cardActions';
import { useSocket } from '../SocketProvider';

interface TaskDetailModalProps {
  taskId: string;
  userId: string;
  onClose: () => void;
  onTaskUpdated: () => void;
  onTaskDeleted: () => void;
}

export default function TaskDetailModal({ 
  taskId, 
  userId, 
  onClose, 
  onTaskUpdated,
  onTaskDeleted 
}: TaskDetailModalProps) {
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [editingDescription, setEditingDescription] = useState(false);
  
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [showLabelDropdown, setShowLabelDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);

  const [addingChecklist, setAddingChecklist] = useState(false);
  const [newChecklistTitle, setNewChecklistTitle] = useState('');

  const closeAllDropdowns = () => {
    setShowAssigneeDropdown(false);
    setShowLabelDropdown(false);
    setShowDatePicker(false);
    setShowStartDatePicker(false);
    setAddingChecklist(false);
  };
  const [addingItemToChecklist, setAddingItemToChecklist] = useState<string | null>(null);
  const [newItemTitle, setNewItemTitle] = useState('');
  
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const { on, off, isConnected } = useSocket();

  useEffect(() => {
    loadTask();
  }, [taskId]);

  // Socket: Listen for real-time updates to this task
  useEffect(() => {
    if (!isConnected || !taskId) return;

    const handleTaskChange = (data: any) => {
      if (data.taskId !== taskId) return;
      // Reload task to get latest data
      loadTask();
    };

    // Listen for all task-related events
    on('task:updated', handleTaskChange);
    on('task:label-added', handleTaskChange);
    on('task:label-removed', handleTaskChange);
    on('task:assignee-added', handleTaskChange);
    on('task:assignee-removed', handleTaskChange);
    on('task:checklist-created', handleTaskChange);
    on('task:checklist-deleted', handleTaskChange);
    on('task:checklist-item-added', handleTaskChange);
    on('task:checklist-item-updated', handleTaskChange);
    on('task:checklist-item-deleted', handleTaskChange);
    on('task:comment-added', handleTaskChange);
    on('task:comment-deleted', handleTaskChange);

    return () => {
      off('task:updated', handleTaskChange);
      off('task:label-added', handleTaskChange);
      off('task:label-removed', handleTaskChange);
      off('task:assignee-added', handleTaskChange);
      off('task:assignee-removed', handleTaskChange);
      off('task:checklist-created', handleTaskChange);
      off('task:checklist-deleted', handleTaskChange);
      off('task:checklist-item-added', handleTaskChange);
      off('task:checklist-item-updated', handleTaskChange);
      off('task:checklist-item-deleted', handleTaskChange);
      off('task:comment-added', handleTaskChange);
      off('task:comment-deleted', handleTaskChange);
    };
  }, [taskId, isConnected, on, off]);

  // Polling fallback when sockets are not connected (e.g. Vercel deployment)
  useEffect(() => {
    if (isConnected) return;
    const interval = setInterval(async () => {
      const data = await getTaskDetails(taskId);
      if (data) {
        setTask(data);
        setTitle(data.title);
        setDescription(data.description || '');
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [taskId, isConnected]);

  const loadTask = async () => {
    setLoading(true);
    const data = await getTaskDetails(taskId);
    if (data) {
      setTask(data);
      setTitle(data.title);
      setDescription(data.description || '');
    }
    setLoading(false);
  };

  const handleUpdateTitle = async () => {
    if (title.trim() === '' || title === task.title) {
      setEditingTitle(false);
      return;
    }
    const result = await updateTaskDetails(taskId, { title }, userId);
    if (result.success) {
      setTask((prev: any) => ({ ...prev, title }));
      setEditingTitle(false);
      onTaskUpdated();
    } else if (result.error) {
      alert(result.error);
    }
  };

  const handleUpdateDescription = async () => {
    const result = await updateTaskDetails(taskId, { description }, userId);
    if (result.success) {
      setTask((prev: any) => ({ ...prev, description }));
      setEditingDescription(false);
      onTaskUpdated();
    } else if (result.error) {
      alert(result.error);
    }
  };

  const handleToggleAssignee = async (memberId: string) => {
    const isAssigned = task.assignees?.some((a: any) => a.userId === memberId);
    if (isAssigned) {
      const result = await removeAssignee(taskId, memberId, userId);
      if (result.success) {
        setTask((prev: any) => ({
          ...prev,
          assignees: prev.assignees.filter((a: any) => a.userId !== memberId)
        }));
        onTaskUpdated();
      } else if (result.error) {
        alert(result.error);
      }
    } else {
      const result = await addAssignee(taskId, memberId, userId);
      if (result.success) {
        const member = task.list.board.workspace.members.find((m: any) => m.userId === memberId);
        setTask((prev: any) => ({
          ...prev,
          assignees: [...prev.assignees, { userId: memberId, user: member?.user }]
        }));
        onTaskUpdated();
      } else if (result.error) {
        alert(result.error);
      }
    }
  };

  const handleToggleLabel = async (labelId: string) => {
    const hasLabel = task.labels?.some((l: any) => l.labelId === labelId);
    if (hasLabel) {
      const result = await removeLabelFromTask(taskId, labelId, userId);
      if (result.success) {
        setTask((prev: any) => ({
          ...prev,
          labels: prev.labels.filter((l: any) => l.labelId !== labelId)
        }));
        onTaskUpdated();
      } else if (result.error) {
        alert(result.error);
      }
    } else {
      const result = await addLabelToTask(taskId, labelId, userId);
      if (result.success) {
        const label = task.list.board.labels.find((l: any) => l.id === labelId);
        setTask((prev: any) => ({
          ...prev,
          labels: [...prev.labels, { labelId, label }]
        }));
        onTaskUpdated();
      } else if (result.error) {
        alert(result.error);
      }
    }
  };

  const handleSetDueDate = async (dateStr: string) => {
    const dueDate = dateStr ? new Date(dateStr) : null;
    const result = await updateTaskDetails(taskId, { dueDate }, userId);
    if (result.success) {
      setTask((prev: any) => ({ ...prev, dueDate }));
      setShowDatePicker(false);
      onTaskUpdated();
    } else if (result.error) {
      alert(result.error);
    }
  };

  const handleSetStartDate = async (dateStr: string) => {
    const startDate = dateStr ? new Date(dateStr) : null;
    const result = await updateTaskDetails(taskId, { startDate }, userId);
    if (result.success) {
      setTask((prev: any) => ({ ...prev, startDate }));
      setShowStartDatePicker(false);
      onTaskUpdated();
    } else if (result.error) {
      alert(result.error);
    }
  };

  const handleAddChecklist = async () => {
    if (newChecklistTitle.trim() === '') return;
    const result = await createChecklist(taskId, newChecklistTitle, userId);
    if (result.success && result.checklist) {
      setTask((prev: any) => ({
        ...prev,
        checklists: [...prev.checklists, result.checklist]
      }));
      setNewChecklistTitle('');
      setAddingChecklist(false);
    } else if (result.error) {
      alert(result.error);
    }
  };

  const handleDeleteChecklist = async (checklistId: string) => {
    const result = await deleteChecklist(checklistId, userId);
    if (result.success) {
      setTask((prev: any) => ({
        ...prev,
        checklists: prev.checklists.filter((c: any) => c.id !== checklistId)
      }));
    } else if (result.error) {
      alert(result.error);
    }
  };

  const handleAddChecklistItem = async (checklistId: string) => {
    if (newItemTitle.trim() === '') return;
    const result = await addChecklistItem(checklistId, newItemTitle, userId);
    if (result.success && result.item) {
      setTask((prev: any) => ({
        ...prev,
        checklists: prev.checklists.map((c: any) =>
          c.id === checklistId
            ? { ...c, items: [...c.items, result.item] }
            : c
        )
      }));
      setNewItemTitle('');
      setAddingItemToChecklist(null);
    } else if (result.error) {
      alert(result.error);
    }
  };

  const handleToggleChecklistItem = async (checklistId: string, itemId: string, isChecked: boolean) => {
    const newChecked = !isChecked;
    const result = await updateChecklistItem(itemId, { isChecked: newChecked }, userId);
    if (result.success) {
      setTask((prev: any) => ({
        ...prev,
        checklists: prev.checklists.map((c: any) =>
          c.id === checklistId
            ? {
                ...c,
                items: c.items.map((i: any) =>
                  i.id === itemId ? { ...i, isChecked: newChecked } : i
                )
              }
            : c
        )
      }));
    } else if (result.error) {
      alert(result.error);
    }
  };

  const handleDeleteChecklistItem = async (checklistId: string, itemId: string) => {
    const result = await deleteChecklistItem(itemId, userId);
    if (result.success) {
      setTask((prev: any) => ({
        ...prev,
        checklists: prev.checklists.map((c: any) =>
          c.id === checklistId
            ? { ...c, items: c.items.filter((i: any) => i.id !== itemId) }
            : c
        )
      }));
    } else if (result.error) {
      alert(result.error);
    }
  };

  const handleAddComment = async () => {
    if (newComment.trim() === '') return;
    setSubmittingComment(true);
    const result = await addComment(taskId, userId, newComment);
    if (result.success && result.comment) {
      setTask((prev: any) => ({
        ...prev,
        comments: [result.comment, ...prev.comments]
      }));
      setNewComment('');
    }
    setSubmittingComment(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    const result = await deleteComment(commentId, userId);
    if (result.success) {
      setTask((prev: any) => ({
        ...prev,
        comments: prev.comments.filter((c: any) => c.id !== commentId)
      }));
    }
  };

  const getChecklistProgress = (checklist: any) => {
    if (!checklist.items || checklist.items.length === 0) return 0;
    const checked = checklist.items.filter((i: any) => i.isChecked).length;
    return Math.round((checked / checklist.items.length) * 100);
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (date: Date | string) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
        <div className="bg-white rounded-xl p-8">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  if (!task) return null;

  const workspaceMembers = task.list?.board?.workspace?.members || [];
  const boardLabels = task.list?.board?.labels || [];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-start justify-center z-50 backdrop-blur-sm overflow-y-auto py-8" onClick={onClose}>
      <div 
        className="bg-slate-100 rounded-xl shadow-2xl w-full max-w-3xl mx-4 my-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-200 bg-white rounded-t-xl">
          <div className="flex items-start gap-3">
            <CheckSquare className="w-6 h-6 text-slate-500 mt-1 shrink-0" />
            <div className="flex-1 min-w-0">
              {editingTitle ? (
                <input
                  autoFocus
                  className="w-full text-xl font-semibold text-slate-800 bg-white border border-blue-500 rounded px-2 py-1 outline-none"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  onBlur={handleUpdateTitle}
                  onKeyDown={e => e.key === 'Enter' && handleUpdateTitle()}
                />
              ) : (
                <h2 
                  className="text-xl font-semibold text-slate-800 cursor-pointer hover:bg-slate-100 rounded px-2 py-1 -mx-2"
                  onClick={() => setEditingTitle(true)}
                >
                  {task.title}
                </h2>
              )}
              <p className="text-sm text-slate-500 mt-1">
                in list <span className="font-medium">{task.list?.title}</span>
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row">
          {/* Main Content */}
          <div className="flex-1 p-4 space-y-6">
            {/* Labels */}
            {task.labels?.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Labels</h4>
                <div className="flex flex-wrap gap-2">
                  {task.labels.map((tl: any) => (
                    <span
                      key={tl.labelId}
                      className="px-3 py-1 rounded-full text-sm font-medium text-white"
                      style={{ backgroundColor: tl.label?.color }}
                    >
                      {tl.label?.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Start Date */}
            {task.startDate && (
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Start Date</h4>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium bg-slate-200 text-slate-700">
                  <Calendar className="w-4 h-4" />
                  {formatDate(task.startDate)}
                </div>
              </div>
            )}

            {/* Due Date */}
            {task.dueDate && (
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Due Date</h4>
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium ${
                  new Date(task.dueDate) < new Date()
                    ? 'bg-red-100 text-red-700'
                    : 'bg-slate-200 text-slate-700'
                }`}>
                  <Clock className="w-4 h-4" />
                  {formatDate(task.dueDate)}
                </div>
              </div>
            )}

            {/* Assignees */}
            {task.assignees?.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Assignees</h4>
                <div className="flex flex-wrap gap-2">
                  {task.assignees.map((a: any) => (
                    <div key={a.userId} className="flex items-center gap-2 bg-white rounded-full px-3 py-1.5 border">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-medium">
                        {a.user?.name?.charAt(0).toUpperCase() || a.user?.email?.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm text-slate-700">{a.user?.name || a.user?.email}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <AlignLeft className="w-5 h-5 text-slate-500" />
                <h4 className="text-sm font-semibold text-slate-700">Description</h4>
              </div>
              {editingDescription ? (
                <div>
                  <textarea
                    autoFocus
                    className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 resize-none text-slate-800"
                    rows={4}
                    placeholder="Add a more detailed description..."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={handleUpdateDescription}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setDescription(task.description || '');
                        setEditingDescription(false);
                      }}
                      className="px-3 py-1.5 text-slate-600 hover:bg-slate-200 rounded text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    description ? 'bg-white hover:bg-slate-50' : 'bg-slate-200 hover:bg-slate-300'
                  }`}
                  onClick={() => setEditingDescription(true)}
                >
                  {description ? (
                    <p className="text-slate-700 whitespace-pre-wrap">{description}</p>
                  ) : (
                    <p className="text-slate-500">Add a more detailed description...</p>
                  )}
                </div>
              )}
            </div>

            {/* Checklists */}
            {task.checklists?.map((checklist: any) => (
              <div key={checklist.id}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-5 h-5 text-slate-500" />
                    <h4 className="text-sm font-semibold text-slate-700">{checklist.title}</h4>
                  </div>
                  <button
                    onClick={() => handleDeleteChecklist(checklist.id)}
                    className="text-slate-400 hover:text-red-500 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                {/* Progress Bar */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-slate-500 w-8">{getChecklistProgress(checklist)}%</span>
                  <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all ${
                        getChecklistProgress(checklist) === 100 ? 'bg-green-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${getChecklistProgress(checklist)}%` }}
                    />
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-1">
                  {checklist.items?.map((item: any) => (
                    <div key={item.id} className="flex items-center gap-2 group">
                      <input
                        type="checkbox"
                        checked={item.isChecked}
                        onChange={() => handleToggleChecklistItem(checklist.id, item.id, item.isChecked)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className={`flex-1 text-sm ${item.isChecked ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                        {item.title}
                      </span>
                      <button
                        onClick={() => handleDeleteChecklistItem(checklist.id, item.id)}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 p-1"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add Item */}
                {addingItemToChecklist === checklist.id ? (
                  <div className="mt-2">
                    <input
                      autoFocus
                      className="w-full p-2 border border-slate-300 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Add an item..."
                      value={newItemTitle}
                      onChange={e => setNewItemTitle(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddChecklistItem(checklist.id)}
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleAddChecklistItem(checklist.id)}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => {
                          setAddingItemToChecklist(null);
                          setNewItemTitle('');
                        }}
                        className="px-3 py-1 text-slate-600 hover:bg-slate-200 rounded text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingItemToChecklist(checklist.id)}
                    className="mt-2 text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" /> Add an item
                  </button>
                )}
              </div>
            ))}

            {/* Comments */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-5 h-5 text-slate-500" />
                <h4 className="text-sm font-semibold text-slate-700">Comments</h4>
              </div>
              
              {/* Add Comment */}
              <div className="flex gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-sm font-medium shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <textarea
                    className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 resize-none text-slate-800"
                    rows={2}
                    placeholder="Write a comment..."
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={newComment.trim() === '' || submittingComment}
                    className="mt-2 px-4 py-1.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:bg-blue-400"
                  >
                    {submittingComment ? 'Posting...' : 'Post'}
                  </button>
                </div>
              </div>

              {/* Comments List */}
              <div className="space-y-4">
                {task.comments?.map((comment: any) => (
                  <div key={comment.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-sm font-medium shrink-0">
                      {comment.user?.name?.charAt(0).toUpperCase() || comment.user?.email?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-slate-800">
                          {comment.user?.name || comment.user?.email}
                        </span>
                        <span className="text-xs text-slate-400">{formatTime(comment.createdAt)}</span>
                        {comment.userId === userId && (
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="text-slate-400 hover:text-red-500 ml-auto"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-slate-700 mt-1 bg-white rounded-lg p-3">
                        {comment.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-full lg:w-48 p-4 bg-slate-50 rounded-r-xl space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase mb-3">Add to card</p>
            
            {/* Members */}
            <div className="relative">
              <button
                onClick={() => { const next = !showAssigneeDropdown; closeAllDropdowns(); setShowAssigneeDropdown(next); }}
                className="w-full flex items-center gap-2 px-3 py-2 bg-slate-200 hover:bg-slate-300 rounded text-sm text-slate-700 font-medium transition-colors"
              >
                <Users className="w-4 h-4" />
                Members
              </button>
              {showAssigneeDropdown && (
                <div className="absolute top-full mt-1 left-0 w-56 bg-white rounded-lg shadow-xl border z-10 p-2 max-h-64 overflow-y-auto">
                  <p className="text-xs font-semibold text-slate-500 px-2 py-1">Workspace Members</p>
                  {workspaceMembers.map((member: any) => {
                    const isAssigned = task.assignees?.some((a: any) => a.userId === member.userId);
                    return (
                      <button
                        key={member.userId}
                        onClick={() => handleToggleAssignee(member.userId)}
                        className="w-full flex items-center gap-2 px-2 py-2 hover:bg-slate-100 rounded text-left"
                      >
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs">
                          {member.user?.name?.charAt(0).toUpperCase() || member.user?.email?.charAt(0).toUpperCase()}
                        </div>
                        <span className="flex-1 text-sm truncate">{member.user?.name || member.user?.email}</span>
                        {isAssigned && <Check className="w-4 h-4 text-blue-600" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Labels */}
            <div className="relative">
              <button
                onClick={() => { const next = !showLabelDropdown; closeAllDropdowns(); setShowLabelDropdown(next); }}
                className="w-full flex items-center gap-2 px-3 py-2 bg-slate-200 hover:bg-slate-300 rounded text-sm text-slate-700 font-medium transition-colors"
              >
                <Tag className="w-4 h-4" />
                Labels
              </button>
              {showLabelDropdown && (
                <div className="absolute top-full mt-1 left-0 w-56 bg-white rounded-lg shadow-xl border z-10 p-2 max-h-64 overflow-y-auto">
                  <p className="text-xs font-semibold text-slate-500 px-2 py-1">Labels</p>
                  {boardLabels.length === 0 ? (
                    <p className="text-xs text-slate-400 px-2 py-2">No labels created yet</p>
                  ) : (
                    boardLabels.map((label: any) => {
                      const hasLabel = task.labels?.some((l: any) => l.labelId === label.id);
                      return (
                        <button
                          key={label.id}
                          onClick={() => handleToggleLabel(label.id)}
                          className="w-full flex items-center gap-2 px-2 py-2 hover:bg-slate-100 rounded"
                        >
                          <div 
                            className="w-8 h-6 rounded"
                            style={{ backgroundColor: label.color }}
                          />
                          <span className="flex-1 text-sm text-left">{label.name}</span>
                          {hasLabel && <Check className="w-4 h-4 text-blue-600" />}
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Checklist */}
            <div className="relative">
              {addingChecklist ? (
                <div className="bg-white rounded-lg shadow-xl border p-2">
                  <input
                    autoFocus
                    className="w-full p-2 border border-slate-300 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Checklist title..."
                    value={newChecklistTitle}
                    onChange={e => setNewChecklistTitle(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddChecklist()}
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={handleAddChecklist}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => {
                        setAddingChecklist(false);
                        setNewChecklistTitle('');
                      }}
                      className="px-3 py-1 text-slate-600 hover:bg-slate-200 rounded text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { closeAllDropdowns(); setAddingChecklist(true); }}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-slate-200 hover:bg-slate-300 rounded text-sm text-slate-700 font-medium transition-colors"
                >
                  <CheckSquare className="w-4 h-4" />
                  Checklist
                </button>
              )}
            </div>

            {/* Start Date */}
            <div className="relative">
              <button
                onClick={() => { const next = !showStartDatePicker; closeAllDropdowns(); setShowStartDatePicker(next); }}
                className="w-full flex items-center gap-2 px-3 py-2 bg-slate-200 hover:bg-slate-300 rounded text-sm text-slate-700 font-medium transition-colors"
              >
                <Calendar className="w-4 h-4" />
                Start Date
              </button>
              {showStartDatePicker && (
                <div className="absolute top-full mt-1 left-0 w-56 bg-white rounded-lg shadow-xl border z-10 p-3">
                  <input
                    type="date"
                    className="w-full p-2 border border-slate-300 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    value={task.startDate ? new Date(task.startDate).toISOString().split('T')[0] : ''}
                    onChange={e => handleSetStartDate(e.target.value)}
                  />
                  {task.startDate && (
                    <button
                      onClick={() => handleSetStartDate('')}
                      className="w-full mt-2 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded text-sm"
                    >
                      Remove start date
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Due Date */}
            <div className="relative">
              <button
                onClick={() => { const next = !showDatePicker; closeAllDropdowns(); setShowDatePicker(next); }}
                className="w-full flex items-center gap-2 px-3 py-2 bg-slate-200 hover:bg-slate-300 rounded text-sm text-slate-700 font-medium transition-colors"
              >
                <Calendar className="w-4 h-4" />
                Due Date
              </button>
              {showDatePicker && (
                <div className="absolute top-full mt-1 left-0 w-56 bg-white rounded-lg shadow-xl border z-10 p-3">
                  <input
                    type="date"
                    className="w-full p-2 border border-slate-300 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    value={task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''}
                    onChange={e => handleSetDueDate(e.target.value)}
                  />
                  {task.dueDate && (
                    <button
                      onClick={() => handleSetDueDate('')}
                      className="w-full mt-2 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded text-sm"
                    >
                      Remove due date
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
