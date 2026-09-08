# Tasks: Pac-Man Gameplay Reliability Fix

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 280 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Delivery strategy | auto-chain |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Focused test command | Runtime harness | Rollback boundary |
|------|------|----------------------|-----------------|-------------------|
| 1 | Grid-stepping movement with center consumption | Manual browser: traverse continuous dot route, verify dotsRemaining decrements correctly, completion at zero | Open `open-pacman-5f067617c2e1a38be048966ed3ff2960fb428838/src/index.html`, play maze, verify dot count and maze-completion state | Revert merge of repair unit on integration branch |
| 2 | Circle hitboxes and pass-through detection | Manual browser: execute ghost pass-through between positions, verify contact outcome per collision boundary | Open `open-pacman-5f067617c2e1a38be048966ed3ff2960fb428838/src/index.html`, perform pass-through, verify no false contact / correct lost outcome | Revert game.js grid-stepping changes |

## Phase 1: Foundation / Infrastructure

- [x] 1.1 Add Clyde scatter cell `{x:26,y:29}` to `open-pacman-5f067617c2e1a38be048966ed3ff2960fb428838/src/js/maze.js` — modify only Clyde cell assignment; reference existing tile globals
- [x] 1.2 Implement snapshot system in `open-pacman-5f067617c2e1a38be048966ed3ff2960fb428838/src/js/game.js` — record pre-move positions before actor advancement; snapshots read-only to draw layer
- [x] 1.3 Add center-visit dot consumption logic in `open-pacman-5f067617c2e1a38be048966ed3ff2960fb428838/src/js/game.js` — consume dots when actor visits grid center; idempotent against revisits; maze progress updates once per dot

## Phase 2: Core Implementation

- [x] 2.1 Implement grid-stepping `advanceActor` in `open-pacman-5f067617c2e1a38be048966ed3ff2960fb428838/src/js/game.js` — advance exactly to each integer cell center; snap, decide direction, continue remaining distance
- [x] 2.2 Implement `consumeDot(game, cell)` — idempotently mutate grid/progress state; preserve maze completion check only after final required collectible consumed
- [x] 2.3 Implement `collidesDuringStep(pacman, ghost)` — current/segment circle contact using approved radius `0.45`; enables pass-through and nearby contact resolution per collision boundary
- [x] 2.4 Implement legal ghost fallback in `advanceActor` — blocked heading falls back to legal continuation or reverse; ghosts receive `mode: 'active'` for explicit life-loss outcome; distinct target formulas retained

## Phase 3: Integration / Wiring

- [x] 3.1 Verify git repo root from change directory: `git rev-parse --show-toplevel` returns expected path
- [x] 3.2 Stage only `open-pacman-5f067617c2e1a38be048966ed3ff2960fb428838/src/js/game.js` and `open-pacman-5f067617c2e1a38be048966ed3ff2960fb428838/src/js/maze.js` with `git add`; abort on unrelated staged files, `commit -a`, or empty index
- [ ] 3.3 Push integration branch with explicit refspec; verify upstream tracking correct
- [ ] 3.4 Review PR command syntax: explicit `--head` and base arguments; reject environment prefixes (e.g. `GIT_SSH`) and composed command chains

## Phase 4: Testing / Verification

- [ ] 4.1 Manual browser: dot collection — traverse continuous dot route, verify every crossed dot consumed exactly once, maze progress updates once per dot, completion triggers only when dotsRemaining reaches zero
- [ ] 4.2 Manual browser: direct contact — verify approved direct-contact outcome per collision boundary
- [ ] 4.3 Manual browser: nearby contact — verify approved nearby-contact outcome per collision boundary
- [ ] 4.4 Manual browser: pass-through contact — verify contact resolved when Pac-Man and ghost cross between observed positions, even if ending positions are separate
- [ ] 4.5 Manual browser: ghost legal navigation — verify legal intersection traversal, blocked direction recovery, wall escape prevention, ghost-house door access per policy, legal tunnel traversal, and distinct ghost identity choices (formula-based targets, legal fallbacks)
- [ ] 4.6 Manual browser: end-to-end play — start new game, complete full maze via dot routes and tunnels, verify win condition and score state

## Phase 5: Cleanup / Documentation

- [x] 5.1 Review `open-pacman-5f067617c2e1a38be048966ed3ff2960fb428838/src/js/game.js` and `open-pacman-5f067617c2e1a38be048966ed3ff2960fb428838/src/js/maze.js` for temporary or debug code; remove or commit appropriately
- [x] 5.2 Update comments to reflect logical-grid authority and new navigation/collision contracts
