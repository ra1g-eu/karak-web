import '@fortawesome/fontawesome-free/css/all.min.css';
import './styles.css';
import { createGame, type GameEvent, type GameState, type PlayerConfig } from '../engine';
import { clearSave, loadGame } from './persistence';
import { createStore, type LogEntry } from './store';
import { mountGame } from './views/app';
import { renderSetup } from './views/setup';

const root = document.getElementById('app');
if (!root) throw new Error('#app element missing from index.html');
const appRoot: HTMLElement = root;

let unmount: (() => void) | null = null;

function showSetup(): void {
    unmount?.();
    unmount = null;
    renderSetup(appRoot, {
        hasSave: loadGame() !== null,
        onStart: startNewGame,
        onContinue: () => {
            const save = loadGame();
            if (save) play(save.game, save.log);
        },
    });
}

function startNewGame(players: PlayerConfig[]): void {
    const seed = crypto.getRandomValues(new Uint32Array(1))[0] ?? Date.now();
    const { state, events } = createGame({ seed, players });
    clearSave();
    play(state, [], events);
}

function play(game: GameState, log: LogEntry[], events: GameEvent[] = []): void {
    const store = createStore(game, log, events);
    unmount = mountGame(appRoot, store, () => {
        const over = store.get().game.result !== null;
        if (
            over ||
            confirm('Leave this game and start a new one? It stays saved until you start.')
        ) {
            showSetup();
        }
    });
}

showSetup();
