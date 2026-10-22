# Project Overview — Current State

_Updated 2026-10-22 after Phase 2 (engine core) of [ROADMAP.md](ROADMAP.md). The engine plays
complete games headlessly; the browser app is still an empty shell. Sections 4–7 describe the old
prototype, now in `legacy/`._

## 1. What this is

This is a browser version of the board game **Karak**. The long-term goal is an online multiplayer
game with a backend server (WebSockets), a database, accounts, chat, leaderboards, and community
hubs.

The first step is a **fully rules-correct local hot-seat game** (2–5 players on one screen).
Gameplay comes first and visual design later.

- Rules reference: [RULES.md](RULES.md)
- Plan: [ROADMAP.md](ROADMAP.md)

## 2. How it runs

**New app** (Vite + TypeScript, Node ≥ 22):

| Command | What it does |
|---|---|
| `npm install` | Install dependencies (first time) |
| `npm run dev` | Dev server at `http://localhost:5173/` |
| `npm test` | Vitest, once (`npm run test:watch` to watch) |
| `npm run lint` | ESLint, including the engine purity rules |
| `npm run typecheck` | `tsc` twice: whole project, then `src/engine` without DOM types |
| `npm run format` / `format:check` | Prettier (4 spaces, single quotes, 100 cols; skips `*.md`) |
| `npm run build` | Typecheck, then build to `dist/` with relative asset paths |

- Styling: Tailwind 4 and daisyUI 5 compiled by Vite (`src/client/styles.css`), Font Awesome 7
  from npm. The page uses daisyUI's `dark` theme.
- CI: [.github/workflows/ci.yml](../.github/workflows/ci.yml) runs lint, format check,
  typecheck, tests and build on pushes to `develop`/`main` and on pull requests.

**Engine at a glance**

- `createGame({ seed, players })` returns the starting state. `applyCommand(state, command)`
  returns `{ ok, state, events }` or `{ ok: false, code, error }`, and never changes its input.
- The active player's situation is `state.turn.phase`: `awaitingAction`, `placingTile`, `combat`,
  `choosingLootDrop`, `turnEnding` (after a fight) or `gameOver`.
- `legalCommands(state)` lists every command the active player may send. It filters candidates
  through `applyCommand`, so it can't disagree with the rules.
- Tile actions (heal, open chest, pick up) are options of the `endTurn` command, because each of
  them ends the turn (`R-END-2`).
- Done: everything in RULES.md except Portal of Healing, the curse and hero skills (Phase 3).
  Monster strengths and the tile mix are placeholders (`Q-02`, `Q-03`).

**Old prototype** (`legacy/`): plain ES modules with the Tailwind Play CDN runtime. Open
`legacy/index.html` through any static server, for example `http://localhost:5173/legacy/` while
`npm run dev` runs, or through XAMPP. Its image paths point at `../public/images/`.

## 3. Repository layout

```
index.html                 New app entry (loads src/client/main.ts)
src/
  engine/                  Pure rules engine (no DOM, no Math.random)
    index.ts               Public API: createGame, applyCommand, legalCommands, data, types
    types.ts               GameState, Player, PlacedTile, Phase, …
    commands.ts            Command union (move, placeTile, teleport, rollDice, useBolt, …)
    events.ts              GameEvent union returned with every accepted command
    setup.ts               createGame(config): board, shuffled pile and bag, starting roll
    reducer.ts             applyCommand(state, command) → new state + events, or an error
    queries.ts             legalCommands, combatTotal, computeScores
    board.ts               Coordinates, rotations, openings, connectivity
    rng.ts                 Seeded mulberry32; its state lives in GameState.rng
    context.ts             RuleError, per-command working context, phase guard
    data/                  tiles (placeholder mix), monsters, items, heroes
    rules/                 movement (+ exploring, teleport), combat, inventory,
                           tileActions (heal, chest, pick up), turn, scoring
  client/main.ts           Renders the placeholder shell
  client/styles.css        Tailwind + daisyUI entry
tests/engine/              Vitest: one file per rule area, plus helpers.ts and a bot
                           (simulation.ts) that plays full games while checking invariants
public/images/             Art served at /images/… (background, classes, items, monsters, tiles)
assets/archive/            Old art versions (former images/*/backup), not served or built
vite.config.ts             Vite + Vitest config
tsconfig.json              Strict TS for the whole project
tsconfig.engine.json       Same, minus DOM types, for src/engine only
eslint.config.js           ESLint flat config, engine purity rules
.github/workflows/ci.yml   CI
legacy/                    Old prototype, read-only until Phase 4 deletes it:
legacy/index.html          Whole UI layout: 3 panels, modals, turn and round overlays
legacy/css/
  styles.css               Board, tile, player, event, overlay styles
  themes.css               (empty)
  daisyui@5.css, fontawesome.min.css   Vendored libraries
legacy/scripts/
  game/                    "Logic". Still imports UI code (see §6)
    gameState.js           Singleton GameState: 2 hard-coded players, map, turn and round
    gameLogic.js           initGame, tile deck instance, placement checks, class select, damage
    tileManager.js         Tile type catalogue, TileDeck, rotation and connection helpers
    eventManager.js        2 hard-coded "events" (skeleton fight, treasure chest)
    inventoryManager.js    Add, remove and check inventory items
    items.js               InventoryItem class and a few items (sword, rainfall, key, chest)
    characterManager.js    2 classes: knight, mage
  ui/
    uiEvents.js            Event wiring, UI state flags, board click, keyboard movement
    uiManager.js           Turn flow, tile placement, movement, transitions (mixes logic and UI)
    renderer.js            Absolute-positioned DOM rendering of tiles, events, players, inventory
    customModals.js        Promise and callback wrappers around <dialog> and dropdowns
  utils/helpers.js         Direction helpers, logEvent (DOM), element shortcuts
legacy/webfonts/           Font Awesome fonts for the prototype
Karak_rules_EN_print.pdf   Official rulebook (untracked)
```

## 4. What works today

- You pick a class (Knight or Mage) from a modal at startup.
- Two hard-coded players (`ra1g`, `pravdeez`) take turns, with turn and round overlays.
- **Draw Tile:** draws a random tile, which you rotate left or right, then click a cell to place.
  The hero moves onto it automatically.
- Tile placement checks that the new tile connects to the hero's tile.
- Rooms trigger a random "event": a 50/50 skeleton fight or a treasure chest.
- Movement uses arrow keys or WASD, checks that the tiles connect, and is limited to 4 actions per
  turn.
- An inventory panel shows 2 weapon slots, 1 key slot, 3 spell slots and treasures. Clicking an
  item shows its details and offers a **Delete** button.
- A game log and a tiles-remaining counter.

## 5. Gap against the rules

| Rule area | Rules ([RULES.md](RULES.md)) | Prototype |
|---|---|---|
| Players and heroes | 2–5 players, 6 unique heroes | 2 hard-coded players, 2 classes (Knight ≈ Warrior, Mage ≈ Warlock). Skills are only labels |
| Setup | Starting tile with HF, shuffled 79 tiles, bag of 53 tokens | Start tile correct (4-way HF). Deck = all 14 types once plus random fill to about 100, including the dragon tile and custom tiles |
| Exploration | Step through an opening and a tile is drawn | Separate **Draw Tile** button. You can't cancel or put the tile back |
| Rooms and bag | Draw from a finite bag of monsters and chests, once per room | Random pick from 2 events, with replacement |
| Movement | 4 moves along connected tiles; a room with a monster blocks passage | Mostly right. Also caps Manhattan distance from the turn's start, which isn't a rule |
| Combat | 2d6 + weapons + bolts + skills against strength. Loss = wound and step back | 50% coin flip. The hero isn't pushed back on loss. Monster `hp: 8` is unused |
| Inventory | Overflow dropped on the tile, can be picked up | "Delete item" destroys it |
| HP and unconsciousness | 0 HP = skip a turn, heal 1. HF heals fully | 0 HP wipes the inventory and sets `isDead`, which nothing reads |
| Healing fountains, TGs | Heal on ending the turn there; teleport between TGs | Asks "use effect?" and does nothing, then ends the turn |
| Keys and chests | Key opens a chest when the turn ends there | Chest can never be collected (bug #3 below) |
| Spells, curse | Magic Bolt, Portal of Healing, curse | Not implemented |
| End of game | Dragon slain, most VP wins | Not implemented |

## 6. Architecture problems (why we're refactoring)

1. **Logic and UI are tangled.** Game modules call DOM code (`logEvent`, `updatePlayerInfo`, modals),
   and UI modules mutate game state directly. The rules can't run on a server or in tests.
2. **Circular imports**, for example `eventManager → uiEvents → uiManager → eventManager` and
   `inventoryManager → renderer → inventoryManager`.
3. **Mutable singleton state** with object references (shared `emptySlot` instances, class
   objects). It can't be serialized cleanly for save, load, or network sync.
4. **No seeded randomness** (`Math.random()` everywhere), so games can't be replayed or tested
   deterministically, and a server can't verify a move.
5. **Turn flow is spread out.** `handleEndTurn` is called from events, tile placement and
   movement, which leads to double turn-ends.
6. **UI flow state is held in module variables** (`placingTile`, `currentRotation`, …) instead of an
   explicit turn phase.
7. **Rendering rebuilds the DOM every time** and computes board offsets once at module load. The
   board has a fixed 590px height, with no pan or zoom.

## 7. Known bugs (prototype)

| # | Where | Bug |
|---|---|---|
| 1 | `ui/uiEvents.js` | `classModal` is used, but its declaration is commented out. It only works because browsers expose element IDs as globals |
| 2 | `game/tileManager.js` | `lCorridor` uses the `c_l_corridor_hp_restore.png` image. `c_l_corridor.png` exists but is unused |
| 3 | `game/eventManager.js` | The chest checks `hasSpaceInInventoryForItem(player, 'key')`. That's always false for a player who holds a key, so chests can never be collected |
| 4 | `eventManager.js` + `uiManager.js` | The chest event calls `handleEndTurn()` **and** returns `roundEnd=true`, so the caller ends the turn again and skips a player |
| 5 | `ui/renderer.js` | `updatePlayerInfo(p)` calls `GameState.updateCurrentPlayer(p)`, which overwrites the current player's slot with whatever player was passed in |
| 6 | `game/gameLogic.js` | Death wipes the inventory (against `C-04`). `isDead` is never read |
| 7 | `ui/uiEvents.js` | Right-clicking the board **deletes any tile**, a leftover debug feature |
| 8 | `ui/uiEvents.js` | The **Draw Event** button lets a player place arbitrary events (debug, not a rule) |
| 9 | `ui/uiEvents.js` | Rotation is never reset after placing, so the next tile starts pre-rotated |
| 10 | `ui/uiEvents.js` | Keyboard movement still works while modals and overlays are open |
| 11 | `game/gameLogic.js` | Duplicate, unused `BOARD_WIDTH` and `offsetX`/`offsetY` constants (the real ones are in the renderer) |
| 12 | various | Player names and messages go into `innerHTML`, an XSS risk once names and chat come from other users |
| 13 | `index.html` | `#tileModal` and `showPlaceTileModal`/`awaitPlayerDecision` are unused |

## 8. Assets inventory

**Tiles** (`public/images/tiles/`): `c_one_way_corridor`, `c_one_way_corridor_teleport`,
`c_one_way_room`, `c_l_corridor`, `c_l_corridor_hp_restore`, `c_l_corridor_portal`, `c_l_room`,
`c_t_corridor`, `c_t_room`, `c_four_way_corridor`, `c_four_way_corridor_hp_restore` (start),
`c_four_way_room`, `c_dragon_end_game`, `c_wall`; custom: `c_four_way_corridor_arena`,
`c_four_way_corridor_scorpio`.

> "One way" in the filenames means a **straight** two-opening tile (north–south), not a dead end.
> There's no dead-end art yet.

**Monsters** (`public/images/monsters/`): custom art that doesn't match the original bestiary. A
provisional mapping for gameplay until real art exists:

| Rule monster | Placeholder art |
|---|---|
| Giant Rat | `monster_squirrel_with_knife` |
| Giant Spider | `monster_scorpio` |
| Skeleton Turnkey | `monster_wolf_with_key` |
| Mummy | `monster_ghost` |
| Skeleton Warrior | `monster_shield_skeleton` |
| Skeleton King | `monster_yeti_with_sledgehammer` |
| The Fallen | `monster_cursed_wolf` |
| Dragon | tile `c_dragon_end_game` / TBD |

**Items** (`public/images/items/`): daggers, sword, axe, key, chests (closed and open), magic shot
(→ Magic Bolt), healing portal; custom extras: bow, hatchet, knives, magic mace, shield, shovel,
sledge hammer, golden scarab, rainfall, teleport, fist.

**Hero portraits** (`public/images/classes/`): 15 portraits. The six base heroes will get one each (for
example knight → Warrior, mage → Warlock). The rest are kept for custom heroes later.

Older versions of the art live in `assets/archive/` and aren't used by the code.

## 9. Repository state

- Branch `develop`, pushed to `github.com/ra1g-eu/karak-web`.
- The prototype WIP (turn overlays, chest-needs-key) was committed before the move to `legacy/`.
- `Karak_rules_EN_print.pdf` is untracked.
