## Why

The current Gomoku computer opponent has one fixed normal strategy. Players need a way to choose a more relaxed or more challenging game without changing the core board rules.

## What Changes

- Add simple, normal, and hard difficulty selection to human-versus-computer games.
- Keep normal as the default and persist the selected difficulty locally.
- Restart the current game when the player changes difficulty so that one game never mixes AI strategies.

## Capabilities

### New Capabilities

- `gomoku-difficulties`: Configurable local computer-opponent difficulty levels for the Gomoku tool.

### Modified Capabilities

<!-- None. -->

## Impact

- Extends the Gomoku game engine's move-selection strategy and the dedicated game view.
- Uses existing local storage; no backend changes or dependencies.
