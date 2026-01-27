import { NextRequest, NextResponse } from 'next/server';
import { boardDb } from '@/db/board-db';
import { getDatabaseDebugInfo } from '@/db/database';

export const dynamic = "force-static";
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const boardId = searchParams.get('boardId');

  if (!boardId) {
    return NextResponse.json({ error: 'boardId requis' }, { status: 400 });
  }

  const board = boardDb.findById(boardId);

  return NextResponse.json({
    boardId,
    found: !!board,
    board,
    db: getDatabaseDebugInfo(),
  });
}
