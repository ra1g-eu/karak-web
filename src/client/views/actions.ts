import {
    type BagToken,
    combatBreakdown,
    type Command,
    computeScores,
    coordKey,
    getTileType,
    ITEM_NAMES,
    MONSTERS,
    type TileAction,
} from '../../engine';
import { chestArt, heroArt, itemArt, monsterArt, tileArt, treasureArt } from '../assets';
import { button, h, icon, img } from '../dom';
import type { AppState, Store } from '../store';
import { heroLabel, tileName, tokenName, treasureName } from '../text';
import { distinctRotations, isPointlessHeal, previewRotation } from '../rules';
import { itemLabel } from './panels';

type Of<T extends Command['type']> = Extract<Command, { type: T }>;

function legalOf<T extends Command['type']>(app: AppState, type: T): Of<T>[] {
    return app.legal.filter((c): c is Of<T> => c.type === type);
}

const DICE = [
    '',
    'fa-dice-one',
    'fa-dice-two',
    'fa-dice-three',
    'fa-dice-four',
    'fa-dice-five',
    'fa-dice-six',
];

/** The right-hand panel: what the active player can do right now. */
export function actionPanel(app: AppState, store: Store): HTMLElement {
    const { game } = app;
    const player = game.players[game.currentPlayerIndex];
    if (!player) return h('div');
    const phase = game.turn.phase;

    const header = h(
        'div',
        { class: 'flex items-center gap-2' },
        img(heroArt(player.heroId), player.name, 'h-10 w-10 pixelated'),
        h(
            'div',
            { class: 'min-w-0' },
            h('div', { class: 'font-semibold truncate' }, `${player.name}’s turn`),
            h('div', { class: 'text-xs opacity-70' }, heroLabel(player.heroId)),
        ),
        h(
            'div',
            { class: 'ml-auto flex gap-1', title: `${game.turn.movesLeft} moves left` },
            ...Array.from({ length: 4 }, (_, i) =>
                h('span', { class: `move-pip ${i < game.turn.movesLeft ? 'move-pip-on' : ''}` }),
            ),
        ),
    );

    let body: (HTMLElement | null)[];
    switch (phase.type) {
        case 'awaitingAction':
            body = app.ui.portal ? portalPicker(app, store) : freeToAct(app, store);
            break;
        case 'placingTile': {
            const rotations = distinctRotations(phase);
            const index = app.ui.previewIndex % rotations.length;
            const rotation = previewRotation(phase, index);
            const art = tileArt(phase.typeId);
            body = [
                h(
                    'p',
                    {},
                    `You drew a ${tileName(phase.typeId)}. Turn it so it connects back to your tile, then place it.`,
                ),
                h(
                    'div',
                    { class: 'flex items-center gap-3' },
                    art
                        ? h(
                              'div',
                              { class: 'tile-thumb' },
                              (() => {
                                  const pic = img(art.src, tileName(phase.typeId), 'pixelated');
                                  pic.style.transform = `rotate(${(rotation - art.offset) * 90}deg)`;
                                  return pic;
                              })(),
                          )
                        : h('span', { class: 'opacity-70 text-sm' }, '(shown on the board)'),
                    rotations.length > 1
                        ? button(
                              [icon('fa-rotate-right', 'mr-1'), 'Turn'],
                              () => store.setUi({ previewIndex: index + 1 }),
                              'btn btn-sm',
                              'Shortcut: R',
                          )
                        : h('span', { class: 'text-xs opacity-60' }, 'Only one way fits'),
                ),
                button(
                    [icon('fa-check', 'mr-1'), 'Place tile'],
                    () => store.dispatch({ type: 'placeTile', playerId: player.id, rotation }),
                    'btn btn-primary btn-sm',
                    'Shortcut: Enter',
                ),
            ];
            break;
        }
        case 'turnEnding':
            body = app.ui.portal
                ? portalPicker(app, store)
                : [
                      h('p', {}, 'The fight is over.'),
                      ...endTurnButtons(app, store),
                      portalButton(app, store),
                  ];
            break;
        case 'choosingFountain':
            body = [
                h(
                    'p',
                    {},
                    'Reincarnation! Pick a healing fountain to wake up at, on the board or here.',
                ),
                ...legalOf(app, 'chooseFountain').map((c) =>
                    button(
                        `Fountain at ${c.to.x}, ${c.to.y}`,
                        () => store.dispatch(c),
                        'btn btn-sm btn-info',
                    ),
                ),
            ];
            break;
        case 'gameOver':
            body = [h('p', {}, 'The game is over.')];
            break;
        default:
            body = [h('p', { class: 'opacity-70' }, 'Make your choice in the dialog.')];
    }

    return h('div', { class: 'flex flex-col gap-3' }, header, ...body);
}

function freeToAct(app: AppState, store: Store): (HTMLElement | null)[] {
    const { game } = app;
    const player = game.players[game.currentPlayerIndex];
    if (!player) return [];
    const tile = game.board[coordKey(player.position)];
    const kind = tile ? getTileType(tile.typeId).kind : null;
    const here: (HTMLElement | null)[] = [
        kind === 'fountain'
            ? h('span', { class: 'badge badge-info' }, icon('fa-heart', 'mr-1'), 'Healing fountain')
            : null,
        kind === 'gate' ? h('span', { class: 'badge badge-primary' }, 'Teleport gate') : null,
        tile?.chest
            ? h(
                  'span',
                  { class: 'badge badge-warning' },
                  img(chestArt, '', 'h-4 w-4 mr-1'),
                  'Locked chest',
              )
            : null,
        ...(tile?.items ?? []).map((i) =>
            h('span', { class: 'badge' }, img(itemArt(i), '', 'h-4 w-4 mr-1'), ITEM_NAMES[i]),
        ),
    ];
    const swaps = legalOf(app, 'magicSwap');
    const gates = legalOf(app, 'teleport');
    return [
        h(
            'p',
            { class: 'text-sm' },
            game.turn.movesLeft > 0
                ? 'Click a highlighted square to move, explore or fight. Arrow keys or WASD work too.'
                : 'No moves left. End your turn here.',
        ),
        gates.length
            ? h('p', { class: 'text-sm text-info' }, 'Teleport: click a blue gate (1 move).')
            : null,
        here.some(Boolean) ? h('div', { class: 'flex flex-wrap gap-1' }, ...here) : null,
        ...endTurnButtons(app, store),
        portalButton(app, store),
        ...swaps.map((c) =>
            button(
                [
                    icon('fa-right-left', 'mr-1'),
                    `Magic Swap with ${game.players.find((p) => p.id === c.targetId)?.name ?? c.targetId} (all 4 moves)`,
                ],
                () => store.dispatch(c),
                'btn btn-sm btn-secondary',
            ),
        ),
    ];
}

function endTurnButtons(app: AppState, store: Store): HTMLElement[] {
    const player = app.game.players[app.game.currentPlayerIndex];
    const ends = legalOf(app, 'endTurn').filter((c) => !player || !isPointlessHeal(c, player));
    // Tile actions first; the plain end of turn last.
    ends.sort((a, b) => (a.action ? 0 : 1) - (b.action ? 0 : 1));
    return ends.map((c) =>
        button(
            endTurnLabel(c.action),
            () => store.dispatch(c),
            c.action ? 'btn btn-sm btn-accent' : 'btn btn-sm btn-success',
        ),
    );
}

function endTurnLabel(action: TileAction | undefined): string {
    if (!action) return 'End turn';
    switch (action.type) {
        case 'heal':
            return 'Heal to full and end turn';
        case 'openChest':
            return 'Open the chest and end turn';
        case 'pickUp':
            return action.drop
                ? `Pick up the ${ITEM_NAMES[action.item]}, leave the ${ITEM_NAMES[action.drop]}, end turn`
                : `Pick up the ${ITEM_NAMES[action.item]} and end turn`;
    }
}

function portalButton(app: AppState, store: Store): HTMLElement | null {
    if (!legalOf(app, 'castPortal').length) return null;
    return button(
        [img(itemArt('healingPortal'), '', 'h-5 w-5 mr-1'), 'Cast Portal of Healing'],
        () => store.setUi({ portal: { stage: 'target' } }),
        'btn btn-sm btn-info',
    );
}

function portalPicker(app: AppState, store: Store): HTMLElement[] {
    const portal = app.ui.portal;
    const casts = legalOf(app, 'castPortal');
    const cancel = button('Cancel', () => store.setUi({ portal: null }), 'btn btn-sm btn-ghost');
    if (portal?.stage === 'target') {
        const targets = [...new Set(casts.map((c) => c.targetId))];
        return [
            h('p', {}, 'Portal of Healing: who should be sent to a fountain and fully healed?'),
            ...targets.map((id) =>
                button(
                    app.game.players.find((p) => p.id === id)?.name ?? id,
                    () => store.setUi({ portal: { stage: 'destination', targetId: id } }),
                    'btn btn-sm',
                ),
            ),
            cancel,
        ];
    }
    const targetId = portal?.stage === 'destination' ? portal.targetId : '';
    return [
        h('p', {}, 'Click a highlighted fountain on the board, or pick one here.'),
        ...casts
            .filter((c) => c.targetId === targetId)
            .map((c) =>
                button(
                    `Fountain at ${c.to.x}, ${c.to.y}`,
                    () => store.dispatch(c),
                    'btn btn-sm btn-info',
                ),
            ),
        cancel,
    ];
}

/** Modal decisions: combat, loot overflow, the curse, Fateweaver, and the final scores. */
export function dialog(app: AppState, store: Store, onNewGame: () => void): HTMLElement | null {
    const { game } = app;
    const phase = game.turn.phase;
    const player = game.players[game.currentPlayerIndex];
    if (!player) return null;
    const pid = player.id;

    switch (phase.type) {
        case 'combat': {
            const monster = MONSTERS[phase.monster];
            const b = combatBreakdown(game);
            const action = (
                type: 'useBolt' | 'reroll' | 'sacrifice' | 'evade',
                label: HTMLElement | string,
                cls: string,
            ) =>
                legalOf(app, type).length
                    ? button(label, () => store.dispatch({ type, playerId: pid }), cls)
                    : null;
            const outcome = b
                ? b.total > monster.strength
                    ? ['Winning', 'text-success']
                    : b.total === monster.strength
                      ? ['Tie', 'text-warning']
                      : ['Losing', 'text-error']
                : null;
            return modal(
                `${player.name} fights the ${monster.name}`,
                h(
                    'div',
                    { class: 'flex gap-4' },
                    h(
                        'div',
                        { class: 'combat-monster' },
                        img(monsterArt(monster.id), monster.name),
                        h('span', { class: 'monster-strength' }, monster.strength),
                    ),
                    h(
                        'div',
                        { class: 'flex flex-col gap-2 grow' },
                        h(
                            'div',
                            {},
                            `Strength `,
                            h('span', { class: 'font-bold text-lg' }, monster.strength),
                        ),
                        b
                            ? h(
                                  'div',
                                  { class: 'flex flex-col gap-1' },
                                  h(
                                      'div',
                                      { class: 'flex gap-2 text-4xl' },
                                      icon(DICE[b.dice[0]] ?? ''),
                                      icon(DICE[b.dice[1]] ?? ''),
                                  ),
                                  breakdownLine('Dice', b.dice[0] + b.dice[1]),
                                  b.weapons ? breakdownLine('Weapons', b.weapons) : null,
                                  b.bolts ? breakdownLine('Magic Bolts', b.bolts) : null,
                                  b.sacrifice ? breakdownLine('Sacrifice', b.sacrifice) : null,
                                  b.farseeing ? breakdownLine('Farseeing', b.farseeing) : null,
                                  h(
                                      'div',
                                      { class: 'font-bold text-lg' },
                                      `Total ${b.total} `,
                                      outcome
                                          ? h(
                                                'span',
                                                { class: outcome[1] ?? '' },
                                                `(${outcome[0]})`,
                                            )
                                          : null,
                                  ),
                              )
                            : h(
                                  'p',
                                  { class: 'opacity-70' },
                                  'Roll 2d6. Every weapon you carry is added.',
                              ),
                    ),
                ),
                b
                    ? [
                          action('useBolt', 'Magic Bolt (+1)', 'btn btn-info btn-sm'),
                          action('reroll', 'Double Attack (reroll)', 'btn btn-secondary btn-sm'),
                          action('sacrifice', 'Sacrifice 1 HP (+1)', 'btn btn-secondary btn-sm'),
                          button(
                              'Resolve the fight',
                              () => store.dispatch({ type: 'resolveCombat', playerId: pid }),
                              'btn btn-warning btn-sm',
                          ),
                      ]
                    : [
                          action('evade', 'Stealth: slip past', 'btn btn-ghost btn-sm'),
                          button(
                              [icon('fa-dice', 'mr-1'), 'Roll the dice'],
                              () => store.dispatch({ type: 'rollDice', playerId: pid }),
                              'btn btn-warning btn-sm',
                          ),
                      ],
            );
        }
        case 'choosingLootDrop':
            return modal(
                'Your slots are full',
                h(
                    'p',
                    {},
                    `You won the ${ITEM_NAMES[phase.loot]}. Leave one item on this tile for anyone to pick up.`,
                ),
                legalOf(app, 'chooseLootDrop').map((c) =>
                    button(
                        [
                            img(itemArt(c.drop), '', 'h-6 w-6 mr-1'),
                            c.drop === phase.loot
                                ? `Leave the new ${itemLabel(c.drop)}`
                                : `Drop the ${itemLabel(c.drop)}`,
                        ],
                        () => store.dispatch(c),
                        'btn btn-sm',
                    ),
                ),
            );
        case 'choosingCurseTarget':
            return modal(
                'The curse of Karak',
                h(
                    'p',
                    {},
                    'You slew a Mummy. Choose a player to curse: they lose their hero skills until they heal at a fountain.',
                ),
                legalOf(app, 'placeCurse').map((c) =>
                    button(
                        c.targetId === null
                            ? 'Leave the curse where it is'
                            : `Curse ${game.players.find((p) => p.id === c.targetId)?.name ?? c.targetId}`,
                        () => store.dispatch(c),
                        c.targetId === null ? 'btn btn-sm btn-ghost' : 'btn btn-sm btn-secondary',
                    ),
                ),
            );
        case 'choosingToken':
            return modal(
                'Fateweaver',
                h(
                    'p',
                    {},
                    'You drew two tokens. Keep one for this room; the other goes back into the bag.',
                ),
                legalOf(app, 'chooseToken').map((c) =>
                    button(
                        [tokenImage(c.token), `Keep ${tokenName(c.token)}`],
                        () => store.dispatch(c),
                        'btn btn-sm h-auto py-2',
                    ),
                ),
            );
        case 'gameOver': {
            const scores = computeScores(game).sort((a, b) => b.vp - a.vp);
            const winners = new Set(game.result?.winnerIds ?? []);
            return modal(
                winners.size > 1 ? 'Shared victory!' : 'The dragon is slain!',
                h(
                    'table',
                    { class: 'table table-sm' },
                    h(
                        'tbody',
                        {},
                        ...scores.map((s) => {
                            const p = game.players.find((x) => x.id === s.playerId);
                            if (!p) return null;
                            return h(
                                'tr',
                                { class: winners.has(p.id) ? 'text-warning font-bold' : '' },
                                h(
                                    'td',
                                    {},
                                    winners.has(p.id) ? icon('fa-crown', 'mr-1') : null,
                                    p.name,
                                ),
                                h(
                                    'td',
                                    {},
                                    ...p.treasures.map((t) =>
                                        img(treasureArt(t), treasureName(t), 'inline h-6 w-6 mr-1'),
                                    ),
                                ),
                                h('td', { class: 'text-right' }, `${s.vp} VP`),
                            );
                        }),
                    ),
                ),
                [button('New game', onNewGame, 'btn btn-warning btn-sm')],
            );
        }
        default:
            return null;
    }
}

function breakdownLine(label: string, value: number): HTMLElement {
    return h(
        'div',
        { class: 'flex justify-between text-sm w-48' },
        h('span', { class: 'opacity-70' }, label),
        `+${value}`,
    );
}

function tokenImage(token: BagToken): HTMLElement {
    return img(
        token === 'chest' ? chestArt : monsterArt(token),
        tokenName(token),
        'h-12 w-12 mr-2 rounded',
    );
}

function modal(title: string, body: HTMLElement, actions: (HTMLElement | null)[]): HTMLElement {
    return h(
        'div',
        { class: 'dialog-backdrop' },
        h(
            'div',
            {
                class: 'card bg-base-200 shadow-xl p-5 gap-4 w-full max-w-lg',
                attrs: { role: 'dialog', 'aria-label': title },
            },
            h('h2', { class: 'text-xl font-bold' }, title),
            body,
            h('div', { class: 'flex flex-wrap justify-end gap-2' }, ...actions),
        ),
    );
}
