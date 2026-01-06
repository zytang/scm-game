
import { NextResponse } from 'next/server';
import { GameStorage } from '@/lib/storage';
import { GameEngine } from '@/lib/engine';

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    let session = GameStorage.get(params.id);

    if (!session) {
        const allSessions = GameStorage.getAll();
        const foundId = Object.keys(allSessions).find(key => {
            const s = allSessions[key];
            const search = params.id.toUpperCase();
            return (s.joinCode && s.joinCode === search) ||
                (s.id.toUpperCase().startsWith(search) && search.length >= 4);
        });
        if (foundId) session = allSessions[foundId];
    }

    if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (session.phase === 'LOBBY') {
        GameEngine.startGame(session);
    } else if (session.phase === 'PLAYING') {
        GameEngine.processRound(session);
    }

    GameStorage.save(session);
    return NextResponse.json({ success: true, phase: session.phase, round: session.currentRound });
}
