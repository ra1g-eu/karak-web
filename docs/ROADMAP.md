# Roadmap

The agreed plan from prototype to online game. We work **one phase at a time**. A phase is done when
its exit criteria are met, not when its task list is empty. If we need to change the plan, we update
this file first.

**Guiding principles**

1. **Gameplay first, design later.** No visual polish until the game is fully playable and correct.
2. **The rules are the spec.** [RULES.md](RULES.md) is the source of truth. Code and tests cite rule
   IDs (`R-COMBAT-3`, `C-04`). If the code disagrees with the rules, the code is wrong. A rule only
   changes in RULES.md, by agreement.
3. **The engine is pure.** Game logic is plain TypeScript with no DOM, no timers, and no
   `Math.random()`, so the same engine runs in the browser, in tests, and later on the server.
4. **State is data.** The whole game is one JSON-serializable object, which makes save, load,
   replay, and network sync come for free.
5. **Server-authoritative later, so design for it now.** The UI sends intents (*commands*). The
   engine validates them and produces *events*. The UI never mutates state.

**Decisions taken** (2026-10-22): Vite + TypeScript + Vitest; base rules first, custom content
later; first milestone is local hot-seat for 2–5 players.

---

## Target architecture

```
src/
  engine/                  Pure game logic: no DOM, no I/O, 100% unit-tested
    types.ts               GameState, Player, Tile, Token, Item, Command, GameEvent…
    data/                  Static content as data: tiles, monsters, items, heroes
    rng.ts                 Seeded PRNG; its state lives inside GameState
    setup.ts               createGame(config, seed) → GameState
    commands.ts            Command union: Move, Explore, PlaceTile, Fight, UseBolt, EndTurn…
    reducer.ts             apply(state, command) → { state, events } | { error }
    rules/                 One module per area: movement, exploration, combat, inventory,
                           healing, teleport, curse, heroes, scoring
    queries.ts             Read-only helpers for the UI: legalMoves, validRotations, …
  client/                  Browser UI: renders state, turns clicks into commands
    main.ts
    store.ts               Holds GameState, dispatches commands, notifies views
    views/                 Board (pan/zoom), player panel, inventory, combat dialog, log, setup
    assets/
  server/                  (Phase 6+) Node WebSocket server reusing src/engine
tests/                     Vitest; files named after the rule areas
public/images/…            Static art, served at /images/…
assets/archive/            Old art versions, kept in git but not served or built
legacy/                    The old prototype, read-only, deleted in Phase 4
```

**Turn phases** are explicit in state (`turn.phase`), which replaces the scattered UI flags:

`awaitingAction` → (`placingTile` | `inCombat` | `choosingLoot` | `choosingCurseTarget` | …) →
`awaitingAction` … → `turnOver` → next player.

Each phase allows a known set of commands. The UI asks `queries.ts` what is legal and shows exactly
that.

---

## Phase 0 — Groundwork ✅

- [x] Port the rules into [RULES.md](RULES.md) with stable IDs
- [x] Document the current state in [OVERVIEW.md](OVERVIEW.md)
- [x] Write this roadmap and `CLAUDE.md`
- [x] Commit the current WIP so the prototype has a clean baseline
- [x] Cross-check the clarifications against a secondary rules source (UltraBoardGames)
- [ ] _Deferred:_ answer the open questions `Q-01`–`Q-05` in RULES.md (monster strengths, tile
      counts, edition). Phase 2 uses placeholder data until then.
- [ ] _Deferred:_ review the clarifications `C-01`–`C-13` and mark each as confirmed

**Exit:** docs agreed, working tree clean.

## Phase 1 — Tooling & skeleton ✅

- [x] `package.json`, Vite, TypeScript (strict), Vitest, ESLint and Prettier
- [x] Move the prototype into `legacy/` (paths repointed at `public/images/`)
- [x] Move art to `public/images/` and the unused `backup/` folders to `assets/archive/`
- [x] Replace the Tailwind Play CDN with Tailwind compiled through Vite, keeping daisyUI
- [x] `.gitignore` (`node_modules`, `dist`), plus scripts `dev`, `build`, `test`, `lint`
- [x] GitHub Actions CI: lint, format check, typecheck, tests, build
- [x] Engine purity guardrails: `tsconfig.engine.json` (no DOM types) and ESLint bans on DOM,
      timers, `Date` and `Math.random()` in `src/engine`

**Exit:** `npm run dev` serves an empty shell, `npm test` runs, and CI is green.

## Phase 2 — Engine core (no UI) ✅

Built test-first, with each rule ID covered by at least one test.

- [x] Types, seeded RNG, `createGame` (`R-SETUP-*`)
- [x] Tile data: shapes, rotations, openings, kinds; tile pile; starting tile (`R-TILE-START`).
      Tile mix is placeholder data (`Q-03`)
- [x] Movement over discovered tiles, with the 4-move budget (`R-TURN-*`, `R-MOVE-*`)
- [x] Exploration: draw, valid rotations, placement, room → bag draw (`R-EXPLORE-*`, `R-ROOM-*`)
- [x] Bag of 53 tokens (`§2.1`). Strengths are placeholder data (`Q-02`)
- [x] Combat: 2d6 + weapons + bolts; win, tie, loss; retreat; loot (`R-COMBAT-*`, `R-RETREAT`)
- [x] Inventory slots, overflow drop, picking up from tiles (`R-INV-*`)
- [x] HP, unconsciousness and skipped turn, HF healing (`R-HP-*`, `R-HEAL-*`)
- [x] Keys and chests (`R-KEY-*`), teleport gates (`R-TG-*`)
- [x] Turn end conditions (`R-END-*`), dragon victory and VP scoring (`R-WIN-*`)
- [x] A **headless simulation test** that plays full random games to the end without errors
- [x] `legalCommands(state)`: every command the active player may send, for the UI and bots

**Exit:** a complete game can be played from the test console by sending commands.

## Phase 3 — Heroes, spells, curse ✅

- [x] Magic Bolt (done in Phase 2 with combat), Portal of Healing (`R-BOLT-1`, `R-PORTAL-*`)
- [x] Curse placement, effects and lifting (`R-CURSE-*`)
- [x] All six heroes and their skills (§12), each with dedicated tests, including the cursed case
- [x] Simulation bots use every skill; hero line-ups rotate so all six get played

**Exit:** every rule in RULES.md is implemented and tested.

## Phase 4 — Playable hot-seat client

Functional UI only. It should look tidy, but it doesn't need to look good yet.

- [ ] Setup screen: player count (2–5), names, hero pick or random, starting player roll
- [ ] Board rendering from state, with pan and zoom and centring on the active hero
- [ ] Click-to-move with highlighting of reachable tiles and remaining moves
- [ ] Exploration flow: clicking an open edge draws a tile; only valid rotations are offered
- [ ] Combat dialog: dice roll, bonuses breakdown, bolt and skill choices, result
- [ ] Loot and overflow chooser, pick up from tile, chest unlock, heal prompt
- [ ] Curse target picker, Portal of Healing target and destination picker, TG destination picker
- [ ] Inventory and player panels for all players, game log, end-of-game scoreboard
- [ ] Save and load to `localStorage` (state is JSON); "new game"
- [ ] Delete `legacy/`

**Exit:** 2–5 people can play a full game start to dragon on one screen with no rule errors.

## Phase 5 — Playtest & polish gameplay

- [ ] Playtest sessions; log issues against rule IDs
- [ ] Settle the tile distribution and monster strengths (`Q-02`, `Q-03`)
- [ ] UX for clarity: animations for moves and dice, "why can't I?" hints, keyboard shortcuts
- [ ] Optional: simple **bots** to fill seats (a heuristic AI on top of `queries.ts`)
- [ ] Optional: replay viewer built from the command log

**Exit:** the game *feels* good to play. This is the gate before any network work.

## Phase 6 — Online multiplayer (server)

- [ ] Node server (`src/server`) running the same engine; WebSocket transport (`ws` or Socket.IO)
- [ ] Protocol: client sends a command, the server validates and applies it, then broadcasts
      events and state diffs
- [ ] Hidden information stays on the server (bag order, tile pile order, RNG seed)
- [ ] Game rooms: create, join by code, ready up, start; turn timers; reconnect and resume
- [ ] Guest identity (nickname), no accounts yet

**Exit:** friends on different machines can finish a game together.

## Phase 7 — Persistence, accounts, leaderboards

- [ ] Database (PostgreSQL proposed) storing users, games, and command logs (which also serve as
      replays)
- [ ] Auth (email + OAuth), profiles, game history
- [ ] Ratings (Elo or Glicko) and leaderboards
- [ ] Deploy: a hosted server with TLS, plus backups

## Phase 8 — Community

- [ ] Lobby and hubs (public rooms, matchmaking), friends, invites
- [ ] In-game and lobby chat, with moderation tools, rate limits and reporting
- [ ] Spectator mode

## Phase 9 — Design & content

- [ ] Full art and UI design pass, sound, animations
- [ ] Custom content as data packs: extra heroes (ninja, viking, …), arena and scorpion tiles,
      new spells and items (rainfall, teleport, shield, …)
- [ ] Mobile layout

---

## Status log

| Date | Change |
|---|---|
| 2026-10-22 | Roadmap created. Phase 0 started. |
| 2026-10-22 | Phase 0 done (open questions deferred). Phase 1 done: Vite 8, TypeScript 6, Vitest 5, ESLint 10, Tailwind 4 + daisyUI 5. Next: Phase 2. |
| 2026-10-22 | Phase 2 done: engine core with 95 tests, including bot games played to the end. Added `C-14`, `C-15`, `Q-06`. Next: Phase 3. |
| 2026-10-25 | Phase 3 done: Portal of Healing, curse, all six hero skills; 146 tests. Added `C-16`–`C-24`. Next: Phase 4 (hot-seat client). |
