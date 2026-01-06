
import { NextResponse } from 'next/server';
import { GameStorage } from '@/lib/storage';
import { GameEngine } from '@/lib/engine';

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    let session = await GameStorage.get(params.id);

    if (!session) {
        session = await GameStorage.getByJoinCode(params.id);
    }

    if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (session.phase === 'LOBBY') {
        GameEngine.startGame(session);
    } else if (session.phase === 'PLAYING') {
        GameEngine.processRound(session);
    }

    await GameStorage.save(session);
    return NextResponse.json({ success: true, phase: session.phase, round: session.currentRound });
}
