## Why

Gomoku mode and AI difficulty buttons update state but do not provide sufficiently visible selected feedback in the current application theme, making the active choice unclear.

## What Changes

- Add a high-contrast visual selected state to game-mode and AI-difficulty controls.
- Keep selected controls distinguishable in both light and dark themes.

## Capabilities

### New Capabilities

- `gomoku-selection-feedback`: Clear active-state feedback for Gomoku mode and difficulty settings.

### Modified Capabilities

<!-- None. -->

## Impact

- Updates presentation classes in `GomokuView.vue` only.
