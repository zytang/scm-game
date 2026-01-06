
import { NextResponse } from 'next/server';
import { GameEngine, DEMAND_PATTERNS } from '@/lib/engine';
import { GameStorage } from '@/lib/storage';

export async function POST(req: Request) {
    try {
        const body = await req.json().catch(() => ({}));

        // Handle demand pattern selection
        const demandPatternKey = body.demandPatternKey || 'D'; // Default to Pattern D
        const patternConfig = DEMAND_PATTERNS[demandPatternKey];

        const config = {
            ...body.config,
            demandPattern: patternConfig?.pattern || DEMAND_PATTERNS.D.pattern
        };

        const session = GameEngine.createSession(config);
        await GameStorage.save(session);
        return NextResponse.json({ sessionId: session.id, session });
    } catch (e) {
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}
