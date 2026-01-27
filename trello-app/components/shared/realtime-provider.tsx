'use client';

import { useBoardEvents } from '@/hooks/use-board-events';

interface RealtimeProviderProps {
  boardId: string;
  children: React.ReactNode;
}

export function RealtimeProvider({ boardId, children }: RealtimeProviderProps) {
  // S'abonner aux événements du board
  useBoardEvents({
    boardId,
    enabled: true,
  });

  return <>{children}</>;
}
