# Proposal: Pac-Man Gameplay Reliability Fix

## Intent

Repair gameplay defects that skip dots, miss Pac-Man/ghost contacts, strand actors, or allow ghosts outside legal maze lanes while preserving distinct ghost behavior.

## Scope

### In Scope
- Reliable dot collection throughout continuous Pac-Man movement.
- Reliable Pac-Man/ghost collision handling, including pass-through and nearby cases.
- Legal, non-stalling Pac-Man and ghost movement across walls, intersections, house door, and tunnel rules; improve distinct ghost intelligence.
- Deliver repairs as dedicated branch/worktree units merged into an integration branch before `main`.

### Out of Scope
- Visual, audio, maze-art, or score-system redesign.
- Arcade-ROM-perfect behavior or timing changes.
- Exact tile values, hitbox margins, sweep algorithm, and door/tunnel policy values until design.

## Capabilities

### New Capabilities
- `pacman-collection-and-collision`: Continuous collectible traversal and explicit actor-contact detection.
- `ghost-navigation-and-behavior`: Legal maze navigation, unsticking behavior, special-space rules, and distinct ghost targeting.
- `feature-branch-chain-delivery`: Isolated repair worktrees and an integration branch that accumulates approved units before `main`.

### Modified Capabilities
None — `openspec/specs/` contains no existing capability specs.

## Approach

Use the logical grid as the traversal authority: track movement between positions to consume crossed dots, define an explicit rendered-shape hitbox and between-sample collision strategy, and centralize legal moves/special-space rules for direction selection and recovery. Preserve per-ghost targeting over that shared navigation policy. Plan work as independently reversible branch/worktree repairs integrated in sequence.

Evidence mapping: OW-003/OW-004 support logical-grid and legal-space guidance; OW-002 supports explicit hitboxes and between-sample contact handling; OW-001 supports frame-time caution. OW-004 is historical evidence, not MVP authority; exact tile values, margins, sweep, and door/tunnel semantics remain design decisions.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `src/js/game.js` | Modified | Movement, collection, collision, legal moves, and ghost decisions. |
| `src/js/maze.js` | Modified | Clarify or encode approved door/tunnel legal-space policy. |
| `openspec/changes/pacman-gameplay-fix/` | Modified | Design, specs, and branch-chain task plan. |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Contact false positives | Med | Calibrate the approved explicit hitbox against rendered sprites. |
| Special-space regression | Med | Test walls, intersections, door, and tunnel separately. |
| Repair integration conflict | Low | Keep units isolated and revertible from the integration branch. |

## Rollback Plan

Do not merge the integration branch into `main` until manual acceptance. Revert the affected repair-unit merge on the integration branch, then restore the prior movement/collision behavior from that unit if validation fails.

## Dependencies

- Design decisions for exact collision, dot-sweep, and door/tunnel semantics.
- Manual browser gameplay verification.

## Success Criteria

- [ ] Continuous movement consumes every crossed dot exactly once and completes the maze count.
- [ ] Approved direct, nearby, and pass-through collision scenarios resolve consistently.
- [ ] Actors stay in legal space and recover from blocked movement; ghost behaviors remain distinct.
- [ ] Dedicated repair branches/worktrees integrate through an integration branch before `main`.
