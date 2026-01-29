import { Board, TaskList, Task, User, Tag, Role } from '../types';

const STORAGE_KEYS = {
  USER: 'taskflow_user', // Currently logged in user
  ALL_USERS: 'taskflow_all_users', // "Database" of users
  BOARDS: 'taskflow_boards',
  LISTS: 'taskflow_lists',
  TASKS: 'taskflow_tasks',
};

// Default labels for new boards
const DEFAULT_LABELS: Tag[] = [
  { id: 'l1', name: 'Urgent', color: 'red-500' },
  { id: 'l2', name: 'Marketing', color: 'blue-500' },
  { id: 'l3', name: 'Dev', color: 'green-500' },
  { id: 'l4', name: 'Design', color: 'purple-500' },
];

export const storageService = {
  // --- Auth & User Management ---

  getUser: (): User | null => {
    const data = localStorage.getItem(STORAGE_KEYS.USER);
    return data ? JSON.parse(data) : null;
  },

  getAllUsers: (): User[] => {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.ALL_USERS) || '[]');
  },

  register: (name: string, email: string, password: string): User => {
    const users = storageService.getAllUsers();
    
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('Email already registered');
    }

    const newUser: User = {
      id: crypto.randomUUID(),
      name,
      email,
      password, // In a real app, this must be hashed!
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`
    };

    users.push(newUser);
    localStorage.setItem(STORAGE_KEYS.ALL_USERS, JSON.stringify(users));
    
    // Auto-login after register
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(newUser));
    
    // Seed default data if this is the first user ever (optional, but good for demo)
    if (users.length === 1) {
       storageService.seedInitialData(newUser);
    }
    
    return newUser;
  },

  login: (email: string, password: string): User => {
    const users = storageService.getAllUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    
    if (!user) {
      throw new Error('Invalid email or password');
    }

    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    return user;
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEYS.USER);
  },

  updateUser: (updatedUser: User) => {
    // Update in current session
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
    
    // Update in "database"
    const users = storageService.getAllUsers();
    const index = users.findIndex(u => u.id === updatedUser.id);
    if (index !== -1) {
      users[index] = updatedUser;
      localStorage.setItem(STORAGE_KEYS.ALL_USERS, JSON.stringify(users));
    }
  },

  // --- Data Seeding ---

  seedInitialData: (adminUser: User) => {
    // Only seed if empty
    if (localStorage.getItem(STORAGE_KEYS.BOARDS)) return;

    const INITIAL_BOARDS: Board[] = [
      { 
        id: 'b1', 
        title: 'Product Roadmap', 
        color: 'bg-blue-600', 
        labels: DEFAULT_LABELS, 
        members: [{ userId: adminUser.id, role: 'ADMIN' }], 
        createdAt: Date.now() 
      }
    ];

    const INITIAL_LISTS: TaskList[] = [
      { id: 'l1', boardId: 'b1', title: 'To Do', order: 0 },
      { id: 'l2', boardId: 'b1', title: 'In Progress', order: 1 },
      { id: 'l3', boardId: 'b1', title: 'Done', order: 2 },
    ];

    const INITIAL_TASKS: Task[] = [
      { 
        id: 't1', 
        listId: 'l1', 
        title: 'Welcome to TaskFlow', 
        description: 'This is a demo task. Try dragging it!', 
        tags: [{id: 'l2', name: 'Marketing', color: 'blue-500'}], 
        assignees: [adminUser.id], 
        checklists: [],
        comments: [],
        createdAt: Date.now() 
      }
    ];

    localStorage.setItem(STORAGE_KEYS.BOARDS, JSON.stringify(INITIAL_BOARDS));
    localStorage.setItem(STORAGE_KEYS.LISTS, JSON.stringify(INITIAL_LISTS));
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(INITIAL_TASKS));
  },

  // --- Boards ---

  getBoards: (): Board[] => {
    const boards = JSON.parse(localStorage.getItem(STORAGE_KEYS.BOARDS) || '[]');
    // Filter boards where user is a member (or if public/local demo logic applies)
    // For now, in this local demo, we just return all boards but ensuring members array exists
    return boards.map((b: any) => ({ ...b, members: b.members || [] }));
  },

  createBoard: (title: string, color: string): Board => {
      const currentUser = storageService.getUser();
      const newBoard: Board = {
          id: crypto.randomUUID(),
          title,
          color,
          labels: DEFAULT_LABELS,
          members: currentUser ? [{ userId: currentUser.id, role: 'ADMIN' }] : [],
          createdAt: Date.now()
      };
      storageService.saveBoard(newBoard);
      return newBoard;
  },

  saveBoard: (board: Board) => {
    const boards = storageService.getBoards();
    const existingIndex = boards.findIndex(b => b.id === board.id);
    if (existingIndex >= 0) {
      boards[existingIndex] = board;
    } else {
      boards.push(board);
    }
    localStorage.setItem(STORAGE_KEYS.BOARDS, JSON.stringify(boards));
    return board;
  },

  // --- Lists ---

  getLists: (boardId: string): TaskList[] => {
    const allLists: TaskList[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.LISTS) || '[]');
    return allLists.filter(l => l.boardId === boardId).sort((a, b) => a.order - b.order);
  },

  saveList: (list: TaskList) => {
    const allLists: TaskList[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.LISTS) || '[]');
    const existingIndex = allLists.findIndex(l => l.id === list.id);
    if (existingIndex >= 0) {
      allLists[existingIndex] = list;
    } else {
      allLists.push(list);
    }
    localStorage.setItem(STORAGE_KEYS.LISTS, JSON.stringify(allLists));
    return list;
  },

  deleteList: (listId: string) => {
      let allLists: TaskList[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.LISTS) || '[]');
      allLists = allLists.filter(l => l.id !== listId);
      localStorage.setItem(STORAGE_KEYS.LISTS, JSON.stringify(allLists));

      // Also delete tasks in that list
      storageService.clearTasksInList(listId);
  },

  // --- Tasks ---

  getTasks: (listId: string): Task[] => {
    const allTasks: Task[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS) || '[]');
    return allTasks.filter(t => t.listId === listId).map(t => ({
        ...t,
        checklists: t.checklists || [],
        comments: t.comments || [],
        assignees: t.assignees || [],
        tags: t.tags || []
    })).sort((a, b) => b.createdAt - a.createdAt);
  },

  getAllTasksForBoard: (boardId: string): Task[] => {
      const lists = storageService.getLists(boardId);
      const listIds = new Set(lists.map(l => l.id));
      const allTasks: Task[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS) || '[]');
      return allTasks.filter(t => listIds.has(t.listId)).map(t => ({
          ...t,
          checklists: t.checklists || [],
          comments: t.comments || [],
          assignees: t.assignees || [],
          tags: t.tags || []
      }));
  },

  saveTask: (task: Task) => {
    const allTasks: Task[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS) || '[]');
    const existingIndex = allTasks.findIndex(t => t.id === task.id);
    if (existingIndex >= 0) {
      allTasks[existingIndex] = task;
    } else {
      allTasks.push(task);
    }
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(allTasks));
    return task;
  },

  deleteTask: (taskId: string) => {
      let allTasks: Task[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS) || '[]');
      allTasks = allTasks.filter(t => t.id !== taskId);
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(allTasks));
  },

  clearTasksInList: (listId: string) => {
      let allTasks: Task[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS) || '[]');
      allTasks = allTasks.filter(t => t.listId !== listId);
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(allTasks));
  },

  // Helper for mock data creation
  createUser: (name: string, email: string): User => {
    return {
        id: crypto.randomUUID(),
        name,
        email,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`
    };
  }
};