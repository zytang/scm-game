
import { NextResponse } from 'next/server';
import { GameStorage } from '@/lib/storage';
import { GameEngine } from '@/lib/engine';

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const { teamId } = await req.json();

    if (!teamId) {
        return NextResponse.json({ error: 'teamId required' }, { status: 400 });
    }

    let session = await GameStorage.get(params.id);

    if (!session) {
        session = await GameStorage.getByJoinCode(params.id);
    }

    if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (session.phase !== 'PLAYING') {
        return NextResponse.json({ error: 'Game not in playing phase' }, { status: 400 });
    }

    const team = session.teams[teamId];
    if (!team) {
        return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    GameEngine.processTeamRound(session, teamId);
    await GameStorage.save(session);

    return NextResponse.json({
        success: true,
        teamRound: team.currentRound,
        phase: session.phase
    });
}
