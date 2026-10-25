import type { Command, Dir } from '../../engine';
import { button, h, icon } from '../dom';
import type { AppState, Store } from '../store';
import { previewRotation } from '../rules';
import { actionPanel, dialog } from './actions';
import { createBoardView } from './board';
import { logPanel, playersPanel } from './panels';

const KEY_DIRS: Record<string, Dir> = {
    ArrowUp: 'N',
    w: 'N',
    ArrowRight: 'E',
    d: 'E',
    ArrowDown: 'S',
    s: 'S',
    ArrowLeft: 'W',
    a: 'W',
};

/** Mounts the game screen; returns a function that tears it down. */
export function mountGame(root: HTMLElement, store: Store, onNewGame: () => void): () => void {
    const board = createBoardView(store);
    const header = h('header', { class: 'app-header' });
    const players = h('aside', { class: 'app-players' });
    const actions = h('section', { class: 'card bg-base-200 p-3' });
    const log = h('section', { class: 'card bg-base-200 p-3 app-log' });
    const overlay = h('div');
    const toast = h('div', { class: 'toast toast-top toast-center z-50' });

    root.replaceChildren(
        h(
            'div',
            { class: 'app-layout' },
            header,
            players,
            h('main', { class: 'app-board' }, board.el),
            h('aside', { class: 'app-side' }, actions, log),
        ),
        overlay,
        toast,
    );

    let turnKey = '';
    const render = (app: AppState) => {
        const { game } = app;
        const active = game.players[game.currentPlayerIndex];
        header.replaceChildren(
            h(
                'h1',
                { class: 'text-xl font-bold' },
                icon('fa-dungeon', 'mr-2 text-warning'),
                'Karak',
            ),
            h('span', { class: 'badge badge-outline' }, `Round ${game.round}`),
            h('span', { class: 'truncate' }, active ? `${active.name} to play` : ''),
            h(
                'span',
                { class: 'text-xs opacity-60 hidden md:inline' },
                `${game.tilePile.length} tiles left · ${game.bag.length} tokens in the bag`,
            ),
            h(
                'div',
                { class: 'ml-auto flex gap-2' },
                button(
                    [icon('fa-crosshairs', 'mr-1'), 'Centre'],
                    () => active && board.centerOn(active.position),
                    'btn btn-sm btn-ghost',
                    'Centre the view on the active hero',
                ),
                button([icon('fa-plus', 'mr-1'), 'New game'], onNewGame, 'btn btn-sm btn-ghost'),
            ),
        );
        players.replaceChildren(playersPanel(game));
        actions.replaceChildren(actionPanel(app, store));
        log.replaceChildren(h('h2', { class: 'font-semibold mb-1' }, 'Log'), logPanel(app.log));
        const scroller = log.querySelector('.log-scroll');
        if (scroller) scroller.scrollTop = scroller.scrollHeight;
        board.render(app);
        const modal = dialog(app, store, onNewGame);
        overlay.replaceChildren(...(modal ? [modal] : []));
        toast.replaceChildren(
            ...(app.toast ? [h('div', { class: 'alert alert-warning py-2' }, app.toast)] : []),
        );

        // Follow the action: centre on the hero when a turn starts or they near the edge.
        const key = `${game.round}:${game.currentPlayerIndex}`;
        if (active && key !== turnKey) {
            turnKey = key;
            requestAnimationFrame(() => board.centerOn(active.position));
        } else if (active) {
            requestAnimationFrame(() => board.keepInView(active.position));
        }
    };

    const controller = new AbortController();
    document.addEventListener(
        'keydown',
        (e) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement)
                return;
            const app = store.get();
            const phase = app.game.turn.phase;
            const pid = app.game.players[app.game.currentPlayerIndex]?.id ?? '';
            if (e.key === 'Escape' && app.ui.portal) {
                store.setUi({ portal: null });
                return;
            }
            if (phase.type === 'placingTile') {
                if (e.key === 'r' || e.key === 'R') {
                    store.setUi({ previewIndex: app.ui.previewIndex + 1 });
                } else if (e.key === 'Enter' && !(e.target instanceof HTMLButtonElement)) {
                    const rotation = previewRotation(phase, app.ui.previewIndex);
                    store.dispatch({ type: 'placeTile', playerId: pid, rotation });
                }
                return;
            }
            const dir = KEY_DIRS[e.key.length === 1 ? e.key.toLowerCase() : e.key];
            if (!dir || app.ui.portal) return;
            e.preventDefault();
            const move = app.legal.find(
                (c): c is Extract<Command, { type: 'move' }> => c.type === 'move' && c.dir === dir,
            );
            if (move) store.dispatch(move);
            else if (phase.type === 'awaitingAction') store.toast('You can’t go that way.');
        },
        { signal: controller.signal },
    );

    store.subscribe(render);
    render(store.get());
    return () => controller.abort();
}
