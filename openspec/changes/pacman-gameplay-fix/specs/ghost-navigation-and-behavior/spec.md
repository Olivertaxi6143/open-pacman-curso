# Ghost Navigation and Behavior Specification

## Purpose

Define legal, recoverable maze movement for Pac-Man and ghosts while preserving distinct ghost decision behavior.

## Requirements

### Requirement: Legal and Non-Stalling Actor Navigation

The game MUST keep active Pac-Man and ghost actors in legal traversable maze space and MUST NOT allow them to enter walls. When an intended move is blocked and a legal continuation or permitted turn exists, an active actor MUST continue or recover through a legal route rather than remain stuck at the obstruction.

#### Scenario: Traverses a legal intersection

- GIVEN an active actor reaches an intersection with legal exits
- WHEN it continues or selects a permitted direction
- THEN its subsequent positions remain in legal maze space

#### Scenario: Recovers from a blocked direction

- GIVEN an active actor attempts a blocked direction with a legal continuation or turn available
- WHEN gameplay advances through the obstruction
- THEN the actor resumes legal movement without entering the wall

#### Scenario: Prevents a wall escape

- GIVEN an actor is adjacent to a wall
- WHEN movement would place it inside that wall
- THEN the actor remains outside the wall and follows only legal movement

### Requirement: Consistent Special-Space Access

The game MUST apply a consistent approved access policy for the ghost-house door and tunnel according to actor identity and current game state. An actor not permitted by that policy MUST NOT cross the special space; a permitted actor MUST remain on a legal route throughout the transition.

#### Scenario: Enforces house-door access

- GIVEN an actor is not permitted to cross the ghost-house door in its current state
- WHEN it attempts that route
- THEN the door crossing is denied and the actor remains in legal space

#### Scenario: Preserves legal tunnel traversal

- GIVEN an actor is permitted to use a maze tunnel
- WHEN it enters and exits the tunnel
- THEN it completes the transition without leaving legal maze space

### Requirement: Distinct Ghost Decision Behavior

The game MUST provide each configured ghost identity with a distinguishable target-selection or route-selection behavior while applying shared legal-navigation rules. If a preferred route is unavailable, each ghost MUST choose a legal fallback and MUST NOT stall solely because that preference is blocked.

#### Scenario: Retains identity-specific choices

- GIVEN a controlled maze state with multiple legal routes for each configured ghost identity
- WHEN each ghost makes its next decision
- THEN each decision matches its approved identity-specific behavior and is legal

#### Scenario: Falls back from an unavailable preference

- GIVEN a ghost's preferred route is unavailable while another legal route exists
- WHEN it makes its next decision
- THEN it continues through a legal fallback route without becoming stuck
