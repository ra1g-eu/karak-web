import {
    applyCommand,
    type Command,
    type GameEvent,
    type GameState,
    legalCommands,
} from '../engine';
import { saveGame } from './persistence';
import { describeEvents } from './text';

export interface LogEntry {
    round: number;
    text: string;
}

/** Client-only UI state: never part of the game, never saved. */
export interface UiState {
    /** Portal of Healing is being aimed: first pick a hero, then a fountain. */
    portal: null | { stage: 'target' } | { stage: 'destination'; targetId: string };
    /** Index into the drawn tile's valid rotations. */
    previewIndex: number;
}

export interface AppState {
    game: GameState;
    /** Cached legalCommands(game); recomputed whenever the game changes. */
    legal: Command[];
    log: LogEntry[];
    ui: UiState;
    toast: string | null;
}

type Listener = (app: AppState) => void;

const MAX_LOG = 300;
const freshUi = (): UiState => ({ portal: null, previewIndex: 0 });

export interface Store {
    get(): AppState;
    dispatch(command: Command): boolean;
    setUi(patch: Partial<UiState>): void;
    toast(message: string): void;
    subscribe(listener: Listener): void;
}

/**
 * Holds the current game and is the only place that calls the engine. Every accepted command
 * is logged and saved; rejected ones raise a toast.
 */
export function createStore(
    game: GameState,
    log: LogEntry[],
    startEvents: GameEvent[] = [],
): Store {
    let app: AppState = {
        game,
        legal: legalCommands(game),
        log: [...log, ...toEntries(startEvents, game)].slice(-MAX_LOG),
        ui: freshUi(),
        toast: null,
    };
    const listeners: Listener[] = [];
    let toastTimer: ReturnType<typeof setTimeout> | undefined;

    const emit = () => listeners.forEach((l) => l(app));
    saveGame({ game: app.game, log: app.log });

    return {
        get: () => app,
        dispatch(command) {
            const result = applyCommand(app.game, command);
            if (!result.ok) {
                this.toast(result.error);
                return false;
            }
            const phaseChanged = result.state.turn.phase.type !== app.game.turn.phase.type;
            app = {
                ...app,
                game: result.state,
                legal: legalCommands(result.state),
                log: [...app.log, ...toEntries(result.events, result.state)].slice(-MAX_LOG),
                ui: phaseChanged || command.type === 'castPortal' ? freshUi() : app.ui,
            };
            saveGame({ game: app.game, log: app.log });
            emit();
            return true;
        },
        setUi(patch) {
            app = { ...app, ui: { ...app.ui, ...patch } };
            emit();
        },
        toast(message) {
            app = { ...app, toast: message };
            emit();
            clearTimeout(toastTimer);
            toastTimer = setTimeout(() => {
                app = { ...app, toast: null };
                emit();
            }, 3500);
        },
        subscribe(listener) {
            listeners.push(listener);
        },
    };
}

function toEntries(events: GameEvent[], state: GameState): LogEntry[] {
    return describeEvents(events, state).map((text) => ({ round: state.round, text }));
}
