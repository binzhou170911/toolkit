## Context

Toolkit routes simple utilities through the shared `ToolView`, while feature-rich tools such as the calculator and AI Hub own dedicated Vue views. Gomoku needs interactive board state, turn handling, and an AI response loop, so it follows the dedicated-view pattern without a backend or external service.

## Goals / Non-Goals

**Goals:**
- Deliver a responsive offline 15×15 Gomoku game inside the existing Toolkit shell.
- Support same-device two-player games and a deterministic, normal-difficulty local AI.
- Keep board rules and AI logic isolated from Vue rendering so they can be tested or expanded later.
- Persist aggregate statistics and the sound preference locally.

**Non-Goals:**
- Online play, accounts, matchmaking, and cloud synchronization.
- Renju forbidden-move rules, alternate board sizes, saved game records, or replay.
- Expert-level exhaustive-search AI.

## Decisions

### Dedicated SVG board view

`GomokuView.vue` will render a semantic SVG board and handle point selection. SVG scales cleanly with Toolkit's resizable desktop window and supports visible grid lines, stones, last-move markers, and a winning-line overlay without a canvas redraw pipeline.

Alternatives considered:
- HTML grid: simple DOM interaction but awkward for board intersections and line presentation.
- Canvas: efficient but less declarative and harder to style or inspect alongside the existing Vue UI.

### Pure game engine and heuristic AI

`src/tools/gomoku` will contain the board model, move validation, win detection, and move-scoring helpers. The AI evaluates empty candidate points by scoring attack and defense patterns, immediately taking a win or blocking one before selecting its highest-scoring move. This produces a responsive, understandable normal difficulty without a costly minimax tree.

Alternatives considered:
- Random moves: too weak and fails to provide a meaningful human-versus-computer mode.
- Minimax with alpha-beta pruning: stronger but substantially increases implementation, tuning, and UI responsiveness risks for this release.

### Local state and aggregate persistence

An in-progress board lives in component state and resets when the user starts a game. Aggregate wins/losses/draws, current streak, and sound preference use the existing localStorage abstraction. No game data leaves the device.

Alternatives considered:
- Pinia for all state: unnecessary global state for a self-contained page.
- Tauri storage or backend persistence: adds dependencies and permissions without a product need.

### Toolkit integration

The game exports a standard `Tool` descriptor for search and is manually registered in `src/tools/index.ts`, matching the current registry. `App.vue` adds a dedicated `gomoku` route branch, matching the calculator and color-picker pattern.

## Risks / Trade-offs

- [AI may make non-optimal strategic choices] → Keep the AI explicitly positioned as normal difficulty; prioritize immediate wins and blocks.
- [Responsive SVG coordinates can drift after resize] → Derive point positions from SVG viewBox coordinates rather than pixel measurements.
- [Rapid clicks can race the AI turn] → Reject moves while an AI response is pending.
- [Existing localStorage data can be malformed] → Validate and fall back to default statistics/preferences.

## Migration Plan

The change is additive. Deploying adds a searchable tool and initializes defaults lazily on first game use. Removing the feature only leaves an unused localStorage key and requires no rollback migration.
