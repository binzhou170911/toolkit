## Context

The existing conditional `bg-primary` class relies on theme token contrast that is not sufficiently perceptible for these compact settings controls.

## Goals / Non-Goals

**Goals:**
- Make the selected mode and difficulty unmistakable through fill, border, ring, weight, and shadow.

**Non-Goals:**
- Change game state behavior or add new settings.

## Decisions

Use a shared explicit selected class with primary fill, foreground text, primary ring, font weight, and shadow. Inactive choices retain the secondary fill and a hover treatment. This provides redundant cues rather than relying on color alone.

## Risks / Trade-offs

- [More visual emphasis in a compact panel] → Apply it only to the selected option.
