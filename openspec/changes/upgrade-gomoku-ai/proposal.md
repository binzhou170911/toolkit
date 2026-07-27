## Why

The current difficult Gomoku AI uses only a shallow reply heuristic and does not create or defend multi-move threats reliably. Players need difficulty tiers with an actually challenging hard mode.

## What Changes

- Strengthen normal mode with richer contiguous and broken-line pattern scoring.
- Replace difficult mode with bounded three-ply minimax and alpha-beta pruning.
- Preserve fast simple mode and immediate win/block protection at every difficulty.

## Capabilities

### New Capabilities

- `gomoku-ai-search`: Layered Gomoku AI strategies with tactical pattern scoring and bounded adversarial search.

### Modified Capabilities

<!-- None. -->

## Impact

- Updates local Gomoku move-selection logic only; no dependencies or backend changes.
