
import { NextResponse } from 'next/server';
import { GameStorage } from '@/lib/storage';
import { Role } from '@/types/game';

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const { teamId, role, amount } = await req.json();
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

        // Allow orders only in PLAYING + ORDERING phase
        if (session.phase !== 'PLAYING' || session.roundPhase !== 'ORDERING') {
            return NextResponse.json({ error: 'Round locked' }, { status: 400 });
        }

        // Init if missing
        if (!session.pendingOrders) session.pendingOrders = {};
        if (!session.pendingOrders[teamId]) session.pendingOrders[teamId] = {};

        session.pendingOrders[teamId][role as Role] = Number(amount);

        // Check for Auto-Advance (Per-Team)
        const ROLES: Role[] = ['Retailer', 'Wholesaler', 'Distributor', 'Manufacturer'];
        const team = session.teams[teamId];

        // Check if all 4 roles in THIS team have submitted
        const teamOrders = session.pendingOrders[teamId];
        const teamComplete = team && teamOrders && ROLES.every(r => teamOrders[r] !== undefined);

        let advanced = false;
        let teamRound = team?.currentRound || 0;

        if (teamComplete) {
            const { GameEngine } = await import('@/lib/engine');
            GameEngine.processTeamRound(session, teamId);
            advanced = true;
            teamRound = team.currentRound;
        }

        GameStorage.save(session);
        return NextResponse.json({
            success: true,
            advanced,
            phase: session.phase,
            teamRound,
            sessionRound: session.currentRound
        });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}
