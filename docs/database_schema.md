# Database Schema
  
This document describes the database schema used by the application.


## Tables

### `game_sessions`

**Relationships:**
-   References `groups` via the `questionGroupId` column. This means each game
    session is associated with a specific group of questions.


This table stores information about individual game sessions.

| Column Name           | Data Type           | Description                                                                                                                               |
| --------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                  | UUID (Primary Key)  | Unique identifier for the game session.                                                                                                   |
| `sessionName`         | TEXT                | The name of the game session.                                                                                                             |
| `maxPlayers`          | INT                 | The maximum number of players allowed to join the session.                                                                                 |
| `questionGroupId`     | UUID (Foreign Key)  | Foreign key referencing the `groups` table, indicating the group of
questions used in this session.                                          |
| `timePerQuestionInSec` | INT                 | The time limit for each question in seconds.                                                                                              |
| `createdAt`           | TIMESTAMP           | Timestamp indicating when the game session was created.                                                                                   |
| `status`              | TEXT (Enum)         | The current status of the game session. Possible values: `waiting`
(not started), `active` (in progress), `finished` (completed).          |
| `players`             | JSONB               | JSONB object storing information about players in the session. The
structure is a JSON object where keys are user IDs and values are objects containing player-specific data for this session (e.g., current score, answers submitted).                                                                                       |
| `question_index`      | INT                 | Index of the currently active question within the selected question
group.                                                                 |

**Example `players` JSON structure:**




### `groups`

This table stores the different groups of questions.

| Column Name | Data Type          | Description                                                      |
| ----------- | ------------------ | ---------------------------------------------------------------- |
| `id`        | UUID (Primary Key) | Unique identifier for the question group.                        |
| `name`      | TEXT               | The name of the question group (e.g., "General Knowledge", "Science"). |

### `questions`

**Relationships:**
-   References `groups` via the `groupId` column. This means each question
    belongs to a specific group.

| Column Name   | Data Type           | Description                                                                                    |
| ------------- | ------------------- | ---------------------------------------------------------------------------------------------- |
| `id`          | UUID (Primary Key)  | Unique identifier for the question.                                                            |
| `text`        | TEXT                | The text of the question.                                                                      |
| `answers`     | JSONB               | An array of possible answers for the question. Can be Multiple choice or
Numerical. |
| `correctAnswer` | TEXT               | The correct answer of the question.                                                           |
| `groupId`     | UUID (Foreign Key)  | Foreign key referencing the `groups` table, indicating the group this
question belongs to. |
| `difficulty`  | INT                 | Difficulty of the question. May be rated from 1 to 5.                  |

### `users`

This table stores information about the users of the application.

| Column Name | Data Type          | Description                                     |
| ----------- | ------------------ | ----------------------------------------------- |
| `id`        | UUID (Primary Key) | Unique identifier for the user.                 |
| `nickname`  | TEXT               | The user's display name or nickname.            |

## Redis Usage
This application uses Redis as a key-value store to manage game session data,
player scores, and leaderboards efficiently. The keys used in Redis are
typically the game session IDs.
### Data Structures in Redis
#### Leaderboard and Player Scores
Redis is used to store player scores and the overall leaderboard for each game
session. The data is stored as a JSON string under a key that matches the game
session ID.
The JSON structure for leaderboard and player scores is an object where:
-   **Keys:** User IDs (UUIDs).
-   **Values:** The user's current score (number).
**Example JSON Structure:**





