import React, { useState } from 'react';
import { 
  X, LayoutGrid, Plus, Tag as TagIcon, CheckSquare, Clock, Trash2, 
  MoreHorizontal, User as UserIcon, Edit2 
} from 'lucide-react';
import { Task, User, Tag, Checklist, Comment } from '../../types';
import TaskDescription from './TaskDescription';

interface TaskDetailModalProps {
  task: Task;
  boardLabels: Tag[];
  allUsers: User[];
  currentUser: User;
  onClose: () => void;
  onUpdate: (updates: Partial<Task>) => void;
  onDelete: (taskId: string) => void;
  onUpdateBoardLabels: (newLabels: Tag[]) => void;
}

const COLORS = [
  { name: 'Red', class: 'red-500' },
  { name: 'Orange', class: 'orange-500' },
  { name: 'Yellow', class: 'yellow-500' },
  { name: 'Green', class: 'green-500' },
  { name: 'Blue', class: 'blue-500' },
  { name: 'Purple', class: 'purple-500' },
  { name: 'Pink', class: 'pink-500' },
];

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task, boardLabels, allUsers, currentUser, onClose, onUpdate, onDelete, onUpdateBoardLabels
}) => {
  const [activePopover, setActivePopover] = useState<'labels' | 'members' | 'dates' | 'checklist' | null>(null);
  const [commentInput, setCommentInput] = useState('');
  
  // Popover form states
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState(COLORS[4].class);
  const [newChecklistTitle, setNewChecklistTitle] = useState('Checklist');

  // Handlers
  const handleAddLabel = (tag: Tag) => {
    const exists = task.tags.some(t => t.id === tag.id);
    const newTags = exists ? task.tags.filter(t => t.id !== tag.id) : [...task.tags, tag];
    onUpdate({ tags: newTags });
  };

  const handleCreateLabel = () => {
    if (newLabelName.trim()) {
      const newTag: Tag = { id: crypto.randomUUID(), name: newLabelName, color: newLabelColor };
      onUpdateBoardLabels([...(boardLabels || []), newTag]);
      handleAddLabel(newTag);
      setNewLabelName('');
    }
  };

  const handleToggleAssignee = (userId: string) => {
    const exists = task.assignees.includes(userId);
    const newAssignees = exists ? task.assignees.filter(id => id !== userId) : [...task.assignees, userId];
    onUpdate({ assignees: newAssignees });
  };

  const handleAddChecklist = () => {
    if (newChecklistTitle.trim()) {
      const newChecklist: Checklist = { id: crypto.randomUUID(), title: newChecklistTitle, items: [] };
      onUpdate({ checklists: [...task.checklists, newChecklist] });
      setNewChecklistTitle('Checklist');
      setActivePopover(null);
    }
  };

  const handleAddChecklistItem = (checklistId: string, title: string) => {
    if (!title.trim()) return;
    const updatedChecklists = task.checklists.map(cl => 
      cl.id === checklistId ? { ...cl, items: [...cl.items, { id: crypto.randomUUID(), title, isChecked: false }] } : cl
    );
    onUpdate({ checklists: updatedChecklists });
  };

  const handleToggleCheckItem = (checklistId: string, itemId: string) => {
    const updatedChecklists = task.checklists.map(cl => 
      cl.id === checklistId ? { ...cl, items: cl.items.map(i => i.id === itemId ? { ...i, isChecked: !i.isChecked } : i) } : cl
    );
    onUpdate({ checklists: updatedChecklists });
  };

  const handleDeleteChecklist = (checklistId: string) => {
    onUpdate({ checklists: task.checklists.filter(cl => cl.id !== checklistId) });
  };

  const handleAddComment = () => {
    if (commentInput.trim()) {
      const newComment: Comment = {
        id: crypto.randomUUID(),
        userId: currentUser.id,
        text: commentInput,
        createdAt: Date.now()
      };
      onUpdate({ comments: [...task.comments, newComment] });
      setCommentInput('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto" onClick={onClose}>
      <div 
        className="bg-white rounded-xl w-full max-w-3xl my-8 shadow-2xl animate-scale-in relative flex flex-col md:flex-row min-h-[500px]"
        onClick={e => { e.stopPropagation(); setActivePopover(null); }}
      >
        <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full text-slate-500 z-10">
            <X className="w-5 h-5"/>
        </button>

        {/* Left Content */}
        <div className="flex-1 p-6 md:p-8 space-y-8">
          {/* Header/Title */}
          <div className="flex gap-3 items-start">
            <LayoutGrid className="w-6 h-6 text-slate-700 mt-1" />
            <div className="flex-1">
              <input 
                className="text-xl font-bold text-slate-900 bg-transparent w-full outline-none border-2 border-transparent focus:border-indigo-500 rounded px-1 -ml-1"
                value={task.title}
                onChange={(e) => onUpdate({ title: e.target.value })}
              />
              <p className="text-sm text-slate-500 mt-1">in list <span className="underline">Current List</span></p>
            </div>
          </div>

          {/* Metadata */}
          <div className="pl-9 flex flex-wrap gap-6">
            {task.assignees.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Members</h4>
                <div className="flex gap-1 flex-wrap">
                  {task.assignees.map(uid => {
                    const u = allUsers.find(user => user.id === uid);
                    return u ? <img key={uid} src={u.avatar} className="w-8 h-8 rounded-full" title={u.name} /> : null;
                  })}
                  <button onClick={(e) => { e.stopPropagation(); setActivePopover('members'); }} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600">
                      <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
            
            {task.tags.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Labels</h4>
                <div className="flex gap-1 flex-wrap">
                  {task.tags.map(t => (
                    <span key={t.id} className={`px-3 py-1 rounded bg-${t.color} text-white text-sm font-medium`}>{t.name}</span>
                  ))}
                  <button onClick={(e) => { e.stopPropagation(); setActivePopover('labels'); }} className="h-7 w-7 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600">
                      <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {task.dueDate && (
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Due Date</h4>
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={task.isDueDateDone || false}
                    onChange={() => onUpdate({ isDueDateDone: !task.isDueDateDone })}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <button onClick={(e) => { e.stopPropagation(); setActivePopover('dates'); }} className="bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded text-sm text-slate-700 font-medium">
                    {new Date(task.dueDate).toLocaleDateString()}
                    {task.isDueDateDone && <span className="ml-2 px-1.5 py-0.5 bg-green-500 text-white text-xs rounded uppercase">Completed</span>}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Modular Description Component */}
          <TaskDescription 
            description={task.description || ''} 
            onSave={(newDesc) => onUpdate({ description: newDesc })} 
          />

          {/* Checklists */}
          {task.checklists.map(checklist => {
            const progress = checklist.items.length > 0 ? Math.round((checklist.items.filter(i => i.isChecked).length / checklist.items.length) * 100) : 0;
            return (
              <div key={checklist.id} className="pl-9">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-5 h-5 text-slate-700" />
                    <h3 className="font-semibold text-slate-700">{checklist.title}</h3>
                  </div>
                  <button onClick={() => handleDeleteChecklist(checklist.id)} className="text-slate-400 hover:text-red-500 px-2 py-1 rounded bg-slate-100 text-xs">Delete</button>
                </div>
                <div className="mb-4">
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{progress}% completed</p>
                </div>
                <div className="space-y-2">
                  {checklist.items.map(item => (
                    <div key={item.id} className="flex items-start gap-2 group">
                      <input 
                        type="checkbox" 
                        checked={item.isChecked}
                        onChange={() => handleToggleCheckItem(checklist.id, item.id)}
                        className="mt-1 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                      />
                      <span className={`text-slate-700 ${item.isChecked ? 'line-through text-slate-400' : ''}`}>{item.title}</span>
                    </div>
                  ))}
                  <div className="mt-2">
                    <input 
                      placeholder="Add an item"
                      className="px-3 py-1.5 text-sm bg-slate-50 hover:bg-slate-100 rounded border border-transparent focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all w-full text-slate-900"
                      onKeyDown={(e) => {
                        if(e.key === 'Enter') {
                          handleAddChecklistItem(checklist.id, e.currentTarget.value);
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {/* Comments */}
          <div className="pl-9">
            <div className="flex items-center gap-2 mb-4">
              <MoreHorizontal className="w-5 h-5 text-slate-700" />
              <h3 className="font-semibold text-slate-700">Activity</h3>
            </div>
            <div className="flex gap-3 mb-6">
              <img src={currentUser.avatar} className="w-8 h-8 rounded-full" />
              <div className="flex-1 bg-white border border-slate-200 rounded-lg shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 overflow-hidden">
                <textarea 
                  className="w-full p-3 outline-none text-sm resize-none text-slate-900 bg-white"
                  rows={2}
                  placeholder="Write a comment..."
                  value={commentInput}
                  onChange={e => setCommentInput(e.target.value)}
                />
                {commentInput.trim() && (
                  <div className="px-3 py-2 bg-slate-50 border-t border-slate-100 flex justify-end">
                    <button 
                      onClick={handleAddComment}
                      className="bg-indigo-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-indigo-700"
                    >
                      Save
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-4">
              {task.comments.sort((a,b) => b.createdAt - a.createdAt).map(comment => {
                const u = allUsers.find(user => user.id === comment.userId);
                return (
                  <div key={comment.id} className="flex gap-3">
                    <img src={u?.avatar || 'https://ui-avatars.com/api/?name=User'} className="w-8 h-8 rounded-full" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800 text-sm">{u?.name}</span>
                        <span className="text-xs text-slate-400">{new Date(comment.createdAt).toLocaleString()}</span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-700 mt-1 shadow-sm border border-slate-100">
                        {comment.text}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-full md:w-64 bg-slate-50 p-6 md:p-8 space-y-6 border-l border-slate-200 md:rounded-r-xl h-full md:min-h-[600px]">
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Add to card</h4>
            <div className="space-y-2 relative">
              
              {/* Members Button & Popover */}
              <button onClick={(e) => { e.stopPropagation(); setActivePopover(activePopover === 'members' ? null : 'members'); }} className="w-full text-left px-3 py-2 bg-slate-200 hover:bg-slate-300 rounded text-slate-700 text-sm font-medium flex items-center gap-2 transition-colors">
                <UserIcon className="w-4 h-4" /> Members
              </button>
              {activePopover === 'members' && (
                <div onClick={e => e.stopPropagation()} className="absolute top-10 left-0 z-10 w-64 bg-white rounded-lg shadow-xl border border-slate-200 p-2 animate-fade-in">
                  <h4 className="text-xs font-bold text-center text-slate-500 border-b pb-2 mb-2">Members</h4>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {allUsers.map(user => (
                      <div key={user.id} onClick={() => handleToggleAssignee(user.id)} className="flex items-center gap-2 p-2 hover:bg-slate-100 rounded cursor-pointer">
                        <img src={user.avatar} className="w-6 h-6 rounded-full" />
                        <span className="text-sm text-slate-700 flex-1">{user.name}</span>
                        {task.assignees.includes(user.id) && <CheckSquare className="w-4 h-4 text-indigo-600" />}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Labels Button & Popover */}
              <button onClick={(e) => { e.stopPropagation(); setActivePopover(activePopover === 'labels' ? null : 'labels'); }} className="w-full text-left px-3 py-2 bg-slate-200 hover:bg-slate-300 rounded text-slate-700 text-sm font-medium flex items-center gap-2 transition-colors">
                <TagIcon className="w-4 h-4" /> Labels
              </button>
              {activePopover === 'labels' && (
                <div onClick={e => e.stopPropagation()} className="absolute top-10 left-0 z-10 w-64 bg-white rounded-lg shadow-xl border border-slate-200 p-2 animate-fade-in">
                  <h4 className="text-xs font-bold text-center text-slate-500 border-b pb-2 mb-2">Labels</h4>
                  <div className="space-y-1 max-h-48 overflow-y-auto mb-3">
                    {boardLabels?.map(label => (
                      <div key={label.id} onClick={() => handleAddLabel(label)} className="flex items-center gap-2 p-1 rounded cursor-pointer hover:bg-slate-50 group">
                        <div className={`flex-1 h-8 rounded bg-${label.color} text-white text-sm font-medium px-2 flex items-center justify-between`}>
                          {label.name}
                          {task.tags.some(t => t.id === label.id) && <CheckSquare className="w-4 h-4" />}
                        </div>
                        <button className="p-1 text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100"><Edit2 className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                  <div className="bg-slate-50 p-2 rounded border border-slate-100">
                    <p className="text-xs font-semibold text-slate-500 mb-2">Create new label</p>
                    <input className="w-full border rounded px-2 py-1 text-sm mb-2 text-slate-900 bg-white" placeholder="Name" value={newLabelName} onChange={e => setNewLabelName(e.target.value)} />
                    <div className="flex gap-1 flex-wrap mb-2">
                      {COLORS.map(c => (
                        <div key={c.class} onClick={() => setNewLabelColor(c.class)} className={`w-6 h-6 rounded cursor-pointer bg-${c.class} ${newLabelColor === c.class ? 'ring-2 ring-slate-800' : ''}`} />
                      ))}
                    </div>
                    <button onClick={handleCreateLabel} className="w-full bg-indigo-600 text-white text-sm py-1 rounded hover:bg-indigo-700">Create</button>
                  </div>
                </div>
              )}

              {/* Checklist Button */}
              <button onClick={(e) => { e.stopPropagation(); setActivePopover(activePopover === 'checklist' ? null : 'checklist'); }} className="w-full text-left px-3 py-2 bg-slate-200 hover:bg-slate-300 rounded text-slate-700 text-sm font-medium flex items-center gap-2 transition-colors">
                <CheckSquare className="w-4 h-4" /> Checklist
              </button>
              {activePopover === 'checklist' && (
                <div onClick={e => e.stopPropagation()} className="absolute top-10 left-0 z-10 w-64 bg-white rounded-lg shadow-xl border border-slate-200 p-3 animate-fade-in">
                  <h4 className="text-xs font-bold text-center text-slate-500 border-b pb-2 mb-2">Add Checklist</h4>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Title</label>
                  <input className="w-full border rounded px-2 py-1 text-sm mb-3 text-slate-900 bg-white" value={newChecklistTitle} onChange={e => setNewChecklistTitle(e.target.value)} autoFocus />
                  <button onClick={handleAddChecklist} className="w-full bg-indigo-600 text-white text-sm py-1.5 rounded hover:bg-indigo-700">Add</button>
                </div>
              )}

              {/* Dates Button */}
              <button onClick={(e) => { e.stopPropagation(); setActivePopover(activePopover === 'dates' ? null : 'dates'); }} className="w-full text-left px-3 py-2 bg-slate-200 hover:bg-slate-300 rounded text-slate-700 text-sm font-medium flex items-center gap-2 transition-colors">
                <Clock className="w-4 h-4" /> Dates
              </button>
              {activePopover === 'dates' && (
                <div onClick={e => e.stopPropagation()} className="absolute top-10 left-0 z-10 w-64 bg-white rounded-lg shadow-xl border border-slate-200 p-3 animate-fade-in">
                  <h4 className="text-xs font-bold text-center text-slate-500 border-b pb-2 mb-2">Dates</h4>
                  <div className="mb-3">
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Start Date</label>
                    <input type="date" className="w-full border rounded px-2 py-1 text-sm text-slate-900 bg-white" value={task.startDate ? new Date(task.startDate).toISOString().split('T')[0] : ''} onChange={e => onUpdate({ startDate: e.target.valueAsNumber })} />
                  </div>
                  <div className="mb-3">
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Due Date</label>
                    <input type="date" className="w-full border rounded px-2 py-1 text-sm text-slate-900 bg-white" value={task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''} onChange={e => onUpdate({ dueDate: e.target.valueAsNumber })} />
                  </div>
                </div>
              )}
            </div>
            
            <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 mt-6">Actions</h4>
            <button 
              onClick={() => onDelete(task.id)}
              className="w-full text-left px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded text-sm font-medium flex items-center gap-2 transition-colors"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDetailModal;