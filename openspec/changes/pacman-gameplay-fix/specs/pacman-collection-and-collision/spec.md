# Pac-Man Collection and Collision Specification

## Purpose

Define reliable collectible traversal and Pac-Man/ghost contact outcomes during continuous gameplay movement.

## Requirements

### Requirement: Continuous Collectible Collection

The game MUST consume every uneaten maze collectible traversed by Pac-Man during legal continuous movement exactly once. Collection SHALL update maze-progress state, and maze completion MUST occur only after every required collectible is consumed.

#### Scenario: Collects a continuous run of dots

- GIVEN several uneaten dots lie on a legal route
- WHEN Pac-Man moves continuously across their locations without stopping on each one
- THEN every crossed dot is consumed
- AND each consumed dot updates maze progress once

#### Scenario: Does not double-count a revisited dot

- GIVEN Pac-Man previously consumed a dot
- WHEN Pac-Man later traverses that location again
- THEN maze progress does not change for that dot

#### Scenario: Completes after the final required collectible

- GIVEN exactly one required collectible remains
- WHEN Pac-Man traverses it legally
- THEN the game records maze completion

### Requirement: Reliable Actor Contact Resolution

The game MUST evaluate Pac-Man/ghost contact against the approved collision boundary throughout gameplay advancement. It MUST apply the configured outcome for the ghost's current game state to direct, approved-nearby, and pass-through contact, and MUST NOT resolve contact for actors outside that boundary.

#### Scenario: Resolves direct contact

- GIVEN Pac-Man and a ghost are in direct contact under the approved boundary
- WHEN gameplay advances
- THEN the configured contact outcome is applied

#### Scenario: Resolves approved nearby contact

- GIVEN Pac-Man and a ghost are positioned within the approved nearby-contact boundary
- WHEN gameplay advances
- THEN the same configured contact outcome is applied

#### Scenario: Resolves pass-through contact

- GIVEN Pac-Man and a ghost cross through one another between observed gameplay positions
- WHEN gameplay advances past the crossing
- THEN contact is resolved even if their ending positions are separate

#### Scenario: Preserves a non-contact separation

- GIVEN Pac-Man and a ghost remain outside the approved collision boundary
- WHEN gameplay advances
- THEN no contact outcome is applied
