# Project Overview — Current State

_Updated 2026-10-25 after Phase 4 (hot-seat client) of [ROADMAP.md](ROADMAP.md). The engine
implements every rule, and 2–5 people can play a full game on one screen in the browser._

## 1. What this is

This is a browser version of the board game **Karak**. The long-term goal is an online multiplayer
game with a backend server (WebSockets), a database, accounts, chat, leaderboards, and community
hubs.

The first milestone is a **fully rules-correct local hot-seat game** (2–5 players on one screen).
Gameplay comes first and visual design later.

- Rules reference: [RULES.md](RULES.md)
- Plan: [ROADMAP.md](ROADMAP.md)

## 2. How it runs

Vite + TypeScript, Node ≥ 22:

| Command | What it does |
|---|---|
| `npm install` | Install dependencies (first time) |
| `npm run dev` | Dev server at `http://localhost:5173/`: the playable game |
| `npm test` | Vitest, once (`npm run test:watch` to watch) |
| `npm run lint` | ESLint, including the engine purity rules |
| `npm run typecheck` | `tsc` twice: whole project, then `src/engine` without DOM or Node types |
| `npm run format` / `format:check` | Prettier (4 spaces, single quotes, 100 cols; skips `*.md`) |
| `npm run build` | Typecheck, then build to `dist/` with relative asset paths |

- Styling: Tailwind 4 and daisyUI 5 compiled by Vite (`src/client/styles.css`), Font Awesome 7
  from npm. The page uses daisyUI's `dark` theme.
- CI: [.github/workflows/ci.yml](../.github/workflows/ci.yml) runs lint, format check,
  typecheck, tests and build on pushes to `develop`/`main` and on pull requests.
- The old prototype (`legacy/`) was deleted in Phase 4. It's in git history up to `02581dc`.

### Engine at a glance

- `createGame({ seed, players })` returns the starting state. `applyCommand(state, command)`
  returns `{ ok, state, events }` or `{ ok: false, code, error }`, and never changes its input.
- The active player's situation is `state.turn.phase`: `awaitingAction`, `placingTile`, `combat`,
  `choosingLootDrop`, `choosingCurseTarget`, `choosingFountain` (Warrior's Reincarnation),
  `choosingToken` (Oracle's Fateweaver), `turnEnding` (after a fight) or `gameOver`.
- `legalCommands(state)` lists every command the active player may send. It filters candidates
  through `applyCommand`, so it can't disagree with the rules. `combatBreakdown(state)` splits
  a fight's total into dice, weapons, bolts and skill bonuses for the UI.
- Tile actions (heal, open chest, pick up) are options of the `endTurn` command, because each of
  them ends the turn (`R-END-2`).
- Hero skills: optional ones are commands (`reroll`, `evade`, `sacrifice`, `magicSwap`);
  automatic ones apply by themselves (Backstab, Magical Affinity, Astral Walking, Combat
  Training, Unstoppable, Farseeing). Every skill checks the curse via `hasSkill`.
- Monster strengths and the tile mix are placeholders (`Q-02`, `Q-03`).

### Client at a glance

- **No framework.** Views are functions that rebuild their part of the DOM from state on every
  change, using the small `h()` helper in `dom.ts`. Strings always become text nodes, so player
  names can never inject markup.
- **`store.ts` is the only code that calls the engine.** It holds the game, caches
  `legalCommands`, appends log lines, and saves to `localStorage` after every accepted command.
  Rejected commands show a toast.
- **Everything clickable comes from `legalCommands`:** board highlights (move, explore, fight,
  teleport, fountain picks) and every button. So the UI can't offer an illegal move.
- **UI-only state** (`UiState`) covers aiming a Portal of Healing and the drawn tile's preview
  rotation. It's never saved.
- **Screens:** setup (2–5 players, names, chosen or random heroes) → game (players | board |
  actions + log) with modal dialogs for combat, a full-slot loot choice, the curse, Fateweaver and
  the final scores. "Continue saved game" resumes after a reload.
- **Controls:** click highlighted squares, or use arrow keys/WASD to move. While placing a tile,
  R turns it and Enter places it. Drag to pan, scroll to zoom. The view follows the active hero.

## 3. Repository layout

```
index.html                 App entry (loads src/client/main.ts)
src/
  engine/                  Pure rules engine (no DOM, no Math.random)
    index.ts               Public API: createGame, applyCommand, legalCommands, data, types
    types.ts               GameState, Player, PlacedTile, Phase, …
    commands.ts            Command union (move, placeTile, teleport, rollDice, useBolt, …)
    events.ts              GameEvent union returned with every accepted command
    setup.ts               createGame(config): board, shuffled pile and bag, starting roll
    reducer.ts             applyCommand(state, command) → new state + events, or an error
    queries.ts             legalCommands, combatBreakdown, computeScores, tilesOfKind
    board.ts               Coordinates, rotations, openings, connectivity
    rng.ts                 Seeded mulberry32; its state lives in GameState.rng
    context.ts             RuleError, per-command working context, phase guard
    data/                  tiles (placeholder mix), monsters, items, heroes
    rules/                 movement (+ exploring, teleport, Fateweaver), combat (+ combat
                           skills, curse, Reincarnation), heroes (hasSkill, Magic Swap),
                           spells (Portal of Healing), inventory, tileActions (heal, chest,
                           pick up), turn, scoring
  client/
    main.ts                Boot: setup screen, new game (random seed), continue saved game
    store.ts               Game + legal commands + log + UI state; dispatch, save, toasts
    persistence.ts         localStorage save/load (best-effort, schema-checked)
    assets.ts              Art lookup: tiles (+ rotation offset), monsters, heroes, items
    rules.ts               UI helpers: distinct tile rotations, hiding pointless heals
    text.ts                Hero skill blurbs, names, event → log line
    dom.ts                 h(), icon(), img(), button()
    styles.css             Tailwind + daisyUI entry, layout, board and dialog styles
    views/
      setup.ts             New-game form and hero guide
      app.ts               Game layout, header, keyboard shortcuts, view following
      board.ts             Pan/zoom board: tiles, heroes, monsters, chests, items, highlights
      panels.ts            Player sheets and the log
      actions.ts           Action panel and modal dialogs
tests/
  engine/                  One file per rule area, helpers.ts, and a bot (simulation.ts) that
                           plays full games while checking invariants
  client/                  Asset paths exist, rotation/heal helpers, log text
public/images/             Art served at /images/… (background, classes, items, monsters, tiles)
assets/archive/            Old art versions, not served or built
vite.config.ts             Vite + Vitest config
tsconfig.json              Strict TS for the whole project (DOM + Node types for tests)
tsconfig.engine.json       Same, minus DOM and Node types, for src/engine only
eslint.config.js           ESLint flat config, engine purity rules
.github/workflows/ci.yml   CI
Karak_rules_EN_print.pdf   Official rulebook (untracked)
```

## 4. Known limitations

- **Placeholder data:** monster strengths (`Q-02`) and the tile mix (`Q-03`) are invented, and
  ties for the win are shared until `Q-01` is decided.
- **Missing tile art:** dead-end rooms, T-shaped gates and T-shaped and straight fountains have no
  art, so they're drawn as simple SVG tiles with the right openings.
- **Placeholder monster art:** the cards don't match the original bestiary, and their printed
  numbers are covered by the real strength badge (§5).
- **No animations or sound,** and no undo. Desktop-first layout; below 1100px wide the panels
  stack under the board.
- **Performance:** `legalCommands` clones the state once per candidate command. It's fine at
  this size, but revisit it if the UI ever feels slow.
- **A dungeon can close off** before the dragon appears (`Q-06`). The UI then offers nothing but
  ending turns.

## 5. Assets in use

**Tiles** (`public/images/tiles/`). The art's own orientation differs per shape, so each mapping
carries a rotation offset (`client/assets.ts`):

| Engine type | Art | Offset |
|---|---|---|
| `start`, `fountain-cross` | `c_four_way_corridor_hp_restore` | 0 |
| `tunnel-straight` / `-corner` / `-tee` / `-cross` | `c_one_way_corridor` / `c_l_corridor` / `c_t_corridor` / `c_four_way_corridor` | 0 / 2 / 1 / 0 |
| `room-straight` / `-corner` / `-tee` / `-cross` | `c_one_way_room` / `c_l_room` / `c_t_room` / `c_four_way_room` | 0 / 2 / 1 / 0 |
| `gate-straight` / `-corner` | `c_one_way_corridor_teleport` / `c_l_corridor_portal` | 0 / 2 |
| `fountain-corner` | `c_l_corridor_hp_restore` | 2 |

"One way" in the filenames means a **straight** tile with two openings. The art for corners opens
S+W and for T-pieces N+S+W. Unused so far: `c_dragon_end_game`, `c_wall`, and the custom
`c_four_way_corridor_arena` and `c_four_way_corridor_scorpio`.

**Monsters** (`public/images/monsters/`): placeholder art chosen by theme.

| Monster | Art | | Monster | Art |
|---|---|---|---|---|
| Giant Rat | `monster_squirrel_with_knife` | | Skeleton Warrior | `monster_shield_skeleton` |
| Giant Spider | `monster_scorpio` | | Skeleton King | `monster_yeti_with_sledgehammer` |
| Skeleton Turnkey | `monster_wolf_with_key` | | The Fallen | `monster_archer_ghag` |
| Mummy | `monster_cursed_wolf` | | Dragon | `monster_blue_bird` |

**Heroes** (`public/images/classes/`): Warrior `class_knight`, Thief `class_ninja`, Wizard
`class_elf_mage`, Warlock `class_mage`, Swordsman `class_arab`, Oracle `class_fox_police`. The
other nine portraits are kept for custom heroes.

**Items:** daggers, sword, axe, `item_spell_magic_shot` (Magic Bolt),
`item_spell_healing_portal`, `item_treasure_key`; treasures `item_treasure_chest_open` (chest),
`item_golden_scarab` (The Fallen), `item_gem_chest_open` (ruby). Unused custom extras: bow,
hatchet, knives, magic mace, shield, shovel, sledge hammer, rainfall, teleport, fist.

## 6. Repository state

- Branch `develop`, pushed to `github.com/ra1g-eu/karak-web`.
- `Karak_rules_EN_print.pdf` is untracked.
