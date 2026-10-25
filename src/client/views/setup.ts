import { HERO_IDS, type HeroId, MAX_PLAYERS, MIN_PLAYERS, type PlayerConfig } from '../../engine';
import { heroArt, SEAT_COLOURS } from '../assets';
import { button, h, icon, img } from '../dom';
import { HERO_SKILLS, heroLabel } from '../text';

type HeroChoice = HeroId | 'random';

interface SetupOptions {
    hasSave: boolean;
    onStart: (players: PlayerConfig[]) => void;
    onContinue: () => void;
}

/** §3 Setup: player count, names, and a hero each (chosen or random, R-SETUP-4). */
export function renderSetup(root: HTMLElement, options: SetupOptions): void {
    let count = 2;
    const names: string[] = Array.from({ length: MAX_PLAYERS }, (_, i) => `Player ${i + 1}`);
    const heroes: HeroChoice[] = Array.from({ length: MAX_PLAYERS }, () => 'random');
    let error = '';

    const draw = () => {
        const rows = Array.from({ length: count }, (_, i) => playerRow(i));
        const countSelect = h(
            'select',
            {
                class: 'select select-bordered select-sm w-24',
                attrs: { 'aria-label': 'Number of players' },
            },
            ...range(MIN_PLAYERS, MAX_PLAYERS).map((n) =>
                h(
                    'option',
                    { attrs: { value: String(n), ...(n === count ? { selected: '' } : {}) } },
                    n,
                ),
            ),
        );
        countSelect.addEventListener('change', () => {
            count = Number(countSelect.value);
            draw();
        });

        root.replaceChildren(
            h(
                'main',
                { class: 'mx-auto flex max-w-5xl flex-col gap-6 p-6' },
                h(
                    'header',
                    { class: 'flex flex-wrap items-center justify-between gap-4' },
                    h(
                        'h1',
                        { class: 'text-4xl font-bold' },
                        icon('fa-dungeon', 'mr-3 text-warning'),
                        'Karak',
                    ),
                    options.hasSave
                        ? button(
                              [icon('fa-play', 'mr-2'), 'Continue saved game'],
                              options.onContinue,
                              'btn btn-primary',
                          )
                        : null,
                ),
                h(
                    'section',
                    { class: 'card bg-base-200 p-4 gap-4' },
                    h('h2', { class: 'text-xl font-semibold' }, 'New game'),
                    h('label', { class: 'flex items-center gap-3' }, 'Players', countSelect),
                    h('div', { class: 'flex flex-col gap-3' }, ...rows),
                    error ? h('div', { class: 'alert alert-error py-2' }, error) : null,
                    h(
                        'div',
                        {},
                        button([icon('fa-dice', 'mr-2'), 'Start game'], start, 'btn btn-warning'),
                    ),
                ),
                heroGuide(),
            ),
        );
    };

    const playerRow = (i: number) => {
        const nameInput = h('input', {
            class: 'input input-bordered input-sm w-48',
            attrs: { value: names[i] ?? '', maxlength: '24', 'aria-label': `Player ${i + 1} name` },
        });
        nameInput.addEventListener('input', () => {
            names[i] = nameInput.value;
        });
        const heroSelect = h(
            'select',
            {
                class: 'select select-bordered select-sm w-64',
                attrs: { 'aria-label': `Player ${i + 1} hero` },
            },
            h(
                'option',
                { attrs: { value: 'random', ...(heroes[i] === 'random' ? { selected: '' } : {}) } },
                'Random hero',
            ),
            ...HERO_IDS.map((id) =>
                h(
                    'option',
                    { attrs: { value: id, ...(heroes[i] === id ? { selected: '' } : {}) } },
                    heroLabel(id),
                ),
            ),
        );
        heroSelect.addEventListener('change', () => {
            heroes[i] = heroSelect.value as HeroChoice;
            draw();
        });
        const choice = heroes[i] ?? 'random';
        return h(
            'div',
            { class: 'flex flex-wrap items-center gap-3' },
            h('span', {
                class: 'inline-block h-4 w-4 rounded-full',
                style: `background:${SEAT_COLOURS[i] ?? '#999'}`,
            }),
            nameInput,
            heroSelect,
            choice === 'random'
                ? h(
                      'span',
                      { class: 'opacity-60 text-sm' },
                      'Picked at random from the heroes left',
                  )
                : img(heroArt(choice), heroLabel(choice), 'h-10 w-10 pixelated'),
        );
    };

    const start = () => {
        const chosen = heroes.slice(0, count);
        const picked = chosen.filter((c): c is HeroId => c !== 'random');
        if (new Set(picked).size !== picked.length) {
            error = 'Each hero can be picked by only one player.';
            return draw();
        }
        const trimmed = names.slice(0, count).map((n) => n.trim());
        if (trimmed.some((n) => !n)) {
            error = 'Every player needs a name.';
            return draw();
        }
        // Client-side randomness is fine here; the engine only sees the result.
        const pool = shuffled(HERO_IDS.filter((id) => !picked.includes(id)));
        const players = chosen.map((c, i) => ({
            name: trimmed[i] ?? `Player ${i + 1}`,
            heroId: c === 'random' ? (pool.pop() as HeroId) : c,
        }));
        options.onStart(players);
    };

    draw();
}

function heroGuide(): HTMLElement {
    return h(
        'section',
        { class: 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3' },
        ...HERO_IDS.map((id) =>
            h(
                'div',
                { class: 'card bg-base-200 p-3 flex-row gap-3' },
                img(heroArt(id), heroLabel(id), 'h-16 w-16 pixelated shrink-0'),
                h(
                    'div',
                    { class: 'text-sm' },
                    h('div', { class: 'font-semibold' }, heroLabel(id)),
                    ...(HERO_SKILLS[id] ?? []).map(([skill, text]) =>
                        h('p', {}, h('span', { class: 'text-warning' }, `${skill}: `), text),
                    ),
                ),
            ),
        ),
    );
}

function range(from: number, to: number): number[] {
    return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}

function shuffled<T>(items: T[]): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
    }
    return copy;
}
