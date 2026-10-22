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

- Phase 0 of the roadmap. The code in `scripts/`, `css/` and `index.html` is a **prototype that will
  be replaced**. Logic and UI are tangled and many rules are missing or wrong (see OVERVIEW §5–7).
  Don't build new features on it; fix it only if asked.
- It runs as static files through XAMPP at `http://localhost/karak/refactor/`. There is no build,
  no package manager and no tests yet.
- Decided target stack: **Vite + TypeScript (strict) + Vitest**. The engine goes in `src/engine`
  (pure), the UI in `src/client`, and later a Node WebSocket server in `src/server`.

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

- Windows 11, XAMPP in `C:\xampp`, Node available. Shells: PowerShell (default) and Git Bash.
- Git: work on `develop`, and only commit or push when asked.
