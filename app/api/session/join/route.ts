
import { NextResponse } from 'next/server';
import { GameEngine } from '@/lib/engine';
import { GameStorage } from '@/lib/storage';

export async function POST(req: Request) {
    try {
        let { sessionId, teamName } = await req.json();
        if (!sessionId || !teamName) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

        // TRY 1: Direct ID
        let session = GameStorage.get(sessionId);

        // TRY 2: Lookup by Join Code
        if (!session) {
            const allSessions = GameStorage.getAll();
            const foundId = Object.keys(allSessions).find(key => {
                const s = allSessions[key];
                const search = String(sessionId).toUpperCase(); // Ensure string
                return (s.joinCode && s.joinCode === search) ||
                    (s.id === sessionId) ||
                    (s.id.toUpperCase().startsWith(search) && search.length >= 4);
            });
            if (foundId) session = allSessions[foundId];
        }

        if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

        if (session.phase !== 'LOBBY') return NextResponse.json({ error: 'Game started' }, { status: 400 });

        const updatedTeam = GameEngine.addTeam(session, teamName);
        GameStorage.save(session);

        return NextResponse.json({ teamId: updatedTeam.id, team: updatedTeam });
    } catch (e) {
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}
