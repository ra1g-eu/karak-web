import {
    computeScores,
    type GameState,
    ITEM_NAMES,
    type ItemId,
    type Player,
    WEAPON_BONUS,
} from '../../engine';
import { heroArt, itemArt, SEAT_COLOURS, treasureArt } from '../assets';
import { h, icon, img } from '../dom';
import type { LogEntry } from '../store';
import { HERO_SKILLS, heroLabel, treasureName } from '../text';

/** Every hero's inventory sheet (§9), active player first-highlighted. */
export function playersPanel(game: GameState): HTMLElement {
    const scores = computeScores(game);
    return h(
        'div',
        { class: 'flex flex-col gap-3' },
        ...game.players.map((p, seat) =>
            playerCard(p, seat, seat === game.currentPlayerIndex, scores[seat]?.vp ?? 0),
        ),
    );
}

function playerCard(p: Player, seat: number, active: boolean, vp: number): HTMLElement {
    const badges = [
        active ? h('span', { class: 'badge badge-warning badge-sm' }, 'Active') : null,
        p.cursed
            ? h(
                  'span',
                  { class: 'badge badge-secondary badge-sm' },
                  icon('fa-skull', 'mr-1'),
                  'Cursed',
              )
            : null,
        p.unconscious ? h('span', { class: 'badge badge-error badge-sm' }, 'Unconscious') : null,
    ];
    return h(
        'section',
        {
            class: `card bg-base-200 p-3 gap-2 border-l-4 ${active ? 'ring-2 ring-warning' : ''}`,
            style: `border-left-color:${SEAT_COLOURS[seat] ?? '#999'}`,
        },
        h(
            'div',
            { class: 'flex items-center gap-2' },
            img(heroArt(p.heroId), heroLabel(p.heroId), 'h-12 w-12 pixelated shrink-0'),
            h(
                'div',
                { class: 'min-w-0' },
                h('div', { class: 'font-semibold truncate' }, p.name),
                h(
                    'div',
                    { class: 'text-xs opacity-70', title: skillTitle(p) },
                    heroLabel(p.heroId),
                ),
            ),
        ),
        h('div', { class: 'flex flex-wrap gap-1' }, ...badges),
        h(
            'div',
            { class: 'flex items-center gap-0.5', title: `${p.hp} of ${p.maxHp} HP` },
            ...Array.from({ length: p.maxHp }, (_, i) =>
                i < p.hp ? icon('fa-heart', 'text-error') : icon('fa-skull', 'opacity-40'),
            ),
        ),
        slotRow('Weapons', 2, p.weapons),
        slotRow('Spells', 3, p.spells),
        slotRow('Key', 1, p.hasKey ? ['key'] : []),
        h(
            'div',
            { class: 'flex flex-wrap items-center gap-1 text-xs' },
            h('span', { class: 'w-16 opacity-70' }, `Treasure`),
            ...p.treasures.map((t) => img(treasureArt(t), treasureName(t), 'h-7 w-7 rounded')),
            h('span', { class: 'ml-auto font-semibold text-warning' }, `${vp} VP`),
        ),
    );
}

export function itemLabel(item: ItemId): string {
    const bonus = (WEAPON_BONUS as Partial<Record<ItemId, number>>)[item];
    return bonus ? `${ITEM_NAMES[item]} (+${bonus})` : ITEM_NAMES[item];
}

function slotRow(label: string, slots: number, items: ItemId[]): HTMLElement {
    const describe = itemLabel;
    return h(
        'div',
        { class: 'flex items-center gap-1 text-xs' },
        h('span', { class: 'w-16 opacity-70' }, label),
        ...Array.from({ length: slots }, (_, i) => {
            const item = items[i];
            return item
                ? h(
                      'span',
                      { class: 'slot', title: describe(item) },
                      img(itemArt(item), describe(item)),
                  )
                : h('span', { class: 'slot slot-empty', title: 'Empty slot' });
        }),
    );
}

function skillTitle(p: Player): string {
    return (HERO_SKILLS[p.heroId] ?? []).map(([n, t]) => `${n}: ${t}`).join('\n');
}

export function logPanel(log: LogEntry[]): HTMLElement {
    const list = h(
        'ol',
        { class: 'flex flex-col gap-1 text-sm' },
        ...log.map((entry) =>
            h(
                'li',
                { class: 'log-line' },
                h('span', { class: 'opacity-50 mr-2 tabular-nums' }, `R${entry.round}`),
                entry.text,
            ),
        ),
    );
    return h('div', { class: 'log-scroll' }, list);
}
