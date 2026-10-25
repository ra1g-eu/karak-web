import {
    type Command,
    type Coord,
    coordKey,
    type Dir,
    getTileType,
    MONSTERS,
    openingsOf,
    parseKey,
    type PlacedTile,
    step,
} from '../../engine';
import {
    boardBackground,
    chestArt,
    heroArt,
    itemArt,
    monsterArt,
    SEAT_COLOURS,
    tileArt,
} from '../assets';
import { h, img } from '../dom';
import type { AppState, Store } from '../store';
import { previewRotation } from '../rules';
import { heroLabel, tileName } from '../text';

/** Pixel size of one dungeon tile at zoom 1. */
export const TILE = 96;

type HighlightKind = 'walk' | 'fight' | 'explore' | 'gate' | 'fountain';

interface Highlight {
    at: Coord;
    kind: HighlightKind;
    command: Command;
    label: string;
}

export interface BoardView {
    el: HTMLElement;
    render(app: AppState): void;
    centerOn(c: Coord): void;
    /** Re-centres only if the tile is near or past the edge of the view. */
    keepInView(c: Coord): void;
}

export function createBoardView(store: Store): BoardView {
    const world = h('div', { class: 'board-world' });
    const viewport = h(
        'div',
        {
            class: 'board-viewport',
            style: `background-image:url('${boardBackground}')`,
            attrs: { 'aria-label': 'Dungeon board' },
        },
        world,
    );
    let pan = { x: 0, y: 0 };
    let zoom = 1;
    let dragged = false;

    const applyTransform = () => {
        world.style.transform = `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`;
        viewport.style.backgroundPosition = `${pan.x}px ${pan.y}px`;
        viewport.style.backgroundSize = `${128 * zoom}px`;
    };

    // Drag to pan; a drag never counts as a click on a tile.
    let drag: { x: number; y: number; panX: number; panY: number } | null = null;
    viewport.addEventListener('pointerdown', (e) => {
        drag = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
        dragged = false;
    });
    window.addEventListener('pointermove', (e) => {
        if (!drag) return;
        const dx = e.clientX - drag.x;
        const dy = e.clientY - drag.y;
        if (Math.abs(dx) + Math.abs(dy) > 5) dragged = true;
        if (dragged) {
            pan = { x: drag.panX + dx, y: drag.panY + dy };
            applyTransform();
        }
    });
    window.addEventListener('pointerup', () => {
        drag = null;
    });
    // Wheel zooms around the cursor.
    viewport.addEventListener(
        'wheel',
        (e) => {
            e.preventDefault();
            const rect = viewport.getBoundingClientRect();
            const cx = e.clientX - rect.left;
            const cy = e.clientY - rect.top;
            const next = Math.min(2.5, Math.max(0.3, zoom * Math.pow(1.1, -e.deltaY / 100)));
            pan = {
                x: cx - ((cx - pan.x) / zoom) * next,
                y: cy - ((cy - pan.y) / zoom) * next,
            };
            zoom = next;
            applyTransform();
        },
        { passive: false },
    );

    const click = (fn: () => void) => () => {
        if (!dragged) fn();
    };

    const render = (app: AppState) => {
        const { game } = app;
        const nodes: HTMLElement[] = [];

        for (const [key, tile] of Object.entries(game.board)) {
            nodes.push(tileNode(parseKey(key), tile));
        }

        const phase = game.turn.phase;
        if (phase.type === 'placingTile') {
            const rotation = previewRotation(phase, app.ui.previewIndex);
            const preview = tileNode(phase.at, {
                typeId: phase.typeId,
                rotation,
                monster: null,
                chest: false,
                items: [],
            });
            preview.classList.add('tile-preview');
            preview.title = `${tileName(phase.typeId)}: click to turn it, then place it`;
            preview.addEventListener(
                'click',
                click(() => store.setUi({ previewIndex: app.ui.previewIndex + 1 })),
            );
            nodes.push(preview);
        }

        for (const hl of highlights(app)) {
            nodes.push(
                h('button', {
                    class: `board-highlight hl-${hl.kind}`,
                    style: cellStyle(hl.at),
                    title: hl.label,
                    attrs: { 'aria-label': hl.label },
                    onClick: click(() => store.dispatch(hl.command)),
                }),
            );
        }

        // Heroes, grouped so several on one tile don't cover each other.
        const byTile = new Map<string, number[]>();
        game.players.forEach((p, i) => {
            const key = coordKey(p.position);
            byTile.set(key, [...(byTile.get(key) ?? []), i]);
        });
        for (const [key, seats] of byTile) {
            const at = parseKey(key);
            seats.forEach((seat, slot) => {
                const p = game.players[seat];
                if (!p) return;
                const active = seat === game.currentPlayerIndex;
                const offset = HERO_SLOTS[slot] ?? HERO_SLOTS[0];
                nodes.push(
                    h(
                        'div',
                        {
                            class: `hero-token${active ? ' hero-active' : ''}${p.unconscious ? ' hero-down' : ''}`,
                            style: `left:${at.x * TILE + (offset?.[0] ?? 0)}px;top:${at.y * TILE + (offset?.[1] ?? 0)}px;border-color:${SEAT_COLOURS[seat] ?? '#fff'}`,
                            title: `${p.name}: ${heroLabel(p.heroId)}`,
                        },
                        img(heroArt(p.heroId), p.name, 'pixelated'),
                    ),
                );
            });
        }

        world.replaceChildren(...nodes);
    };

    const centerOn = (c: Coord) => {
        const rect = viewport.getBoundingClientRect();
        pan = {
            x: rect.width / 2 - (c.x * TILE + TILE / 2) * zoom,
            y: rect.height / 2 - (c.y * TILE + TILE / 2) * zoom,
        };
        applyTransform();
    };

    applyTransform();
    const keepInView = (c: Coord) => {
        const rect = viewport.getBoundingClientRect();
        const margin = TILE * zoom * 1.5;
        const left = pan.x + c.x * TILE * zoom;
        const top = pan.y + c.y * TILE * zoom;
        const size = TILE * zoom;
        if (
            left < margin ||
            top < margin ||
            left + size > rect.width - margin ||
            top + size > rect.height - margin
        ) {
            centerOn(c);
        }
    };

    return { el: viewport, render, centerOn, keepInView };
}

const HERO_SLOTS: [number, number][] = [
    [4, 4],
    [50, 4],
    [4, 50],
    [50, 50],
    [27, 27],
];

function cellStyle(c: Coord): string {
    return `left:${c.x * TILE}px;top:${c.y * TILE}px;width:${TILE}px;height:${TILE}px`;
}

function tileNode(at: Coord, tile: PlacedTile): HTMLElement {
    const art = tileArt(tile.typeId);
    const el = h('div', { class: 'tile', style: cellStyle(at), title: tileName(tile.typeId) });
    if (art) {
        const picture = img(art.src, '', 'tile-art pixelated');
        picture.style.transform = `rotate(${(tile.rotation - art.offset) * 90}deg)`;
        el.append(picture);
    } else {
        el.append(tileSvg(tile));
    }
    if (tile.monster) {
        const m = MONSTERS[tile.monster];
        el.append(
            h(
                'div',
                { class: 'tile-monster', title: `${m.name}, strength ${m.strength}` },
                img(monsterArt(m.id), m.name),
                h('span', { class: 'monster-strength' }, m.strength),
            ),
        );
    }
    if (tile.chest) el.append(img(chestArt, 'Locked chest', 'tile-chest'));
    if (tile.items.length) {
        el.append(
            h(
                'div',
                { class: 'tile-items' },
                ...tile.items.map((item) => img(itemArt(item), item, 'tile-item')),
            ),
        );
    }
    return el;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Drawn tile for kind/shape combos that have no art yet: floor paths to each opening. */
function tileSvg(tile: PlacedTile): SVGSVGElement {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('class', 'tile-art');
    const rect = (x: number, y: number, w: number, hh: number, fill: string) => {
        const r = document.createElementNS(SVG_NS, 'rect');
        for (const [k, v] of Object.entries({ x, y, width: w, height: hh, fill })) {
            r.setAttribute(k, String(v));
        }
        svg.append(r);
    };
    rect(0, 0, 100, 100, '#cfd6d8');
    const floor = '#d9cfbf';
    const paths: Record<Dir, [number, number, number, number]> = {
        N: [35, 0, 30, 50],
        S: [35, 50, 30, 50],
        E: [50, 35, 50, 30],
        W: [0, 35, 50, 30],
    };
    for (const d of openingsOf(tile.typeId, tile.rotation)) rect(...paths[d], floor);
    const kind = getTileType(tile.typeId).kind;
    if (kind === 'room') rect(22, 22, 56, 56, '#e7eef2');
    else rect(35, 35, 30, 30, floor);
    if (kind === 'gate' || kind === 'fountain') {
        const c = document.createElementNS(SVG_NS, 'circle');
        for (const [k, v] of Object.entries({
            cx: 50,
            cy: 50,
            r: 14,
            fill: kind === 'gate' ? '#2563eb' : '#22d3ee',
            stroke: '#334155',
            'stroke-width': 3,
        })) {
            c.setAttribute(k, String(v));
        }
        svg.append(c);
    }
    return svg;
}

/** Clickable targets, all taken from the legal commands so the board can't offer an illegal move. */
function highlights(app: AppState): Highlight[] {
    const { game, legal, ui } = app;
    const player = game.players[game.currentPlayerIndex];
    if (!player) return [];
    const out: Highlight[] = [];
    for (const command of legal) {
        if (ui.portal) {
            if (
                ui.portal.stage === 'destination' &&
                command.type === 'castPortal' &&
                command.targetId === ui.portal.targetId
            ) {
                out.push({ at: command.to, kind: 'fountain', command, label: 'Send here' });
            }
            continue;
        }
        if (command.type === 'move') {
            const to = step(player.position, command.dir);
            const tile = game.board[coordKey(to)];
            if (!tile) {
                out.push({ at: to, kind: 'explore', command, label: 'Explore' });
            } else if (tile.monster) {
                out.push({
                    at: to,
                    kind: 'fight',
                    command,
                    label: `Fight the ${MONSTERS[tile.monster].name}`,
                });
            } else {
                out.push({ at: to, kind: 'walk', command, label: 'Move here' });
            }
        } else if (command.type === 'teleport') {
            out.push({ at: command.to, kind: 'gate', command, label: 'Teleport here' });
        } else if (command.type === 'chooseFountain') {
            out.push({ at: command.to, kind: 'fountain', command, label: 'Wake up here' });
        }
    }
    return out;
}
