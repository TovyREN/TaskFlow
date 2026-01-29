export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  password?: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string; // Tailwind color class suffix, e.g., 'red-500'
}

export interface ChecklistItem {
  id: string;
  title: string;
  isChecked: boolean;
}

export interface Checklist {
  id: string;
  title: string;
  items: ChecklistItem[];
}

export interface Comment {
  id: string;
  userId: string;
  text: string;
  createdAt: number;
}

export interface Task {
  id: string;
  listId: string;
  title: string;
  description?: string;
  tags: Tag[]; // These are labels applied to the task
  assignees: string[]; // User IDs
  startDate?: number;
  dueDate?: number;
  isDueDateDone?: boolean;
  checklists: Checklist[];
  comments: Comment[];
  createdAt: number;
}

export interface TaskList {
  id: string;
  boardId: string;
  title: string;
  order: number;
  headerColor?: string; // Optional custom background color for list header (e.g., 'bg-red-100')
}

export type Role = 'ADMIN' | 'MEMBER' | 'VIEWER';

export interface BoardMember {
  userId: string;
  role: Role;
}

export interface Board {
  id: string;
  title: string;
  color: string; // Tailwind bg class
  labels: Tag[]; // Available labels for this board
  members: BoardMember[];
  createdAt: number;
}

export type ViewState = 'LOGIN' | 'REGISTER' | 'DASHBOARD' | 'BOARD';

// For DnD
export interface DragItem {
  id: string;
  type: 'TASK' | 'LIST';
  index: number;
}