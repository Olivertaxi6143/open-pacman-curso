## Exploration: Pac-Man gameplay — dot collection, ghost movement, collision geometry, and door semantics

### Current State
The Pac-Man MVP is a browser-based canvas game with vanilla JavaScript. Source files load in order: `maze.js` (defines `MAZE`, `TUNNEL_ROW`, `PACMAN_START`, `GHOST_STARTS`), `game.js` (`createGame`, `update`, `DIRS`), `render.js` (drawing), and `main.js` (input loop, rAF). State is stored in a `game` object with `grid` (copied from MAZE), pacman/x/y/dir/speed, ghosts with kind/speed/x/y/dir, score, lives, and dotsRemaining. Movement is continuous with floating-point positions; grid alignment checks occur each frame via an `aligned()` epsilon comparison.

Key architectural notes from AGENTS.md: game.js owns state, movement, collision, ghost AI; render.js owns canvas drawing. There is no build step, linter, or test framework — verification is purely manual (open HTML, play).

### Affected Areas
- `src/js/game.js` — `createGame()` initializes grid and dot count; `movePacman()` eats dots only when grid-aligned; `moveGhost()` and `decideGhost()` use kind-specific targeting; `collides()` uses 0.5-cell tolerance; `update()` calls movement then collision check every frame; `resetPositions()` on life loss. `aligned()` epsilon = 1e-3.
- `src/js/maze.js` — `MAZE` 2D array (31 rows x 28 cols) with walls (1), dots (2), doors/pen (3), tunnel row at y=14. Ghost starts at y=14, x: 12-15. Pac-Man start at (13,23). `parseTile` maps `'#'`=wall, `'.'`=dot, `'-'`=pen door.
- `src/js/render.js` — `drawDots()` renders remaining dots from `game.grid`; visual confirmation of dot count; `drawDoor()` renders pen doors.
- `src/js/main.js` — owns the rAF loop; calls `update()` then `draw()` while `state === 'playing'`. Keyboard input sets `pacman.nextDir`. No build/tests/CI.

### Investigation: `aligned()` Interaction with Fractional Speeds
The game loop runs `update()` every rAF frame. Both `movePacman()` and `moveGhost()` guard critical logic with `aligned()`:

```javascript
function aligned( v ) {
  return Math.abs( v - Math.round( v ) ) < 1e-3;
}
```

With the tuned fractional speeds:
- Pac-Man: 0.08 cells/frame → ~12.5 frames per cell
- Blinky: 0.07 cells/frame → ~14.3 frames per cell
- Pinky: 0.06 cells/frame → ~16.7 frames per cell
- Inky: 0.055 cells/frame → ~18.2 frames per cell
- Clyde: 0.05 cells/frame → 20 frames per cell

**Result**: `aligned()` does NOT trigger every frame. With an epsilon of 1e-3 and these speeds, alignment triggers periodically as the accumulated floating-point position happens to fall within the epsilon of an integer. For Pac-Man at 0.08, alignment triggers every 25 frames (2 cells traversed). For ghosts, the interval varies by kind. This means:

- Dot eating in `movePacman()` only runs when `aligned(p.x) && aligned(p.y)` — i.e., periodically, not every frame. Dots traversed between alignment points are effectively skipped.
- Ghost AI (`decideGhost()`) only runs when `aligned(g.x) && aligned(g.y)` — direction choices are delayed, not per-frame.
- The `collides()` check in `update()` runs **every frame**, independent of `aligned()`, but its 0.5-cell tolerance is a fixed threshold on floating-point positions that may miss collisions during sub-cell traversal when entities cross paths between alignment points.

**Can actors reach cell centers reliably?** Yes, but only after sufficient frames have accumulated (≈12–20 frames depending on speed). The `aligned()` check will eventually trigger and round the position to the nearest cell center, but the period between triggers means that dot eating, ghost turns, and collision-reset logic are all "sampled" at irregular intervals. This is the likely root cause of dots being "skipped" and ghosts appearing to pass through walls or fail to choose turns.

### Investigation: Collision Geometry and `collides()`
The prior exploration incorrectly stated that `collides()` is checked only when both entities are grid-aligned. **This is false.** Looking at `update()`:

```javascript
function update( game ) {
  movePacman( game );
  game.ghosts.forEach( ( g ) => moveGhost( game, g ) );

  for ( const g of game.ghosts ) {
    if ( collides( game.pacman, g ) ) { ... }  // called EVERY frame
  }
}
```

`collides()` is evaluated **every frame** after movement. The function:

```javascript
function collides( a, b ) {
  return Math.abs( a.x - b.x ) < 0.5 && Math.abs( a.y - b.y ) < 0.5;
}
```

uses a 0.5-cell (≈10 pixel) point-centers tolerance. Since both Pac-Man and ghosts have rendered radius of `TILE/2 - 1 = 9` pixels, this is roughly the correct visual threshold, but it is **point-to-point**, not AABB. The risk the gatekeeper identified is real: with fractional speeds, entities can pass within 0.5 cells of each other between alignment points without the condition being met in the same frame, especially when moving in perpendicular directions.

The actual weakness is the **combination of 0.5-cell point tolerance + sampled (per-frame) check + fractional movement**. Two scenarios:
1. **Missed collision**: Pac-Man and a ghost cross paths diagonally between two frames. At frame N, their centers are 0.6 cells apart; at frame N+1, they are 0.6 cells apart on the other side. The 0.5 threshold is never met, even though visually they passed close.
2. **Spurious collision**: If one entity's position rounding puts their centers < 0.5 apart at a single frame, life is lost even if the visual sprites don't actually overlap.

### Investigation: Ghost Door Semantics
The maze defines doors as grid value 3. The `isWall()` function distinguishes actor types:

```javascript
function isWall( grid, x, y, actor ) {
  if ( v === 1 ) return true;          // always a wall
  if ( v === 3 && actor === 'pacman' ) return true;  // door blocks Pac-Man
  return false;
}
```

**Ghosts are NOT blocked by doors** (the `v === 3 && actor === 'pacman'` check returns false for ghosts). This is intentional — ghosts can traverse the pen door at row 12 (the `--` section in the maze string) to enter/leave the ghost pen. This is the **intended pen/tunnel traversal**.

However, ghosts can also wander off the maze entirely if `canMove()` or movement logic allows exiting through non-door openings. The tunnel row (TUNNEL_ROW = 14) has wraparound logic in `wrapTunnel()`: exiting left at the tunnel row reappears on the right, and vice versa. This is intended behavior for the classic Pac-Man tunnel.

**Genuine off-maze/corridor leakage** would occur if:
- A ghost's `dir` is set toward a direction that exits the grid bounds (handled by `canMove`'s boundary check in `isWall`).
- The tunnel wraparound is incorrectly triggered outside the tunnel row (it is not — the check in `canMove` is `ty === TUNNEL_ROW`).

Distinguishing the two: if a ghost is at y=14 (tunnel row) and moves horizontally through the open space at the tunnel ends, the wraparound is intended. If a ghost at y≠14 moves toward x<0 or x≥28, `isWall` returns true (boundary wall), stopping it. The risk is if `canMove` or `decideGhost` somehow allows a ghost to persist in a direction that eventually reaches the boundary at a non-tunnel row.

### Re-assessed Checklist (against current source)
| Area | Finding | Evidence |
|------|---------|----------|
| **Dot collection** | Dots only eaten when `aligned()` triggers periodically (not every frame). With 0.08 speed, alignment every ~25 frames → dots between those frames are skipped. | `movePacman()` line 96: `if (aligned(p.x) && aligned(p.y))` wraps dot eating. |
| **Collision geometry** | `collides()` runs every frame with 0.5-cell point tolerance. Missed collisions possible between alignment points. | `update()` line 264: loop calls `collides()` every frame. `collides()` uses fixed 0.5 threshold. |
| **Movement ordering** | Pac-Man moves first in `update()`, then ghosts. This means ghost AI sees Pac-Man's *post-move* position, but collision is checked after both have moved. | `update()` line 261-262: `movePacman` then `moveGhost`. |
| **canMove / wrapTunnel** | `canMove` has tunnel wraparonly at y=TUNNEL_ROW (row 14). `wrapTunnel` applied after movement. Boundary checks in `isWall` prevent off-grid exit except at tunnel row. | `canMove` line 80: `if (ty === TUNNEL_ROW && (tx < 0 || tx >= grid[0].length)) return true`. |
| **Ghost door traversal** | Ghosts pass through doors (value 3) since `isWall` only blocks them for Pac-Man. Intentional for pen entry/exit and tunnel passage. | `isWall` line 69: `if (v === 3 && actor === 'pacman') return true`. |
| **Ghost AI targeting** | `decideGhost` only runs when aligned; direction choices use `canMove` which respects maze layout but not door-for-ghosts restriction. | `moveGhost` line 230: `if (aligned(g.x) && aligned(g.y))` guards `decideGhost`. |
| **Script/global coupling** | `window.MAZE`, `window.TUNNEL_ROW`, `window.PACMAN_START`, `window.GHOST_STARTS` from maze.js; `window.createGame`, `window.update`, `window.DIRS` from game.js; `window.draw` from render.js. No encapsulation. | AGENTS.md § "Global window coupling". |

### Approaches
1. **Fix dot-eating to be continuous** — Modify `movePacman()` to check and eat dots based on interpolated position every frame, not only when `aligned()`. For example, iterate cell coordinates from Pac-Man's previous to current position and eat any dot found, then mark the grid cell as eaten (idempotent via `grid[y][x] === 2` check).  
   - Pros: Dots are never skipped regardless of alignment state.  
   - Cons: Must guard against double-eating if position rounding varies; minor performance impact from per-frame cell iteration.  
   - Effort: Low/Medium.

2. **Fix collision to run with AABB and per-frame sampling** — Expand `collides()` to use actual rendered positions and sprite radius, and ensure it is the dominant collision check. Consider adding a continuous/CD sweep for the case where entities cross between frames.  
   - Pros: More reliable collision detection; matches visual sprite sizes.  
   - Cons: Requires knowing sprite radius; may need to calibrate margins; risk of false positives if margins too wide.  
   - Effort: Medium.

3. **Increase `aligned()` frequency or remove as gate for movement logic** — Reduce the `aligned()` epsilon, or restructure `movePacman()`/`moveGhost()` so that dot eating and AI decisions run every frame with `Math.round()`-based cell lookup, while keeping alignment only for direction changes.  
   - Pros: More frequent dot eating and AI turns; simpler logic.  
   - Cons: May change game balance (dots eaten more frequently); alignment becomes less meaningful.  
   - Effort: Medium.

4. **Clarify ghost door semantics with explicit checks** — Add explicit documentation/comment in `isMoveAllowed()` or `decideGhost` distinguishing: (a) intended pen door traversal at y=12/row 14 for ghosts entering/leaving the pen, (b) tunnel wraparound at y=14, (c) boundary walls everywhere else. No code change required if behavior is already correct, but the intent should be explicit for future maintainers.  
   - Pros: Zero runtime impact; clarifies intent for future devs.  
   - Cons: None code-wise.  
   - Effort: Low.

### Recommendation
Start with **Approach 1** (continuous dot eating) combined with **Approach 4** (explicit ghost door semantics documentation). 

- For dot eating: Modify `movePacman()` to check dots in the cell Pac-Man is leaving/entering every frame, not only when `aligned()`. The grid cell check `grid[p.y][p.x] === 2` is already idempotent (setting to 0 is safe to repeat). The key change is moving the dot-eating logic outside the `if (aligned())` guard, or adding an additional check when Pac-Man is "close enough" to a cell center (e.g., within 1 pixel / 0.05 cells of the rounded position). Given the fractional speeds, the simplest correct fix is: every frame, after updating `p.x`/`p.y`, compute `Math.round(p.x)` and `Math.round(p.y)` and if the grid cell at those rounded coordinates contains a dot, eat it. Since the grid mutation (`grid[y][x] = 0`) is idempotent, repeated eating is not a problem.

- For ghost door semantics: Add a comment block in `game.js` or `maze.js` documenting that grid value 3 (doors/pen) blocks Pac-Man only; ghosts may traverse doors freely, and the tunnel row (y=TUNNEL_ROW=14) has wraparound behavior. This makes the intent explicit for future changes.

- For collision: In a subsequent phase, expand `collides()` to use a more robust geometry (e.g., check if the distance between centers is less than the sum of sprite radii, i.e., `9 + 9 = 18` pixels ≈ 0.9 cells). The current 0.5-cell (10 pixel) threshold is close to the visual radius but may miss some close-pass scenarios. However, since the gatekeeper emphasizes evidence-backed changes, prioritize the dot-eating and door-semantics fixes first, then revisit collision geometry with data from playtesting.

### Risks
- **Dot-eating change**: If the sweep eats dots that Pac-Man didn't "intend" to eat, the score may feel unfair. Mitigation: the grid mutation is idempotent (`grid[y][x] = 0` is safe to repeat), and the dot count (`dotsRemaining`) decrements only when a dot is actually found uneaten.  
- **Collision change**: Expanding `collides()` margins may trigger life loss during legitimate close-pass scenarios. Must calibrate margins to the rendered sprite size (TILE/2 - 1 = 9 pixels). The current 0.5-cell ≈ 10 pixels is already well-calibrated; the real fix may be ensuring the check runs every frame with correct positional data rather than changing the threshold.  
- **Ghost door behavior**: Adding explicit documentation should not change runtime behavior; it only clarifies intent. No risk of breaking tunnel passage or pen traversal.  
- **Performance**: Adding per-frame cell iteration for dot eating is negligible for a simple rAF loop (28x31 grid, one Pac-Man). No measurable impact expected.

### Ready for Proposal
Yes. The exploration has identified concrete code locations (`game.js` `movePacman` dot-eating guard, `collides()` threshold, `aligned()` epsilon, `isWall()` door handling) and evidence-based approaches with tradeoffs. The prior exploration's false claim that `collides()` is alignment-gated has been corrected: it runs every frame. The actual weaknesses are the periodic `aligned()` gating of dot eating and ghost AI, the 0.5-cell point-tolerance in `collides()`, and the need for explicit ghost door semantics. The orchestrator should be told: "Proceed to SDD proposal phase to refine dot-eating geometry and collision geometry fixes, with explicit documentation of ghost door semantics."

**Artifacts**:
- `exploration.md` — as above (written to openspec path)
- `contract.json` — updated SDD Result Contract (see below)