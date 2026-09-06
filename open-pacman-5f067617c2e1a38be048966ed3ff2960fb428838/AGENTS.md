# OpenCode AGENTS.md — Pac-Man MVP

## Manual smoke test
Open `src/index.html` in a browser. No build, no install, no `npm` commands.

## Script load order (critical)
`src/index.html` loads scripts in this order:
1. `js/maze.js` — defines `MAZE`, `TUNNEL_ROW`, `PACMAN_START`, `GHOST_STARTS` (window globals)
2. `js/game.js` — depends on maze globals; defines `createGame`, `update`, `DIRS` (window globals)
3. `js/render.js` — depends on `game.grid`; defines `draw(ctx, game, frame)` (window global)
4. `js/main.js` — owns keyboard input + `requestAnimationFrame` loop; calls `createGame`/`update`/`draw`

Reordering will break the app.

## Global window coupling
These files write to `window`:
- `maze.js`: `window.MAZE`, `window.TUNNEL_ROW`, `window.PACMAN_START`, `window.GHOST_STARTS`
- `game.js`: `window.createGame`, `window.update`, `window.DIRS`
- `render.js`: `window.draw`

Agents must not remove or rename these unless renaming every consumer.

## Game rules vs rendering
- **game.js** owns: state (`state`, `score`, `lives`, `dotsRemaining`), movement, collision, ghost AI, scoring, `createGame`/`update`.
- **render.js** owns: Canvas 2D drawing — walls, doors, dots, Pac-Man, ghosts, HUD. It reads `game.grid` and game state but does not mutate it.
- Do not mix rendering logic into game.js or game logic into render.js.

## Available checks
- **None**. No `package.json`, no linter, no test framework, no build step, no CI. Verification is purely manual (open the HTML page and play).

## Entry point
`src/index.html` — open in any modern browser.