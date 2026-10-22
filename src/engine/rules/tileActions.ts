import { kindAt, tileAt } from '../board';
import type { TileAction } from '../commands';
import { type Ctx, currentPlayer, fail, requirePhase } from '../context';
import { slotOf } from '../data/items';
import type { ItemId } from '../types';
import { addItem, carries, hasRoomFor, removeItem } from './inventory';
import { endTurn } from './turn';

/**
 * R-END-1/2: end the turn on the current tile, optionally doing one tile action.
 * After combat (phase `turnEnding`) only healing is allowed (C-13, C-14).
 */
export function endTurnWithAction(ctx: Ctx, action: TileAction | undefined): void {
    const phase = requirePhase(ctx.state, 'awaitingAction', 'turnEnding');
    if (action) {
        if (phase.type === 'turnEnding' && action.type !== 'heal') {
            fail('after-combat', 'After a fight you can only heal before your turn ends');
        }
        switch (action.type) {
            case 'heal':
                heal(ctx);
                break;
            case 'openChest':
                openChest(ctx);
                break;
            case 'pickUp':
                pickUp(ctx, action.item, action.drop);
                break;
        }
    }
    endTurn(ctx);
}

/** R-HEAL-2, C-13: full HP, curse lifted. */
function heal(ctx: Ctx): void {
    const { state } = ctx;
    const player = currentPlayer(state);
    if (kindAt(state, player.position) !== 'fountain') {
        fail('no-fountain', 'You can only heal on a healing fountain');
    }
    const curseLifted = player.cursed;
    player.hp = player.maxHp;
    player.cursed = false;
    player.unconscious = false;
    ctx.events.push({ type: 'heroHealed', playerId: player.id, hp: player.hp, curseLifted });
}

/** R-KEY-2, R-ROOM-b, C-08 */
function openChest(ctx: Ctx): void {
    const { state } = ctx;
    const player = currentPlayer(state);
    const tile = tileAt(state, player.position);
    if (!tile?.chest) fail('no-chest', 'There is no chest here');
    if (!player.hasKey) fail('no-key', 'You need a key to open the chest');
    tile.chest = false;
    player.hasKey = false;
    player.treasures.push('chest');
    const at = { ...player.position };
    ctx.events.push({ type: 'chestOpened', playerId: player.id, at });
    ctx.events.push({ type: 'treasureTaken', playerId: player.id, treasure: 'chest' });
}

/** R-INV-2, R-INV-3, C-09 */
function pickUp(ctx: Ctx, item: ItemId, drop: ItemId | undefined): void {
    const { state } = ctx;
    const player = currentPlayer(state);
    const tile = tileAt(state, player.position);
    const index = tile?.items.indexOf(item) ?? -1;
    if (!tile || index < 0) fail('no-item', 'That item is not on this tile');
    const at = { ...player.position };

    if (!hasRoomFor(player, item)) {
        if (!drop) fail('slot-full', 'Your slot is full: choose an item to leave behind');
        if (slotOf(drop) !== slotOf(item) || !carries(player, drop)) {
            fail('bad-drop', 'Leave behind an item you carry in the same slot');
        }
    } else if (drop) {
        fail('bad-drop', 'You have room for this item; nothing needs to be dropped');
    }

    tile.items.splice(index, 1);
    if (drop) {
        removeItem(player, drop);
        tile.items.push(drop);
        ctx.events.push({ type: 'itemDropped', playerId: player.id, item: drop, at });
    }
    addItem(player, item);
    ctx.events.push({ type: 'itemPickedUp', playerId: player.id, item, at });
}
