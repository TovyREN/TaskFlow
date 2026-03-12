"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd';
import { getBoardDetails, createList, createTask, reorderTasksInList, moveTaskToList, reorderLists, getWorkspaceBoards, updateList, deleteList, clearListTasks } from '../app/actions/boardActions';
import { Plus, Loader2, X, Settings, Calendar, Grid } from 'lucide-react';
import TaskDetailModal from './board/TaskDetailModal';
import BoardAdminPanel from './board/BoardAdminPanel';
import GanttView from './board/GanttView';
import BoardTabs from './board/BoardTabs';
import TaskListComponent from './board/TaskList';
import { useSocket } from './SocketProvider';

interface BoardViewProps {
  boardId: string;
  userId: string;
  workspaceId: string;
  onBack: () => void;
  onSwitchBoard: (boardId: string) => void;
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

export default function BoardView({ boardId, userId, workspaceId, onBack, onSwitchBoard, isAdmin = false }: BoardViewProps) {
  const [board, setBoard] = useState<DBBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddingList, setIsAddingList] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');
  const [addingTaskToListId, setAddingTaskToListId] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [viewMode, setViewMode] = useState<'kanban' | 'gantt'>('kanban');
  const [workspaceBoards, setWorkspaceBoards] = useState<any[]>([]);

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

  // Load workspace boards
  useEffect(() => {
    const loadWorkspaceBoards = async () => {
      const boards = await getWorkspaceBoards(workspaceId, userId);
      setWorkspaceBoards(boards);
    };
    loadWorkspaceBoards();
  }, [workspaceId, userId]);

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

    // Handle list updated (rename, color change, clear tasks)
    const handleListUpdated = (data: any) => {
      if (data.boardId !== boardId) return;
      setBoard(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          lists: prev.lists.map((l: any) =>
            l.id === data.list.id ? { ...l, ...data.list, tasks: data.list.tasks || l.tasks } : l
          )
        };
      });
    };

    // Handle list deleted
    const handleListDeleted = (data: any) => {
      if (data.boardId !== boardId) return;
      setBoard(prev => {
        if (!prev) return prev;
        return { ...prev, lists: prev.lists.filter((l: any) => l.id !== data.listId) };
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

    // Handle task detail changes (labels, assignees, checklists, comments)
    // These trigger a reload to update task card badges
    const handleTaskDetailChange = (data: any) => {
      if (data.boardId !== boardId) return;
      loadBoard();
    };

    // Register event listeners
    on('list:created', handleListCreated);
    on('list:updated', handleListUpdated);
    on('list:deleted', handleListDeleted);
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
    // Task detail events
    on('task:label-added', handleTaskDetailChange);
    on('task:label-removed', handleTaskDetailChange);
    on('task:assignee-added', handleTaskDetailChange);
    on('task:assignee-removed', handleTaskDetailChange);
    on('task:checklist-created', handleTaskDetailChange);
    on('task:checklist-deleted', handleTaskDetailChange);
    on('task:checklist-item-added', handleTaskDetailChange);
    on('task:checklist-item-updated', handleTaskDetailChange);
    on('task:checklist-item-deleted', handleTaskDetailChange);
    on('task:comment-added', handleTaskDetailChange);
    on('task:comment-deleted', handleTaskDetailChange);

    // Handle board created in workspace
    const handleBoardCreatedInWorkspace = (data: any) => {
      if (data.workspaceId !== workspaceId) return;
      setWorkspaceBoards(prev => [data.board, ...prev]);
    };

    // Handle board deleted from workspace
    const handleBoardDeletedFromWorkspace = (data: any) => {
      if (data.workspaceId !== workspaceId) return;
      setWorkspaceBoards(prev => prev.filter(b => b.id !== data.boardId));

      // If current board deleted, go back
      if (data.boardId === boardId) {
        onBack();
      }
    };

    on('board:created', handleBoardCreatedInWorkspace);
    on('board:deleted', handleBoardDeletedFromWorkspace);

    return () => {
      leaveBoard(boardId);
      off('list:created', handleListCreated);
      off('list:updated', handleListUpdated);
      off('list:deleted', handleListDeleted);
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
      // Task detail events
      off('task:label-added', handleTaskDetailChange);
      off('task:label-removed', handleTaskDetailChange);
      off('task:assignee-added', handleTaskDetailChange);
      off('task:assignee-removed', handleTaskDetailChange);
      off('task:checklist-created', handleTaskDetailChange);
      off('task:checklist-deleted', handleTaskDetailChange);
      off('task:checklist-item-added', handleTaskDetailChange);
      off('task:checklist-item-updated', handleTaskDetailChange);
      off('task:checklist-item-deleted', handleTaskDetailChange);
      off('task:comment-added', handleTaskDetailChange);
      off('task:comment-deleted', handleTaskDetailChange);
      off('board:created', handleBoardCreatedInWorkspace);
      off('board:deleted', handleBoardDeletedFromWorkspace);
    };
  }, [boardId, workspaceId, isConnected, joinBoard, leaveBoard, on, off, onBack]);

  const handleAddList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListTitle.trim() || !board) return;

    const result = await createList(board.id, newListTitle, userId);
    if (result.success && result.list) {
      setBoard({
        ...board,
        lists: [...board.lists, { ...result.list, tasks: [] }]
      });
      setNewListTitle('');
      setIsAddingList(false);
    } else if (result.error) {
      alert(result.error);
    }
  };

  const handleAddTask = async (listId: string, title?: string) => {
    const taskTitle = title || newTaskTitle;
    if (!taskTitle.trim() || !board) return;

    const result = await createTask(listId, taskTitle, userId);
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
    } else if (result.error) {
      alert(result.error);
    }
  };

  const handleUpdateList = async (updatedList: any) => {
    if (!board) return;
    // Optimistic update
    setBoard({
      ...board,
      lists: board.lists.map((l: any) => l.id === updatedList.id ? { ...l, ...updatedList } : l)
    });
    const result = await updateList(updatedList.id, { title: updatedList.title, headerColor: updatedList.headerColor }, userId);
    if (!result.success) {
      alert(result.error || 'Failed to update list');
      loadBoard();
    }
  };

  const handleDeleteList = async (listId: string) => {
    if (!board) return;
    if (!confirm('Are you sure you want to delete this list and all its tasks?')) return;
    // Optimistic update
    setBoard({ ...board, lists: board.lists.filter((l: any) => l.id !== listId) });
    const result = await deleteList(listId, userId);
    if (!result.success) {
      alert(result.error || 'Failed to delete list');
      loadBoard();
    }
  };

  const handleClearTasks = async (listId: string) => {
    if (!board) return;
    if (!confirm('Are you sure you want to remove all tasks from this list?')) return;
    // Optimistic update
    setBoard({
      ...board,
      lists: board.lists.map((l: any) => l.id === listId ? { ...l, tasks: [] } : l)
    });
    const result = await clearListTasks(listId, userId);
    if (!result.success) {
      alert(result.error || 'Failed to clear tasks');
      loadBoard();
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
      const result = await reorderLists(board.id, newLists.map(l => l.id), userId);
      if (result.error) {
        alert(result.error);
        // Reload board on error
        loadBoard();
      }
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
      const result = await reorderTasksInList(sourceList.id, newTasks.map((t: any) => t.id), userId);
      if (result.error) {
        alert(result.error);
        loadBoard();
      }
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
      const moveResult = await moveTaskToList(movedTask.id, destList.id, destination.index, userId);
      if (moveResult.error) {
        alert(moveResult.error);
        loadBoard();
        return;
      }
      await reorderTasksInList(sourceList.id, sourceTasks.map((t: any) => t.id), userId);
      await reorderTasksInList(destList.id, destTasks.map((t: any) => t.id), userId);
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
      <div className="bg-white/50 backdrop-blur-md border-b shrink-0">
        {/* Board Tabs */}
        <BoardTabs
          boards={workspaceBoards}
          currentBoardId={boardId}
          onBoardSelect={onSwitchBoard}
        />

        {/* Header Row */}
        <div className="p-4 flex items-center gap-4">
          <button
            onClick={onBack}
            className="text-slate-600 hover:text-slate-900 font-medium px-3 py-1 hover:bg-black/5 rounded transition-colors"
          >
            ← Back
          </button>
          <h2 className="text-xl font-bold text-slate-800 flex-1">{board.title}</h2>

          {/* View Toggle Button */}
          <button
            onClick={() => setViewMode(viewMode === 'kanban' ? 'gantt' : 'kanban')}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/60 hover:bg-white/80 rounded-lg text-slate-700 text-sm font-medium transition-colors"
          >
            {viewMode === 'kanban' ? (
              <>
                <Calendar className="w-4 h-4" />
                Timeline
              </>
            ) : (
              <>
                <Grid className="w-4 h-4" />
                Board
              </>
            )}
          </button>

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
      </div>

      {/* Main Content - Conditional Rendering */}
      {viewMode === 'kanban' ? (
        /* Horizontal Scroll Area with Drag and Drop */
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
                <TaskListComponent
                  key={list.id}
                  list={list}
                  tasks={list.tasks || []}
                  index={listIndex}
                  allUsers={(board as any)?.workspace?.members?.map((m: any) => m.user) || []}
                  onTaskClick={(task: any) => setSelectedTaskId(task.id)}
                  onCreateTask={(listId: string, title: string) => handleAddTask(listId, title)}
                  onUpdateList={handleUpdateList}
                  onDeleteList={handleDeleteList}
                  onClearTasks={handleClearTasks}
                />
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
      ) : (
        /* Timeline View */
        <GanttView
          boardId={boardId}
          userId={userId}
          board={board}
          onClose={() => setViewMode('kanban')}
          onTaskClick={(taskId) => setSelectedTaskId(taskId)}
        />
      )}

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
          userId={userId}
          onClose={() => setShowAdminPanel(false)}
          onBoardUpdated={loadBoard}
        />
      )}
    </div>
  );
}