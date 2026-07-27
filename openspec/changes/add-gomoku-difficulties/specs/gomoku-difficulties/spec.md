## ADDED Requirements

### Requirement: AI difficulty selection
The system SHALL offer simple, normal, and hard difficulty settings when human-versus-computer mode is selected. Normal SHALL be the default difficulty.

#### Scenario: Player selects a difficulty
- **WHEN** a player selects simple, normal, or hard in an AI game
- **THEN** the system SHALL start a new game using the selected difficulty

#### Scenario: Difficulty does not affect local mode
- **WHEN** a player switches to same-device two-player mode
- **THEN** the system SHALL not display or apply an AI difficulty setting

### Requirement: Difficulty behavior
The system SHALL make simple AI choose a random nearby valid move except for immediate wins or blocks, normal AI use a heuristic offense/defense score, and hard AI evaluate a bounded opponent reply in addition to the normal score.

#### Scenario: AI blocks immediate human win at every difficulty
- **WHEN** the human has an immediate five-in-a-row winning move and the computer has a valid blocking intersection
- **THEN** the computer SHALL place the blocking move regardless of selected difficulty

### Requirement: Difficulty preference persistence
The system SHALL store the selected AI difficulty locally and restore it for the next human-versus-computer game.

#### Scenario: Player reopens the application
- **WHEN** a player has previously selected a difficulty and opens Gomoku again
- **THEN** the system SHALL select the stored difficulty, or normal when no valid stored value exists
