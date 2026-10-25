import type { GameState } from '../engine';
import type { LogEntry } from './store';

const KEY = 'karak-web:save';

export interface SaveData {
    game: GameState;
    log: LogEntry[];
}

/** Browser storage can be unavailable (private mode, blocked site data); saving is best-effort. */
export function saveGame(data: SaveData): void {
    try {
        localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
        // Ignore: the game still works, it just won't survive a reload.
    }
}

export function loadGame(): SaveData | null {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return null;
        const data = JSON.parse(raw) as Partial<SaveData>;
        if (data.game?.schemaVersion !== 1 || !Array.isArray(data.game.players)) return null;
        return { game: data.game, log: Array.isArray(data.log) ? data.log : [] };
    } catch {
        return null;
    }
}

export function clearSave(): void {
    try {
        localStorage.removeItem(KEY);
    } catch {
        // Nothing to clear.
    }
}
