"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { getBoardDetails, createList, createTask, reorderTasksInList, moveTaskToList, reorderLists } from '../app/actions/boardActions';
import { Plus, Loader2, X, Settings, Clock, Users, CheckSquare, MessageSquare } from 'lucide-react';
import { TaskList as TaskListType, Task } from '../types';
import TaskDetailModal from './board/TaskDetailModal';
import BoardAdminPanel from './board/BoardAdminPanel';
import { useSocket } from './SocketProvider';

interface BoardViewProps {
  boardId: string;
  userId: string;
  onBack: () => void;
  isAdmin?: boolean;
}

// Helper type - use any for DB responses since they may differ from static types
type DBBoard = {
  id: string;
  title: string;
  backgroundImage?: string | null;
  labels?: any[];
  lists: any[];
};

export default function BoardView({ boardId, userId, onBack, isAdmin = false }: BoardViewProps) {
  const [board, setBoard] = useState<DBBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddingList, setIsAddingList] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');
  const [addingTaskToListId, setAddingTaskToListId] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  const { joinBoard, leaveBoard, on, off, isConnected } = useSocket();

  const loadBoard = async () => {
    const data = await getBoardDetails(boardId);
    if (data) {
      setBoard(data as unknown as DBBoard);
    }
    setLoading(false);
  };

  // Fetch Board Data on Mount
  useEffect(() => {
    loadBoard();
  }, [boardId]);

  // Socket: Join board room and listen for real-time updates
  useEffect(() => {
    if (!isConnected || !boardId) return;

    joinBoard(boardId);

    // Handle list created
    const handleListCreated = (data: any) => {
      if (data.boardId !== boardId) return;
      setBoard(prev => {
        if (!prev) return prev;
        // Avoid duplicates
        if (prev.lists.some((l: any) => l.id === data.list.id)) return prev;
        return { ...prev, lists: [...prev.lists, { ...data.list, tasks: data.list.tasks || [] }] };
      });
    };

    // Handle task created
    const handleTaskCreated = (data: any) => {
      if (data.boardId !== boardId) return;
      setBoard(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          lists: prev.lists.map((list: any) =>
            list.id === data.listId && !list.tasks.some((t: any) => t.id === data.task.id)
              ? { ...list, tasks: [...list.tasks, data.task] }
              : list
          )
        };
      });
    };

    // Handle task updated
    const handleTaskUpdated = (data: any) => {
      if (data.boardId !== boardId) return;
      setBoard(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          lists: prev.lists.map((list: any) => ({
            ...list,
            tasks: list.tasks.map((task: any) =>
              task.id === data.taskId ? { ...task, ...data.data } : task
            )
          }))
        };
      });
    };

    // Handle task deleted
    const handleTaskDeleted = (data: any) => {
      if (data.boardId !== boardId) return;
      setBoard(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          lists: prev.lists.map((list: any) => ({
            ...list,
            tasks: list.tasks.filter((task: any) => task.id !== data.taskId)
          }))
        };
      });
    };

    // Handle task moved
    const handleTaskMoved = (data: any) => {
      if (data.boardId !== boardId) return;
      // Full reload to get proper order
      loadBoard();
    };

    // Handle task reordered
    const handleTaskReordered = (data: any) => {
      if (data.boardId !== boardId) return;
      setBoard(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          lists: prev.lists.map((list: any) => {
            if (list.id !== data.listId) return list;
            const taskMap = new Map(list.tasks.map((t: any) => [t.id, t]));
            const orderedTasks = data.taskIds.map((id: string) => taskMap.get(id)).filter(Boolean);
            return { ...list, tasks: orderedTasks };
          })
        };
      });
    };

    // Handle list reordered
    const handleListReordered = (data: any) => {
      if (data.boardId !== boardId) return;
      setBoard(prev => {
        if (!prev) return prev;
        const listMap = new Map(prev.lists.map((l: any) => [l.id, l]));
        const orderedLists = data.listIds.map((id: string) => listMap.get(id)).filter(Boolean);
        return { ...prev, lists: orderedLists };
      });
    };

    // Handle board settings changed
    const handleBoardSettingsChanged = (data: any) => {
      if (data.boardId !== boardId) return;
      loadBoard(); // Reload to get new background/title
    };

    // Handle label changes
    const handleLabelCreated = () => loadBoard();
    const handleLabelUpdated = () => loadBoard();
    const handleLabelDeleted = () => loadBoard();

    // Register event listeners
    on('list:created', handleListCreated);
    on('task:created', handleTaskCreated);
    on('task:updated', handleTaskUpdated);
    on('task:deleted', handleTaskDeleted);
    on('task:moved', handleTaskMoved);
    on('task:reordered', handleTaskReordered);
    on('list:reordered', handleListReordered);
    on('board:settings-changed', handleBoardSettingsChanged);
    on('board:label-created', handleLabelCreated);
    on('board:label-updated', handleLabelUpdated);
    on('board:label-deleted', handleLabelDeleted);

    return () => {
      leaveBoard(boardId);
      off('list:created', handleListCreated);
      off('task:created', handleTaskCreated);
      off('task:updated', handleTaskUpdated);
      off('task:deleted', handleTaskDeleted);
      off('task:moved', handleTaskMoved);
      off('task:reordered', handleTaskReordered);
      off('list:reordered', handleListReordered);
      off('board:settings-changed', handleBoardSettingsChanged);
      off('board:label-created', handleLabelCreated);
      off('board:label-updated', handleLabelUpdated);
      off('board:label-deleted', handleLabelDeleted);
    };
  }, [boardId, isConnected, joinBoard, leaveBoard, on, off]);

  const handleAddList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListTitle.trim() || !board) return;

    const result = await createList(board.id, newListTitle);
    if (result.success && result.list) {
      setBoard({
        ...board,
        lists: [...board.lists, { ...result.list, tasks: [] }]
      });
      setNewListTitle('');
      setIsAddingList(false);
    }
  };

  const handleAddTask = async (listId: string) => {
    if (!newTaskTitle.trim() || !board) return;

    const result = await createTask(listId, newTaskTitle);
    if (result.success && result.task) {
      setBoard({
        ...board,
        lists: board.lists.map((list: any) => 
          list.id === listId 
            ? { ...list, tasks: [...list.tasks, result.task] }
            : list
        )
      });
      setNewTaskTitle('');
      setAddingTaskToListId(null);
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, type } = result;

    // Dropped outside a droppable
    if (!destination || !board) return;

    // Dropped in the same place
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    // Handle list reordering
    if (type === 'LIST') {
      const newLists = Array.from(board.lists);
      const [reorderedList] = newLists.splice(source.index, 1);
      newLists.splice(destination.index, 0, reorderedList);

      // Optimistic update
      setBoard({ ...board, lists: newLists });

      // Persist to DB
      await reorderLists(board.id, newLists.map(l => l.id));
      return;
    }

    // Handle task reordering/moving
    const sourceList = board.lists.find(l => l.id === source.droppableId);
    const destList = board.lists.find(l => l.id === destination.droppableId);

    if (!sourceList || !destList) return;

    // Moving within the same list
    if (source.droppableId === destination.droppableId) {
      const newTasks = Array.from(sourceList.tasks) as any[];
      const [movedTask] = newTasks.splice(source.index, 1);
      newTasks.splice(destination.index, 0, movedTask);

      // Optimistic update
      setBoard({
        ...board,
        lists: board.lists.map((l: any) => 
          l.id === sourceList.id ? { ...l, tasks: newTasks } : l
        )
      });

      // Persist to DB
      await reorderTasksInList(sourceList.id, newTasks.map((t: any) => t.id));
    } else {
      // Moving to a different list
      const sourceTasks = Array.from(sourceList.tasks) as any[];
      const destTasks = Array.from(destList.tasks) as any[];
      const [movedTask] = sourceTasks.splice(source.index, 1);
      destTasks.splice(destination.index, 0, movedTask);

      // Optimistic update
      setBoard({
        ...board,
        lists: board.lists.map((l: any) => {
          if (l.id === sourceList.id) return { ...l, tasks: sourceTasks };
          if (l.id === destList.id) return { ...l, tasks: destTasks };
          return l;
        })
      });

      // Persist to DB - move the task and update orders
      await moveTaskToList(movedTask.id, destList.id, destination.index);
      await reorderTasksInList(sourceList.id, sourceTasks.map((t: any) => t.id));
      await reorderTasksInList(destList.id, destTasks.map((t: any) => t.id));
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-blue-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!board) {
    return <div className="p-8 text-center">Board not found. <button onClick={onBack} className="text-blue-600 underline">Go back</button></div>;
  }

  const boardBackground = board.backgroundImage 
    ? board.backgroundImage.startsWith('http') 
      ? `url(${board.backgroundImage})` 
      : board.backgroundImage.startsWith('linear-gradient')
        ? board.backgroundImage
        : board.backgroundImage
    : undefined;

  return (
    <div 
      className="h-full flex flex-col"
      style={{
        background: boardBackground || '#f0f9ff',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {/* Header */}
      <div className="p-4 flex items-center gap-4 bg-white/50 backdrop-blur-md border-b shrink-0">
        <button 
          onClick={onBack}
          className="text-slate-600 hover:text-slate-900 font-medium px-3 py-1 hover:bg-black/5 rounded transition-colors"
        >
          ← Back
        </button>
        <h2 className="text-xl font-bold text-slate-800 flex-1">{board.title}</h2>
        {isAdmin && (
          <button
            onClick={() => setShowAdminPanel(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/60 hover:bg-white/80 rounded-lg text-slate-700 text-sm font-medium transition-colors"
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
        )}
      </div>
      
      {/* Horizontal Scroll Area with Drag and Drop */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="all-lists" direction="horizontal" type="LIST">
          {(provided) => (
            <div 
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="flex-1 p-6 flex gap-6 overflow-x-auto items-start"
            >
              {/* Render Real Lists */}
              {board.lists.map((list: any, listIndex: number) => (
                <Draggable key={list.id} draggableId={list.id} index={listIndex}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`w-72 bg-slate-100 rounded-xl p-3 shrink-0 flex flex-col gap-2 shadow-sm border border-slate-200 ${
                        snapshot.isDragging ? 'rotate-2 shadow-lg' : ''
                      }`}
                    >
                      <div {...provided.dragHandleProps}>
                        <h4 className="font-semibold px-2 text-slate-700 cursor-grab">{list.title}</h4>
                      </div>
                      
                      {/* Droppable Tasks Area */}
                      <Droppable droppableId={list.id} type="TASK">
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`min-h-[20px] ${snapshot.isDraggingOver ? 'bg-blue-50 rounded' : ''}`}
                          >
                            {list.tasks.length === 0 && !snapshot.isDraggingOver && (
                              <p className="text-xs text-slate-400 text-center py-2">No tasks yet</p>
                            )}
                            {list.tasks.map((task: any, taskIndex: number) => (
                              <Draggable key={task.id} draggableId={task.id} index={taskIndex}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    onClick={() => setSelectedTaskId(task.id)}
                                    className={`bg-white p-3 mb-2 rounded-lg shadow-sm text-sm cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all ${
                                      snapshot.isDragging ? 'rotate-2 shadow-lg ring-2 ring-blue-400' : ''
                                    }`}
                                  >
                                    {/* Labels */}
                                    {task.labels && task.labels.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mb-2">
                                        {task.labels.slice(0, 3).map((tl: any) => (
                                          <span
                                            key={tl.labelId}
                                            className="h-2 w-10 rounded-full"
                                            style={{ backgroundColor: tl.label?.color }}
                                          />
                                        ))}
                                      </div>
                                    )}
                                    
                                    <span className="text-slate-800">{task.title}</span>
                                    
                                    {/* Task Badges */}
                                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                                      {task.dueDate && (
                                        <span className={`text-xs flex items-center gap-1 px-1.5 py-0.5 rounded ${
                                          new Date(task.dueDate) < new Date() 
                                            ? 'bg-red-100 text-red-600' 
                                            : 'bg-slate-100 text-slate-500'
                                        }`}>
                                          <Clock className="w-3 h-3" />
                                          {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </span>
                                      )}
                                      
                                      {task.assignees && task.assignees.length > 0 && (
                                        <div className="flex -space-x-1">
                                          {task.assignees.slice(0, 3).map((a: any) => (
                                            <div
                                              key={a.userId}
                                              className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-[10px] font-medium border border-white"
                                              title={a.user?.name || a.user?.email}
                                            >
                                              {a.user?.name?.charAt(0).toUpperCase() || a.user?.email?.charAt(0).toUpperCase()}
                                            </div>
                                          ))}
                                          {task.assignees.length > 3 && (
                                            <div className="w-5 h-5 rounded-full bg-slate-300 flex items-center justify-center text-[10px] font-medium border border-white">
                                              +{task.assignees.length - 3}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                      
                                      {task.checklists && task.checklists.length > 0 && (
                                        <span className="text-xs flex items-center gap-1 text-slate-500">
                                          <CheckSquare className="w-3 h-3" />
                                          {task.checklists.reduce((acc: number, c: any) => acc + (c.items?.filter((i: any) => i.isChecked).length || 0), 0)}/
                                          {task.checklists.reduce((acc: number, c: any) => acc + (c.items?.length || 0), 0)}
                                        </span>
                                      )}
                                      
                                      {task._count && task._count.comments > 0 && (
                                        <span className="text-xs flex items-center gap-1 text-slate-500">
                                          <MessageSquare className="w-3 h-3" />
                                          {task._count.comments}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                      
                      {/* Add Task Form/Button */}
                      {addingTaskToListId === list.id ? (
                        <div className="mt-1">
                          <textarea
                            autoFocus
                            placeholder="Enter a title for this card..."
                            className="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                            rows={3}
                            value={newTaskTitle}
                            onChange={e => setNewTaskTitle(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleAddTask(list.id);
                              }
                            }}
                          />
                          <div className="flex gap-2 mt-2">
                            <button 
                              onClick={() => handleAddTask(list.id)}
                              className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-blue-700"
                            >
                              Add Card
                            </button>
                            <button 
                              onClick={() => {
                                setAddingTaskToListId(null);
                                setNewTaskTitle('');
                              }}
                              className="text-slate-500 hover:text-slate-700 p-1.5"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setAddingTaskToListId(list.id)}
                          className="text-slate-500 hover:bg-slate-200 p-2 rounded text-left text-sm flex items-center gap-1 transition-colors"
                        >
                          <Plus className="w-4 h-4" /> Add a card
                        </button>
                      )}
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}

              {/* Add New List Button/Form */}
              <div className="w-72 shrink-0">
                {isAddingList ? (
                  <form onSubmit={handleAddList} className="bg-slate-100 p-3 rounded-xl shadow-sm border border-slate-200 animate-fade-in">
                    <input 
                      autoFocus
                      placeholder="Enter list title..."
                      className="w-full p-2 mb-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                      value={newListTitle}
                      onChange={e => setNewListTitle(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button type="submit" className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-blue-700">Add List</button>
                      <button type="button" onClick={() => setIsAddingList(false)} className="text-slate-600 hover:bg-slate-200 px-3 py-1.5 rounded text-sm">Cancel</button>
                    </div>
                  </form>
                ) : (
                  <button 
                    onClick={() => setIsAddingList(true)}
                    className="w-full bg-white/40 hover:bg-white/60 p-3 rounded-xl text-slate-700 font-medium transition-colors flex items-center gap-2 border border-transparent hover:border-white/50"
                  >
                    <Plus className="w-5 h-5" /> Add another list
                  </button>
                )}
              </div>
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Task Detail Modal */}
      {selectedTaskId && (
        <TaskDetailModal
          taskId={selectedTaskId}
          userId={userId}
          onClose={() => setSelectedTaskId(null)}
          onTaskUpdated={loadBoard}
          onTaskDeleted={loadBoard}
        />
      )}

      {/* Board Admin Panel */}
      {showAdminPanel && (
        <BoardAdminPanel
          boardId={boardId}
          onClose={() => setShowAdminPanel(false)}
          onBoardUpdated={loadBoard}
        />
      )}
    </div>
  );
}