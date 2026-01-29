import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd';
import { Plus, X } from 'lucide-react';
import { Board, TaskList, Task, User, Tag, Role } from '../types';
import { storageService } from '../services/storageService';
import BoardHeader from './board/BoardHeader';
import TaskListComp from './board/TaskList';
import TaskDetailModal from './board/TaskDetailModal';
import InviteModal from './board/InviteModal';

interface BoardViewProps {
  board: Board;
  currentUser: User;
  onBack: () => void;
  onUpdateBoard: (board: Board) => void;
}

const BoardView: React.FC<BoardViewProps> = ({ board, currentUser, onBack, onUpdateBoard }) => {
  const [lists, setLists] = useState<TaskList[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  
  // States
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  useEffect(() => {
    refreshData();
    setAllUsers(storageService.getAllUsers());
  }, [board.id]);

  const refreshData = () => {
    setLists(storageService.getLists(board.id));
    setTasks(storageService.getAllTasksForBoard(board.id));
  };

  // --- Handlers ---

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId, type } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    if (type === 'list') {
      const newLists = Array.from(lists);
      const [removed] = newLists.splice(source.index, 1);
      newLists.splice(destination.index, 0, removed);
      const updatedLists = newLists.map((list, index) => ({ ...list, order: index }));
      setLists(updatedLists);
      updatedLists.forEach(l => storageService.saveList(l));
      return;
    }

    const startListId = source.droppableId;
    const finishListId = destination.droppableId;

    if (startListId === finishListId) {
      const listTasks = tasks.filter(t => t.listId === startListId);
      const otherTasks = tasks.filter(t => t.listId !== startListId);
      const [removed] = listTasks.splice(source.index, 1);
      listTasks.splice(destination.index, 0, removed);
      setTasks([...otherTasks, ...listTasks]);
    } else {
      const taskToMove = tasks.find(t => t.id === draggableId);
      if (taskToMove) {
        const updatedTask = { ...taskToMove, listId: finishListId };
        storageService.saveTask(updatedTask);
        const newTasks = tasks.map(t => t.id === draggableId ? updatedTask : t);
        setTasks(newTasks);
      }
    }
  };

  const handleUpdateBoardTitle = (newTitle: string) => {
    const updated = { ...board, title: newTitle };
    storageService.saveBoard(updated);
    onUpdateBoard(updated);
  };

  const handleCreateList = (e: React.FormEvent) => {
    e.preventDefault();
    if (newListTitle.trim()) {
      const newList: TaskList = {
        id: crypto.randomUUID(),
        boardId: board.id,
        title: newListTitle,
        order: lists.length
      };
      storageService.saveList(newList);
      setLists([...lists, newList]);
      setNewListTitle('');
      setIsCreatingList(false);
    }
  };

  const handleUpdateList = (updatedList: TaskList) => {
      storageService.saveList(updatedList);
      setLists(lists.map(l => l.id === updatedList.id ? updatedList : l));
  };

  const handleDeleteList = (listId: string) => {
      if(window.confirm('Are you sure you want to delete this list and all its tasks?')) {
          storageService.deleteList(listId);
          setLists(lists.filter(l => l.id !== listId));
          setTasks(tasks.filter(t => t.listId !== listId));
      }
  };

  const handleClearListTasks = (listId: string) => {
      if(window.confirm('Are you sure you want to clear all tasks in this list?')) {
          storageService.clearTasksInList(listId);
          setTasks(tasks.filter(t => t.listId !== listId));
      }
  };

  const handleCreateTask = (listId: string, title: string) => {
    const newTask: Task = {
      id: crypto.randomUUID(),
      listId,
      title,
      tags: [],
      assignees: [],
      checklists: [],
      comments: [],
      createdAt: Date.now()
    };
    storageService.saveTask(newTask);
    setTasks([...tasks, newTask]);
  };

  const handleDeleteTask = (taskId: string) => {
    storageService.deleteTask(taskId);
    setTasks(tasks.filter(t => t.id !== taskId));
    setSelectedTask(null);
  };

  const handleInviteUser = (email: string, role: Role) => {
    const name = email.split('@')[0];
    const newUser = storageService.createUser(name, email);
    
    // Update board members
    const updatedBoard = {
      ...board,
      members: [...(board.members || []), { userId: newUser.id, role }]
    };
    storageService.saveBoard(updatedBoard);
    onUpdateBoard(updatedBoard);

    // Update local state users list
    if (!allUsers.find(u => u.id === newUser.id)) {
      setAllUsers([...allUsers, newUser]);
    }
  };

  const updateSelectedTask = (updates: Partial<Task>) => {
    if (!selectedTask) return;
    const updated = { ...selectedTask, ...updates };
    storageService.saveTask(updated);
    setSelectedTask(updated);
    setTasks(tasks.map(t => t.id === updated.id ? updated : t));
  };

  const handleUpdateBoardLabels = (newLabels: Tag[]) => {
      const updated = { ...board, labels: newLabels };
      storageService.saveBoard(updated);
      onUpdateBoard(updated);
  };

  return (
    <div className={`h-screen flex flex-col ${board.color}`}>
      <BoardHeader 
        board={board} 
        allUsers={allUsers}
        onBack={onBack}
        onUpdateTitle={handleUpdateBoardTitle}
        onInvite={() => setIsInviteModalOpen(true)}
      />

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="all-lists" direction="horizontal" type="list">
          {(provided) => (
            <div 
              className="flex-1 overflow-x-auto overflow-y-hidden px-4 py-6 flex gap-6"
              ref={provided.innerRef}
              {...provided.droppableProps}
            >
              {lists.map((list, index) => (
                <TaskListComp 
                  key={list.id} 
                  list={list} 
                  tasks={tasks.filter(t => t.listId === list.id)} 
                  index={index} 
                  allUsers={allUsers}
                  onTaskClick={setSelectedTask}
                  onCreateTask={handleCreateTask}
                  onUpdateList={handleUpdateList}
                  onDeleteList={handleDeleteList}
                  onClearTasks={handleClearListTasks}
                />
              ))}
              {provided.placeholder}
              
              {/* Add List Button */}
              <div className="w-72 shrink-0">
                {isCreatingList ? (
                  <div className="bg-white p-3 rounded-xl shadow-lg border border-slate-200">
                     <input
                        autoFocus
                        type="text"
                        placeholder="Enter list title..."
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none mb-2 text-slate-900 bg-white"
                        value={newListTitle}
                        onChange={(e) => setNewListTitle(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCreateList(e)}
                      />
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={handleCreateList}
                          className="bg-indigo-600 text-white text-sm px-3 py-1.5 rounded hover:bg-indigo-700"
                        >
                          Add List
                        </button>
                        <button 
                          onClick={() => setIsCreatingList(false)}
                          className="text-slate-500 hover:text-slate-800"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                  </div>
                ) : (
                  <button 
                    onClick={() => setIsCreatingList(true)}
                    className="w-full bg-white/20 hover:bg-white/30 text-white p-3 rounded-xl flex items-center gap-2 font-medium backdrop-blur-sm transition-all"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Add another list</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {isInviteModalOpen && (
        <InviteModal 
          onInvite={handleInviteUser} 
          onClose={() => setIsInviteModalOpen(false)} 
        />
      )}

      {selectedTask && (
        <TaskDetailModal 
          task={selectedTask}
          boardLabels={board.labels}
          allUsers={allUsers}
          currentUser={currentUser}
          onClose={() => setSelectedTask(null)}
          onUpdate={updateSelectedTask}
          onDelete={handleDeleteTask}
          onUpdateBoardLabels={handleUpdateBoardLabels}
        />
      )}
    </div>
  );
};

export default BoardView;