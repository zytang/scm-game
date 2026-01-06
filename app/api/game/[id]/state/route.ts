
import { NextResponse } from 'next/server';
import { GameStorage } from '@/lib/storage';

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
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
    return NextResponse.json(session);
}
