## ADDED Requirements

### Requirement: Layered AI difficulty behavior
The system SHALL retain simple AI with random non-forcing moves, use tactical pattern scoring for normal AI, and use bounded three-ply alpha-beta search for hard AI.

#### Scenario: Hard AI evaluates a response sequence
- **WHEN** hard AI chooses a non-forcing move
- **THEN** the system SHALL compare candidate moves through an AI move, best player response, and AI follow-up before choosing a move

### Requirement: Tactical threat evaluation
The system SHALL prioritize immediate wins and blocks at every difficulty and assign higher tactical value to open fours, rush fours, open threes, and broken-line threats than to shorter patterns.

#### Scenario: AI defends an immediate win
- **WHEN** the player has a valid immediate five-in-a-row winning point
- **THEN** the AI SHALL choose a valid blocking point before evaluating non-forcing moves
