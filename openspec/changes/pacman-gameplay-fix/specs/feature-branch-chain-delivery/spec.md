# Feature Branch Chain Delivery Specification

## Purpose

Define an isolated, reviewable delivery path for gameplay repairs before any integration into `main`.

## Requirements

### Requirement: Isolated Repair Units

Each gameplay repair unit MUST be authored in its own dedicated feature branch and worktree. The delivery record MUST identify the unit's scope, predecessor or integration point, and rollback path. A repair unit MUST NOT be authored directly on `main`.

#### Scenario: Starts an isolated repair unit

- GIVEN a repair unit is approved for implementation
- WHEN work begins on that unit
- THEN a dedicated branch and worktree contain its changes
- AND its scope and rollback path are recorded

#### Scenario: Records chain dependency

- GIVEN a repair unit depends on an earlier unit
- WHEN its delivery record is prepared
- THEN it identifies the earlier unit as its predecessor or integration point

#### Scenario: Rejects direct main development

- GIVEN a repair unit has not entered the integration flow
- WHEN a change is proposed directly on `main`
- THEN the change is withheld from `main` and redirected to an isolated unit

### Requirement: Integration Before Main

An integration branch MUST accumulate approved repair units in their recorded order. The combined gameplay behavior MUST be validated and manually accepted on that branch before the integration result is merged into `main`.

#### Scenario: Integrates approved units before main

- GIVEN multiple repair units have passed their unit validation
- WHEN they are accepted into the integration flow
- THEN the integration branch contains the approved combined changes
- AND `main` remains unchanged until combined acceptance

#### Scenario: Holds a failing integration result

- GIVEN an integrated repair unit fails combined validation or acceptance
- WHEN the failure is reported
- THEN the affected unit is withheld or reverted on the integration branch
- AND the failing result is not merged into `main`
