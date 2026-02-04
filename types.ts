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
  color: string;
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
  tags: Tag[];
  assignees: string[];
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
  headerColor?: string;
}

export type Role = 'ADMIN' | 'MEMBER' | 'VIEWER';

export interface BoardMember {
  userId: string;
  role: Role;
}

export interface Board {
  id: string;
  title: string;
  color: string;
  labels: Tag[];
  members: BoardMember[];
  createdAt: number;
}

export type ViewState =
  | { type: 'LANDING' }
  | { type: 'LOGIN' }
  | { type: 'REGISTER' }
  | { type: 'DASHBOARD' }
  | { type: 'BOARD'; boardId: string };

export interface DragItem {
  id: string;
  type: 'TASK' | 'LIST';
  index: number;
}
