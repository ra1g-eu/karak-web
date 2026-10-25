# CLAUDE.md

A browser version of the board game **Karak**. It's heading toward online multiplayer, but the
current goal is a rules-correct **local hot-seat game for 2–5 players**. Gameplay first, design
later.

## Read these first

- [docs/RULES.md](docs/RULES.md): **source of truth for game behaviour.** Rules carry stable IDs
  (`R-…` from the rulebook, `C-…` our clarifications, `Q-…` open questions).
- [docs/ROADMAP.md](docs/ROADMAP.md): phases, target architecture, current phase. Work only on the
  current phase unless told otherwise.
- [docs/OVERVIEW.md](docs/OVERVIEW.md): state of the existing prototype, known bugs, asset map.
- `Karak_rules_EN_print.pdf`: the original rulebook. Check it if RULES.md seems wrong.

## Current state

- Phases 0–3 are done: the engine implements every rule. **Phase 4 (playable hot-seat client
  in `src/client`) is next.** Open questions `Q-01`–`Q-06` are deferred, so use placeholder data
  where they matter.
- Engine API and module map: OVERVIEW §2–3. New rules go in `src/engine/rules/`, with tests in
  `tests/engine/<area>.test.ts` built from the scenario helpers in `tests/engine/helpers.ts`
  (`newGame`, `gameAs`, `enterFight`, `putTiles`, `stackPile`, `stackBag`, `rigDice`, `run`,
  `expectRejected`). `newGame` seats the Warlock first because its skills only act on command,
  so base-rule tests stay free of hero effects.
- `tests/engine/simulation.ts` is a bot that plays full games and checks invariants after every
  command. Extend `checkInvariants` and the bot when adding rules.
- Stack: **Vite + TypeScript (strict) + Vitest**, Tailwind 4 + daisyUI 5. The engine goes in
  `src/engine` (pure), the UI in `src/client`, tests in `tests/`, and later a Node WebSocket
  server in `src/server`. Art is in `public/images/` (served at `/images/…`).
- `legacy/` holds the old prototype: tangled logic and UI, many rules missing or wrong (OVERVIEW
  §5–7). It's reference only. Don't build on it or port its code; reimplement from RULES.md.

## Commands

- `npm run dev`: dev server at `http://localhost:5173/` (the prototype is at `/legacy/`)
- `npm test`, `npm run lint`, `npm run typecheck`, `npm run format:check`, `npm run build`
- Before calling work done, run lint, typecheck and tests. CI runs all of them plus the build.
- `npm run typecheck` also checks `src/engine` without DOM types (`tsconfig.engine.json`), and
  ESLint bans DOM, timers, `Date` and `Math.random()` there.

## Rules of engagement

- **Rules:** implement exactly what RULES.md says. Cite the rule ID in a short comment where the
  logic lives and in the test name (`it('R-COMBAT-TIE: hero returns to previous tile')`). If a rule
  is ambiguous or missing, ask, then record the decision as a `C-…` entry in RULES.md. Don't
  invent behaviour silently.
- **Engine purity:** nothing in `src/engine` may touch the DOM, `window`, timers, `Math.random()`
  or I/O. All randomness goes through the seeded RNG stored in `GameState`. State must stay
  JSON-serializable: no classes with methods, no shared object references, no `Map`s.
- **Commands in, events out:** the UI dispatches commands. The engine validates them and returns
  new state plus events. The UI never mutates game state.
- **Untrusted text:** player names, chat and anything user-provided are rendered with
  `textContent`, never `innerHTML`.
- **Keep the docs true:** when behaviour, structure or phase status changes, update OVERVIEW.md,
  ROADMAP.md (checkboxes and status log) and this file in the same change.
- Base game content first. Custom heroes, tiles and items (art already exists) wait for Phase 9.

## Environment

- Windows 11, Node 24, repo inside XAMPP's `htdocs`. Shells: PowerShell (default) and Git Bash.
- Port 80 on this machine answers from an Ubuntu Apache (likely WSL), so use the Vite dev server
  for previews.
- Git: work on `develop`, and only commit or push when asked.
