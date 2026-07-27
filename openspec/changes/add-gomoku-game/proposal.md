## Why

Toolkit currently provides productivity utilities but no lightweight, offline recreational tool. A built-in Gomoku game gives users a quick local break without requiring a browser, account, or network connection, while exercising the application's extensible tool surface.

## What Changes

- Add a Gomoku tool with a responsive 15×15 board and standard five-in-a-row victory detection.
- Provide local two-player and human-versus-computer modes, including a normal-difficulty defensive/offensive AI.
- Add game controls for undo, resigning, restarting, choosing the human player's color, and a last-move indicator.
- Persist local game statistics and the sound preference.
- Register the tool in Toolkit search and route it to its dedicated game view.

## Capabilities

### New Capabilities

- `gomoku-game`: Offline Gomoku gameplay, local AI, controls, and persistent statistics within Toolkit.

### Modified Capabilities

<!-- None. -->

## Impact

- Adds a dedicated Vue view and pure TypeScript game/AI logic under `src/tools/gomoku`.
- Updates the frontend tool registry and root view routing in `src/tools/index.ts` and `src/App.vue`.
- Uses existing localStorage helpers; no backend APIs or new dependencies are required.
