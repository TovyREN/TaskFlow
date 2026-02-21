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

export type MemberRole = 'ADMIN' | 'MEMBER' | 'VIEWER';

export interface WorkspaceMember {
  id: string;
  userId: string;
  user: User;
  role: MemberRole;
  joinedAt: Date;
}

export interface WorkspaceInvitation {
  id: string;
  workspaceId: string;
  inviterId: string;
  inviter: User;
  inviteeId?: string;
  invitee?: User;
  inviteeEmail: string;
  role: MemberRole;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  expiresAt?: Date;
  createdAt: Date;
}

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  color?: string;
  ownerId: string;
  owner?: User;
  members?: WorkspaceMember[];
  boards?: Board[];
  invitations?: WorkspaceInvitation[];
  createdAt: Date;
}

export interface BoardMember {
  userId: string;
  role: MemberRole;
}

export interface Board {
  id: string;
  title: string;
  color: string;
  workspaceId: string;
  labels: Tag[];
  members: BoardMember[];
  createdAt: number;
}

export type ViewState =
  | { type: 'LANDING' }
  | { type: 'LOGIN' }
  | { type: 'REGISTER' }
  | { type: 'DASHBOARD' }
  | { type: 'WORKSPACE'; workspaceId: string }
  | { type: 'BOARD'; boardId: string; workspaceId: string }
  | { type: 'NOTIFICATIONS' };

export type NotificationType = 'TASK_ASSIGNED' | 'DUE_DATE_APPROACHING' | 'WORKSPACE_INVITATION';

export interface AppNotification {
  id: string;
  type: NotificationType;
  message: string;
  isRead: boolean;
  userId: string;
  taskId?: string | null;
  task?: {
    id: string;
    title: string;
    list?: {
      board?: {
        id: string;
        workspaceId: string;
      };
    };
  } | null;
  actorId?: string | null;
  actor?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  workspaceInvitationId?: string | null;
  workspaceInvitation?: {
    id: string;
    status: string;
    role: string;
    workspace: {
      id: string;
      name: string;
      color?: string | null;
    };
  } | null;
  createdAt: string | Date;
}

export interface DragItem {
  id: string;
  type: 'TASK' | 'LIST';
  index: number;
}
