
import fs from 'fs';
import path from 'path';
import { GameSession } from '@/types/game';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'sessions.json');

// Ensure DB exists
function ensureDB() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR);
    }
    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, JSON.stringify({}));
    }
}

// Simple in-memory cache to avoid reading disk on every request in high-traffic,
// though for this use-case, direct file IO is fine and safer for "persistence".
// We will just read/write file for simplicity and reliability.

type DBData = Record<string, GameSession>;

export const GameStorage = {
    getAll: (): DBData => {
        ensureDB();
        try {
            const data = fs.readFileSync(DB_FILE, 'utf-8');
            return JSON.parse(data) as DBData;
        } catch (error) {
            console.error("Error reading DB:", error);
            return {};
        }
    },

    get: (id: string): GameSession | null => {
        const data = GameStorage.getAll();
        return data[id] || null;
    },

    save: (session: GameSession): void => {
        ensureDB();
        const data = GameStorage.getAll();
        data[session.id] = session;
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    },

    update: (id: string, updater: (session: GameSession) => GameSession): GameSession | null => {
        const data = GameStorage.getAll();
        if (!data[id]) return null;

        // Deep clone to be safe (optional but good practice)
        const original = data[id];
        // Apply update
        const updated = updater(original);

        data[id] = updated;
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
        return updated;
    }
};
