
import { GameSession } from '@/types/game';
import { kv } from '@vercel/kv';

// Fallback for local development when KV isn't configured
// Using a global variable for in-memory fallback to work across HMR/Serverless warm starts
const globalStorage = globalThis as unknown as { _scm_sessions?: Record<string, GameSession> };
if (!globalStorage._scm_sessions) {
    globalStorage._scm_sessions = {};
}

export const GameStorage = {
    get: async (id: string): Promise<GameSession | null> => {
        try {
            const session = await kv.get<GameSession>(`session:${id}`);
            if (session) {
                // Keep local memory in sync
                if (globalStorage._scm_sessions) globalStorage._scm_sessions[id] = session;
                return session;
            }
        } catch (e) {
            console.warn("Storage: KV not available, falling back to local memory.");
        }
        return globalStorage._scm_sessions?.[id] || null;
    },

    save: async (session: GameSession): Promise<void> => {
        // Update memory immediately
        if (globalStorage._scm_sessions) {
            globalStorage._scm_sessions[session.id] = session;
        }

        try {
            // Persist to Vercel KV with a 24-hour expiration (86400 seconds)
            await kv.set(`session:${session.id}`, session, { ex: 86400 });

            // Also maintain a 'joinCode' mapping so students can find sessions independently of the ID
            await kv.set(`joincode:${session.joinCode.toUpperCase()}`, session.id, { ex: 86400 });
        } catch (e) {
            console.error("Storage: Failed to save to KV", e);
        }
    },

    getByJoinCode: async (joinCode: string): Promise<GameSession | null> => {
        try {
            const id = await kv.get<string>(`joincode:${joinCode.toUpperCase()}`);
            if (id) {
                return await GameStorage.get(id);
            }
        } catch (e) {
            console.error("Storage: KV Error in getByJoinCode", e);
        }

        // Local fallback if KV fails or is empty
        const session = Object.values(globalStorage._scm_sessions || {}).find(s => s.joinCode === joinCode.toUpperCase());
        return session || null;
    },

    update: async (id: string, updater: (session: GameSession) => GameSession): Promise<GameSession | null> => {
        const session = await GameStorage.get(id);
        if (!session) return null;

        const updated = updater({ ...session });
        await GameStorage.save(updated);
        return updated;
    }
};
