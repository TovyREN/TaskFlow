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
}
