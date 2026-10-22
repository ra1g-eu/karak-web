import { sameCoord, tileAt } from '../board';
import { type Ctx, currentPlayer, fail, requirePhase } from '../context';
import { slotOf, WEAPON_BONUS } from '../data/items';
import { MONSTERS } from '../data/monsters';
import { rollD6 } from '../rng';
import type { Coord, GameState, ItemId, MonsterId } from '../types';
import { addItem, carries, hasRoomFor, removeItem } from './inventory';
import { finishGame } from './scoring';

/** R-ROOM-c, R-MOVE-3: entering a monster's tile starts combat. */
export function startCombat(ctx: Ctx, monster: MonsterId, at: Coord): void {
    ctx.state.turn.phase = { type: 'combat', monster, at: { ...at }, dice: null, boltsUsed: 0 };
    ctx.events.push({
        type: 'combatStarted',
        playerId: currentPlayer(ctx.state).id,
        monster,
        at: { ...at },
    });
}

/** R-COMBAT-1 step 1 */
export function rollDice(ctx: Ctx): void {
    const phase = requirePhase(ctx.state, 'combat');
    if (phase.dice) fail('already-rolled', 'The dice have already been rolled');
    phase.dice = [rollD6(ctx.state), rollD6(ctx.state)];
    ctx.events.push({
        type: 'diceRolled',
        playerId: currentPlayer(ctx.state).id,
        dice: [...phase.dice],
    });
}

/** R-BOLT-1: +1 per bolt, only after the roll; the spell is discarded (R-SPELL-1). */
export function useBolt(ctx: Ctx): void {
    const phase = requirePhase(ctx.state, 'combat');
    if (!phase.dice) fail('not-rolled', 'Bolts can only be used after rolling');
    const player = currentPlayer(ctx.state);
    if (!carries(player, 'magicBolt')) fail('no-bolt', 'No Magic Bolt to use');
    removeItem(player, 'magicBolt');
    phase.boltsUsed++;
    ctx.events.push({ type: 'boltUsed', playerId: player.id });
}

/** R-COMBAT-1: dice + every carried weapon + bolts used. Null before the roll. */
export function combatTotal(state: GameState): number | null {
    const phase = state.turn.phase;
    if (phase.type !== 'combat' || !phase.dice) return null;
    const weapons = currentPlayer(state).weapons.reduce((sum, w) => sum + WEAPON_BONUS[w], 0);
    return phase.dice[0] + phase.dice[1] + weapons + phase.boltsUsed;
}

export function resolveCombat(ctx: Ctx): void {
    const { state } = ctx;
    const phase = requirePhase(state, 'combat');
    const total = combatTotal(state);
    if (total === null) fail('not-rolled', 'Roll the dice first');
    const player = currentPlayer(state);
    const monster = MONSTERS[phase.monster];
    const result = total > monster.strength ? 'win' : total === monster.strength ? 'tie' : 'loss';
    ctx.events.push({
        type: 'combatResolved',
        playerId: player.id,
        monster: monster.id,
        total,
        strength: monster.strength,
        result,
    });

    if (result === 'win') {
        // R-COMBAT-WIN: the monster is gone and its token becomes loot.
        const tile = tileAt(state, phase.at);
        if (tile) tile.monster = null;
        const loot = monster.loot;
        if (loot.type === 'treasure') {
            player.treasures.push(loot.treasure);
            ctx.events.push({
                type: 'treasureTaken',
                playerId: player.id,
                treasure: loot.treasure,
            });
            if (monster.id === 'dragon') {
                finishGame(ctx);
                return;
            }
        } else if (hasRoomFor(player, loot.item)) {
            addItem(player, loot.item);
            ctx.events.push({ type: 'lootTaken', playerId: player.id, item: loot.item });
        } else {
            state.turn.phase = { type: 'choosingLootDrop', loot: loot.item, at: { ...phase.at } };
            return;
        }
    } else {
        if (result === 'loss') {
            // R-COMBAT-LOSS, R-HP-1, R-HP-2
            player.hp = Math.max(0, player.hp - 1);
            ctx.events.push({ type: 'heroWounded', playerId: player.id, hp: player.hp });
            if (player.hp === 0) {
                player.unconscious = true;
                ctx.events.push({ type: 'heroFellUnconscious', playerId: player.id });
            }
        }
        retreat(ctx);
    }
    // R-COMBAT-END
    state.turn.phase = { type: 'turnEnding' };
}

/**
 * R-RETREAT, C-05: walk back along this turn's path to the first tile without a monster.
 * The turn's first tile never holds a monster, so the fallback is only a safety net.
 */
function retreat(ctx: Ctx): void {
    const { state } = ctx;
    const player = currentPlayer(state);
    const path = state.turn.path;
    let target = path[0] ?? player.position;
    for (let i = path.length - 2; i >= 0; i--) {
        const c = path[i];
        if (c && !sameCoord(c, player.position) && !tileAt(state, c)?.monster) {
            target = c;
            break;
        }
    }
    const from = { ...player.position };
    player.position = { ...target };
    path.push({ ...target });
    ctx.events.push({ type: 'heroRetreated', playerId: player.id, from, to: { ...target } });
}

/** R-COMBAT-WIN with a full slot: drop the new loot or a carried item of the same slot. */
export function chooseLootDrop(ctx: Ctx, drop: ItemId): void {
    const { state } = ctx;
    const phase = requirePhase(state, 'choosingLootDrop');
    const player = currentPlayer(state);
    const tile = tileAt(state, phase.at);
    if (!tile) throw new Error('Loot tile missing');
    const at = { ...phase.at };

    if (drop === phase.loot) {
        tile.items.push(drop);
        ctx.events.push({ type: 'itemDropped', playerId: player.id, item: drop, at });
    } else {
        if (slotOf(drop) !== slotOf(phase.loot) || !carries(player, drop)) {
            fail('bad-drop', 'Drop the new item or one you carry in the same slot');
        }
        removeItem(player, drop);
        tile.items.push(drop);
        addItem(player, phase.loot);
        ctx.events.push({ type: 'itemDropped', playerId: player.id, item: drop, at });
        ctx.events.push({ type: 'lootTaken', playerId: player.id, item: phase.loot });
    }
    state.turn.phase = { type: 'turnEnding' };
}
