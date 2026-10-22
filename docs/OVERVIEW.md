# Project Overview — Current State

_Snapshot taken 2026-10-22, before the refactor (Phase 0 in [ROADMAP.md](ROADMAP.md))._

## 1. What this is

This is a browser version of the board game **Karak**. The long-term goal is an online multiplayer
game with a backend server (WebSockets), a database, accounts, chat, leaderboards, and community
hubs.

The first step is a **fully rules-correct local hot-seat game** (2–5 players on one screen).
Gameplay comes first and visual design later.

- Rules reference: [RULES.md](RULES.md)
- Plan: [ROADMAP.md](ROADMAP.md)

## 2. How it runs today

- Plain ES modules with **no build step** and no `package.json`. The code is served as static files
  by XAMPP Apache: open `http://localhost/karak/refactor/`.
- The UI uses **Tailwind via the Play CDN runtime** (`scripts/tailwind.js`, which isn't meant for
  production), **daisyUI 5** (`css/daisyui@5.css`), and **Font Awesome**, all vendored locally.
- Entry point: [index.html](../index.html) loads every module, then calls `initGame()` and
  `initUI()` on `DOMContentLoaded`.
- There are no tests, no linting, and no formatter.

## 3. Repository layout

```
index.html                 Whole UI layout: 3 panels, modals, turn and round overlays
css/
  styles.css               Board, tile, player, event, overlay styles
  themes.css               (empty)
  daisyui@5.css, fontawesome.min.css   Vendored libraries
scripts/
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
images/
  tiles/      c_*.png tile art (current set) + backup/
  monsters/   monster_*.png (custom art, not the original Karak monsters) + backup/
  items/      item_*.png weapons, spells, keys, chests + backup/
  classes/    class_*.png hero portraits (15)
  background/ grass-*.png board backgrounds
public/, src/              Empty folder scaffolding (a restructure was started)
webfonts/                  Font Awesome fonts
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

**Tiles** (`images/tiles/`): `c_one_way_corridor`, `c_one_way_corridor_teleport`,
`c_one_way_room`, `c_l_corridor`, `c_l_corridor_hp_restore`, `c_l_corridor_portal`, `c_l_room`,
`c_t_corridor`, `c_t_room`, `c_four_way_corridor`, `c_four_way_corridor_hp_restore` (start),
`c_four_way_room`, `c_dragon_end_game`, `c_wall`; custom: `c_four_way_corridor_arena`,
`c_four_way_corridor_scorpio`.

> "One way" in the filenames means a **straight** two-opening tile (north–south), not a dead end.
> There's no dead-end art yet.

**Monsters** (`images/monsters/`): custom art that doesn't match the original bestiary. A
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

**Items** (`images/items/`): daggers, sword, axe, key, chests (closed and open), magic shot
(→ Magic Bolt), healing portal; custom extras: bow, hatchet, knives, magic mace, shield, shovel,
sledge hammer, golden scarab, rainfall, teleport, fist.

**Hero portraits** (`images/classes/`): 15 portraits. The six base heroes will get one each (for
example knight → Warrior, mage → Warlock). The rest are kept for custom heroes later.

The `backup/` folders hold older versions of the art and aren't used by the code.

## 9. Repository state

- Branch `develop`, 4 commits (`init` → `player actions`).
- Uncommitted WIP: turn and round transition overlays, the chest-needs-key change, and the
  `awaitPlayerDecisionDropdown` button labels.
- `Karak_rules_EN_print.pdf` is untracked.
