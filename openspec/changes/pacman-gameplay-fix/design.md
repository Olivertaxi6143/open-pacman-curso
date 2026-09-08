# Design: Pac-Man Gameplay Reliability Fix

## Technical Approach

Keep the Canvas/global-window architecture and make `game.js` the logical-grid authority. Movement will advance exactly to each cell center, resolve legality and turns there, and then consume remaining movement distance; it will not depend on floating-point alignment. Center visits consume dots, while frame-start/end segments drive explicit circle hitboxes and pass-through detection. This implements the collection/collision and navigation specs without changing the frame-based speed model in `main.js`.

## Architecture Decisions

| Decision | Choice | Alternative | Rationale |
|---|---|---|---|
| Grid stepping | Segment each actor movement to the next integer center; snap, decide, then continue remaining distance. | `aligned()` tolerance checks. | Existing speeds (`0.08`, `0.07`, `0.06`, `0.055`, `0.05`) do not reliably land on integers. |
| Collision boundary | Circle centers in grid units, each radius `0.45` (`(20 / 2 - 1) / 20`), and minimum distance between simultaneous movement segments. | Tile equality or current `< 0.5` axis checks. | `render.js` draws both actors with a 9px extent on 20px tiles; segment distance catches swaps. |
| Special space | `1` blocks all; `3` blocks Pac-Man and permits active ghosts; row `TUNNEL_ROW` permits edge wrapping for both while playing. | Implicit per-call rules. | These are the present `maze.js`/`game.js` semantics, centralized without inventing a door mode. |
| Ghost choices | Retain Blinky/Pinky/Inky/Clyde target formulas; choose only legal exits, excluding reverse unless it is the sole legal recovery. Resolve Clyde's lower-right target to legal `{x:26,y:29}`. | Random/stalling fallback. | The first three formulas and Clyde's distance threshold already exist; `{26,29}` is the bottom-right legal cell in the 28x31 maze, unlike current `{27,31}`. |

## Data Flow

```
keyboard -> pacman.nextDir -> update snapshot -> advanceActor
                                        |-> center visit -> consumeDot -> grid/score/dotsRemaining
ghost target -> legalDirections -> advanceActor
snapshots + final positions -> collidesDuringStep -> life/reset or lost
game.grid/state -> draw (read-only)
```

At every center, Pac-Man first applies a legal pending turn, ghosts select a legal target-directed exit, and a blocked heading falls back to a legal continuation/reverse. `update` snapshots positions before any move, advances Pac-Man and ghosts, resolves all active-ghost contacts once, then sets `won` only when `dotsRemaining` reaches zero.

## File Changes

| File | Action | Description |
|---|---|---|
| `open-pacman-5f067617c2e1a38be048966ed3ff2960fb428838/src/js/maze.js` | Modify | Publish named tile values and the derived Clyde scatter cell beside existing globals. |
| `open-pacman-5f067617c2e1a38be048966ed3ff2960fb428838/src/js/game.js` | Modify | Add exact grid stepping, centralized navigation, center dot consumption, snapshots, hitboxes, and legal ghost fallback. |
| `openspec/changes/pacman-gameplay-fix/{design.md,state.yaml}` | Create/Modify | Record this design and phase state. |

`src/index.html` load order and `render.js` remain unchanged; rendering continues to read, never mutate, `game.grid`.

## Interfaces / Contracts

```js
legalDirections(grid, cell, actor, gameState) // legal direction names only
advanceActor(game, actor, actorType)          // visits every crossed center
consumeDot(game, cell)                        // idempotently mutates grid/progress
collidesDuringStep(pacman, ghost)             // current/segment circle contact
```

Actors retain `{ x, y, dir, speed }`; `update` records pre-move positions, and ghosts receive `mode: 'active'` so the existing life-loss outcome is explicit and extensible. Tie order remains `DIRS` insertion order.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Logic | crossed/revisited/final dots; wall recovery; door/tunnel; four ghost targets; direct/nearby/swap contact | Deterministic browser-console fixtures calling `createGame`/`update`; no test framework exists. |
| Integration | ordered repair-unit merges preserve combined behavior | Validate on the integration branch before `main`. |
| E2E | start, complete a dot route, collide, tunnel, and play a full maze | Open `src/index.html` and play per `AGENTS.md`. |

## Threat Matrix

| Boundary | Applicability | Safe/failure behavior | Planned RED tests |
|---|---|---|---|
| Documentation-like paths | N/A — no executable-file classification. | — | — |
| Git repository selection | Applicable — worktree delivery. | Resolve the repository root; reject foreign/unresolved paths. | Root, relative, absolute, and foreign-repository selectors. |
| Commit state | Applicable — unit commits. | Commit only intended unit paths; abort on unrelated staged files, `commit -a`, or empty index. | Staged, `-a`, and empty-index cases. |
| Push state | Applicable — integration delivery. | Push explicit unit/integration refs; abort unresolved tracking or destination. | Tracking, first-push, and explicit-refspec cases. |
| PR commands | Applicable — review handoff. | Use explicit `--head`/base and owned arguments; reject environment-prefixed or composed commands. | Explicit-head, environment-prefix, and composed-command cases. |

## Migration / Rollout

No data migration. This phase creates no branch or worktree. Apply will author independently reversible collection, collision, and navigation units in dedicated worktrees, record predecessor and rollback SHA, merge them in recorded order into an integration branch, manually accept there, then merge to `main`.

## Open Questions

None blocking. Frightened/eaten ghost modes and time-based speed normalization remain out of scope.
