import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
    HERO_IDS,
    ITEM_NAMES,
    type ItemId,
    MONSTERS,
    type MonsterId,
    type Phase,
    TILE_TYPES,
    type TreasureId,
    TREASURE_VP,
} from '../../src/engine';
import {
    chestArt,
    heroArt,
    itemArt,
    monsterArt,
    tileArt,
    treasureArt,
} from '../../src/client/assets';
import { distinctRotations, isPointlessHeal } from '../../src/client/rules';
import { describeEvents } from '../../src/client/text';
import { newGame, player } from '../engine/helpers';

/** Art URLs are relative to the site root; on disk they live in public/. */
const onDisk = (url: string) => join('public', url.replace(/^.*?images\//, 'images/'));

describe('client assets', () => {
    it('every image the UI refers to exists', () => {
        const urls = [
            ...Object.keys(TILE_TYPES).flatMap((id) => tileArt(id)?.src ?? []),
            ...(Object.keys(MONSTERS) as MonsterId[]).map(monsterArt),
            ...HERO_IDS.map(heroArt),
            ...(Object.keys(ITEM_NAMES) as ItemId[]).map(itemArt),
            ...(Object.keys(TREASURE_VP) as TreasureId[]).map(treasureArt),
            chestArt,
        ];
        const missing = urls.filter((u) => !existsSync(onDisk(u)));
        expect(missing).toEqual([]);
    });
});

describe('client rules helpers', () => {
    const placing = (typeId: string): Extract<Phase, { type: 'placingTile' }> => ({
        type: 'placingTile',
        typeId,
        at: { x: 0, y: -1 },
        validRotations: [0, 1, 2, 3],
    });

    it('offers each distinct way to place a tile once', () => {
        expect(distinctRotations(placing('tunnel-cross'))).toEqual([0]);
        expect(distinctRotations(placing('tunnel-straight'))).toEqual([0, 1]);
        expect(distinctRotations(placing('tunnel-corner'))).toEqual([0, 1, 2, 3]);
    });

    it('hides healing that would do nothing', () => {
        const state = newGame();
        const heal = {
            type: 'endTurn' as const,
            playerId: 'p1',
            action: { type: 'heal' as const },
        };
        expect(isPointlessHeal(heal, player(state))).toBe(true);
        player(state).hp = 4;
        expect(isPointlessHeal(heal, player(state))).toBe(false);
        player(state).hp = 5;
        player(state).cursed = true;
        expect(isPointlessHeal(heal, player(state))).toBe(false);
    });
});

describe('log text', () => {
    it('names players, capitalises lines and skips noise', () => {
        const state = newGame();
        const lines = describeEvents(
            [
                { type: 'tokenReturned', playerId: 'p1', token: 'chest' },
                { type: 'heroMoved', playerId: 'p1', from: { x: 0, y: 0 }, to: { x: 0, y: -1 } },
                { type: 'cursePlaced', playerId: 'p1', targetId: 'p2', fromId: null },
            ],
            state,
        );
        expect(lines).toEqual([
            'A locked chest goes back into the bag',
            'Player 1 curses Player 2',
        ]);
    });
});
