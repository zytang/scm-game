
import { NextResponse } from 'next/server';
import { GameStorage } from '@/lib/storage';

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    let session = await GameStorage.get(params.id);

    if (!session) {
        session = await GameStorage.getByJoinCode(params.id);
    }
    if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(session);
}
