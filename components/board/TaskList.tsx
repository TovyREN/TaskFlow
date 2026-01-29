import React, { useState, useRef, useEffect } from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { MoreHorizontal, Plus, X, Trash2, Edit3, PaintBucket, Eraser } from 'lucide-react';
import { TaskList as TaskListType, Task, User } from '../../types';
import TaskCard from './TaskCard';

interface TaskListProps {
  list: TaskListType;
  tasks: Task[];
  index: number;
  allUsers: User[];
  onTaskClick: (task: Task) => void;
  onCreateTask: (listId: string, title: string) => void;
  onUpdateList: (list: TaskListType) => void;
  onDeleteList: (listId: string) => void;
  onClearTasks: (listId: string) => void;
}

const LIST_COLORS = [
  { class: 'bg-transparent', name: 'Default' },
  { class: 'bg-red-100', name: 'Red' },
  { class: 'bg-orange-100', name: 'Orange' },
  { class: 'bg-amber-100', name: 'Amber' },
  { class: 'bg-green-100', name: 'Green' },
  { class: 'bg-blue-100', name: 'Blue' },
  { class: 'bg-indigo-100', name: 'Indigo' },
  { class: 'bg-purple-100', name: 'Purple' },
  { class: 'bg-pink-100', name: 'Pink' },
];

const TaskList: React.FC<TaskListProps> = ({ 
  list, tasks, index, allUsers,
  onTaskClick, onCreateTask,
  onUpdateList, onDeleteList, onClearTasks
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(list.title);
  const menuRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  const handleSubmitTask = () => {
    if (newTaskTitle.trim()) {
      onCreateTask(list.id, newTaskTitle);
      setNewTaskTitle('');
      setIsCreating(false);
    }
  };

  const handleTaskKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitTask();
    }
  };

  const handleTitleSave = () => {
    if (titleInput.trim() !== list.title && titleInput.trim() !== '') {
      onUpdateList({ ...list, title: titleInput });
    } else {
      setTitleInput(list.title); // Revert if empty
    }
    setIsEditingTitle(false);
  };

  const handleColorChange = (colorClass: string) => {
    onUpdateList({ ...list, headerColor: colorClass });
  };

  return (
    <Draggable draggableId={list.id} index={index}>
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className="w-72 shrink-0 flex flex-col max-h-full"
        >
          <div className="bg-slate-100 rounded-xl shadow-lg flex flex-col max-h-full border border-slate-200 relative">
            {/* Header */}
            <div className={`p-3 flex items-center justify-between font-semibold text-slate-700 rounded-t-xl transition-colors ${list.headerColor || ''}`}>
              {isEditingTitle ? (
                <input
                  ref={titleInputRef}
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  onBlur={handleTitleSave}
                  onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
                  className="px-2 py-1 w-full bg-white rounded border border-indigo-500 outline-none text-sm"
                />
              ) : (
                <h3 
                  className="px-2 truncate cursor-pointer hover:bg-black/5 rounded flex-1 py-1"
                  onClick={() => setIsEditingTitle(true)}
                  title="Click to edit title"
                >
                  {list.title}
                </h3>
              )}
              
              <div className="flex gap-1 items-center">

                <div className="relative">
                  <button 
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className={`p-1.5 rounded transition-colors ${isMenuOpen ? 'bg-black/10 text-slate-800' : 'hover:bg-black/10 text-slate-500'}`}
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>

                  {isMenuOpen && (
                    <div ref={menuRef} className="absolute top-full right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-slate-200 z-50 animate-fade-in text-sm font-normal">
                      <div className="p-3 border-b border-slate-100">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">List Actions</span>
                        <button 
                          onClick={() => { setIsEditingTitle(true); setIsMenuOpen(false); }}
                          className="w-full text-left flex items-center gap-2 p-2 hover:bg-slate-50 rounded text-slate-700"
                        >
                          <Edit3 className="w-4 h-4" /> Rename List
                        </button>
                        <button 
                          onClick={() => { onClearTasks(list.id); setIsMenuOpen(false); }}
                          className="w-full text-left flex items-center gap-2 p-2 hover:bg-slate-50 rounded text-slate-700"
                        >
                          <Eraser className="w-4 h-4" /> Clear All Tasks
                        </button>
                      </div>

                      <div className="p-3 border-b border-slate-100">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2 flex items-center gap-2">
                           <PaintBucket className="w-3 h-3" /> Header Color
                        </span>
                        <div className="grid grid-cols-5 gap-1">
                          {LIST_COLORS.map((c) => (
                            <button
                              key={c.name}
                              onClick={() => handleColorChange(c.class)}
                              className={`w-8 h-6 rounded border border-slate-200 hover:scale-110 transition-transform ${c.class === 'bg-transparent' ? 'bg-white' : c.class} ${list.headerColor === c.class ? 'ring-2 ring-indigo-500 ring-offset-1' : ''}`}
                              title={c.name}
                            >
                                {c.class === 'bg-transparent' && <span className="text-[10px] text-slate-400">/</span>}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="p-2">
                        <button 
                          onClick={() => { onDeleteList(list.id); setIsMenuOpen(false); }}
                          className="w-full text-left flex items-center gap-2 p-2 hover:bg-red-50 text-red-600 rounded"
                        >
                          <Trash2 className="w-4 h-4" /> Delete List
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Tasks Area */}
            <Droppable droppableId={list.id} type="task">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`p-2 flex-1 overflow-y-auto min-h-[50px] transition-colors scrollbar-thin scrollbar-thumb-slate-300 ${
                    snapshot.isDraggingOver ? 'bg-slate-200/50' : ''
                  }`}
                >
                  {tasks.map((task, idx) => (
                    <TaskCard 
                      key={task.id} 
                      task={task} 
                      index={idx} 
                      allUsers={allUsers}
                      onClick={onTaskClick}
                    />
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>

            {/* Footer / Create Task */}
            <div className="p-3 pt-0">
              {isCreating ? (
                <div className="mt-2 animate-fade-in">
                  <textarea
                    autoFocus
                    placeholder="Enter a title for this card..."
                    className="w-full p-2 text-sm border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none mb-2 bg-white text-slate-900"
                    rows={3}
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyDown={handleTaskKeyDown}
                    onBlur={() => !newTaskTitle.trim() && setIsCreating(false)}
                  />
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={handleSubmitTask}
                      className="bg-indigo-600 text-white text-sm px-3 py-1.5 rounded hover:bg-indigo-700 transition-colors"
                    >
                      Add Card
                    </button>
                    <button 
                      onClick={() => setIsCreating(false)}
                      className="text-slate-500 hover:text-slate-800 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => setIsCreating(true)}
                  className="w-full flex items-center gap-2 text-slate-500 hover:bg-slate-200 p-2 rounded-lg transition-colors text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add a card</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
};

export default TaskList;