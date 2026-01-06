
import { NextResponse } from 'next/server';
import { GameEngine } from '@/lib/engine';
import { GameStorage } from '@/lib/storage';

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function POST(req: Request, { params }: RouteParams) {
    const { id: sessionId } = await params;
    const session = GameStorage.get(sessionId);

    if (!session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Only allow restart if game has started
    if (session.phase === 'LOBBY') {
        return NextResponse.json({ error: 'Cannot restart game that has not started' }, { status: 400 });
    }

    GameEngine.restartGame(session);
    GameStorage.save(session);

    return NextResponse.json({ success: true, session });
}
