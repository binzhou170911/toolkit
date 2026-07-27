## Context

The existing Gomoku AI uses a normal heuristic that immediately wins or blocks and otherwise evaluates attack and defense scores. Difficulty selection changes only the AI's candidate selection; board rules, controls, and local-only architecture remain unchanged.

## Goals / Non-Goals

**Goals:**
- Offer simple, normal, and hard AI choices in the human-versus-computer controls.
- Preserve normal as the default and persist the player's choice.
- Make strategy changes predictable by beginning a fresh game after selection.

**Non-Goals:**
- Full minimax search, online rankings, or adaptive difficulty.
- Difficulty selection for same-device two-player games.

## Decisions

### Bounded heuristic strategies

Simple uses a randomized nearby candidate after still preventing/taking an immediate five. Normal retains the current weighted offense/defense heuristic. Hard evaluates the strongest normal candidate positions with a one-ply opponent reply penalty, favoring durable threats and avoiding moves that leave an immediate answer.

This keeps turns responsive in a desktop UI while making the difference in style observable. A deep minimax tree would introduce variable turn latency without a need for expert-level play.

### Persisted preference and game reset

Difficulty extends the existing Gomoku preferences object and falls back to `normal` for older storage. Selecting a different difficulty calls the existing restart routine, ensuring every move in a game is produced by one strategy.

## Risks / Trade-offs

- [Hard difficulty can be slower late in a game] → Restrict its look-ahead to a small ranked candidate set.
- [Random simple moves can be unexpectedly strong] → Retain only immediate win/block protection; all other choices remain random.
- [Existing preferences lack difficulty] → Default absent or malformed values to normal.
