export interface Board {
  id: string;
  name: string;
  description: string | null;
  background: string | null;
  visibility: 'private' | 'public' | 'team';
  created_at: string;
  updated_at: string;
  owner_id: string;
}

export type BoardVisibility = 'private' | 'public' | 'team';
