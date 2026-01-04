export interface List {
  id: string;
  board_id: string;
  title: string;
  background: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface Card {
  id: string;
  list_id: string;
  title: string;
  description: string | null;
  position: number;
  due_date: string | null;
  created_at: string;
  updated_at: string;

  // Trello-like metadata (optional)
  labels?: Array<{ id: string; name: string; color: string }>;
  assignees?: Array<{ id: string; email: string; name: string | null; avatar: string | null }>;
  commentsCount?: number;
  checklist?: { total: number; completed: number };
}
