## Context

Gomoku already supports simple, normal, and hard choices, but normal uses basic run lengths and hard evaluates only a single opponent reply.

## Goals / Non-Goals

**Goals:**
- Recognize contiguous and single-gap threats such as live threes, rush fours, and double threats.
- Use 3-ply minimax with alpha-beta pruning and a bounded candidate set in hard mode.
- Retain responsive turns through candidate sorting and fixed depth.

**Non-Goals:**
- Full-board exhaustive search, online play, opening books, or professional Renju forbidden-move rules.

## Decisions

Pattern scoring evaluates directional lines around a candidate, including a single internal gap. Hard mode generates nearby candidates, ranks them by tactical score, keeps the highest-ranked eight at the root and six at deeper nodes, and performs AI → player → AI search. Alpha-beta pruning stops uncompetitive branches.

This is materially stronger than one-ply scoring while maintaining predictable UI latency without a worker.

## Risks / Trade-offs

- [Search can still slow late games] → Cap depth and candidate counts, and retain immediate-win checks.
- [Pattern scoring is heuristic] → Weight forced wins, blocks, open fours, and double threats above material counts.
