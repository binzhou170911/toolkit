## ADDED Requirements

### Requirement: Offline Gomoku board
The system SHALL provide a 15×15 offline Gomoku board where black plays first, only empty intersections accept moves, and a game ends when a player forms five or more contiguous stones horizontally, vertically, or diagonally.

#### Scenario: Player wins with five contiguous stones
- **WHEN** a valid move creates five contiguous stones for the current player in any supported direction
- **THEN** the system SHALL end the game, announce the winner, and highlight the winning sequence

#### Scenario: Player attempts an occupied intersection
- **WHEN** a player selects an intersection that already contains a stone
- **THEN** the system SHALL leave the board and turn unchanged

### Requirement: Game modes and local computer opponent
The system SHALL offer same-device two-player mode and human-versus-computer mode, with the human allowed to choose black or white before starting an AI game.

#### Scenario: Computer takes its turn
- **WHEN** an AI game reaches the computer's turn and the game has not ended
- **THEN** the system SHALL place one valid computer move and return the turn to the human

#### Scenario: Computer prevents an immediate loss
- **WHEN** the human has an empty intersection that would create a five-in-a-row on the next move
- **THEN** the computer SHALL choose a move that blocks an available immediate winning intersection

### Requirement: Game controls
The system SHALL provide restart, resign, and undo controls. Undo SHALL remove one move in a two-player game and remove the latest human and computer moves together in an AI game where both exist.

#### Scenario: Restart a game
- **WHEN** the player selects restart
- **THEN** the system SHALL clear the board, set black as the next player, and begin a new game with the selected settings

#### Scenario: Undo an AI exchange
- **WHEN** the player selects undo after a completed human and computer exchange
- **THEN** the system SHALL remove both moves and make it the human player's turn

### Requirement: Local statistics and game feedback
The system SHALL display the current turn and most recent move, maintain local aggregate wins, losses, draws, and current win streak, and persist the user's sound preference locally.

#### Scenario: Completed game updates statistics
- **WHEN** a game ends by five-in-a-row, draw, or resignation
- **THEN** the system SHALL update the applicable local statistics once

#### Scenario: Sound preference persists
- **WHEN** a player changes the sound preference
- **THEN** the system SHALL retain that preference after the application is reopened

### Requirement: Toolkit discovery and navigation
The system SHALL register Gomoku as a searchable Toolkit tool and open its dedicated game view when selected.

#### Scenario: Search opens Gomoku
- **WHEN** a user searches for a Gomoku keyword and selects the result
- **THEN** the system SHALL display the Gomoku game view
