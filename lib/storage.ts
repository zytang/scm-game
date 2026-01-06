
import fs from 'fs';
import path from 'path';
import { GameSession } from '@/types/game';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'sessions.json');

// In-memory fallback for environments with read-only filesystems (like Vercel)
// This will persist as long as the serverless function instance is warm.
// Using globalThis ensures it survives HMR in dev and stays accessible in production.
const globalStorage = globalThis as unknown as { _scm_sessions?: Record<string, GameSession> };
if (!globalStorage._scm_sessions) {
    globalStorage._scm_sessions = {};
}

// Ensure DB exists (Safely)
function ensureDB() {
    try {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        if (!fs.existsSync(DB_FILE)) {
            fs.writeFileSync(DB_FILE, JSON.stringify({}));
        }
        return true;
    } catch (e) {
        console.warn("Storage: Local filesystem is write-protected. Falling back to in-memory storage.");
        return false;
    }
}

type DBData = Record<string, GameSession>;

export const GameStorage = {
    getAll: (): DBData => {
        const canUseFS = ensureDB();

        // Try to read from disk first
        if (canUseFS) {
            try {
                const data = fs.readFileSync(DB_FILE, 'utf-8');
                const parsed = JSON.parse(data) as DBData;
                // Merge with in-memory to ensure latest state
                globalStorage._scm_sessions = { ...parsed, ...globalStorage._scm_sessions };
                return globalStorage._scm_sessions;
            } catch (error) {
                console.error("Error reading DB:", error);
            }
        }

        return globalStorage._scm_sessions || {};
    },

    get: (id: string): GameSession | null => {
        const data = GameStorage.getAll();
        return data[id] || null;
    },

    save: (session: GameSession): void => {
        const canUseFS = ensureDB();

        // Update memory first
        if (globalStorage._scm_sessions) {
            globalStorage._scm_sessions[session.id] = session;
        }

        // Try to persist to disk if possible
        if (canUseFS) {
            try {
                fs.writeFileSync(DB_FILE, JSON.stringify(globalStorage._scm_sessions, null, 2));
            } catch (e) {
                // Ignore write errors in production
            }
        }
    },

    update: (id: string, updater: (session: GameSession) => GameSession): GameSession | null => {
        const data = GameStorage.getAll();
        if (!data[id]) return null;

        const updated = updater({ ...data[id] });
        GameStorage.save(updated);
        return updated;
    }
};
