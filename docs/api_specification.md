# API Specification

This document outlines the API endpoints used in the application.

## Error Handling

It's important to note that error responses may occur during API interactions. These responses will typically include:

*   An HTTP status code (e.g., 400 Bad Request, 404 Not Found, 500 Internal Server Error) indicating the type of error.
*   An error message providing more details about the cause of the error.

## Game Sessions

### Get Game Session

**Method:** GET

**Path:** `/api/game_sessions/{gameId}`

**Description:** Fetches a specific game session by its ID from the `game_sessions` table.

**Request Parameters:**

*   `id` (UUID, required): The ID of the game session to retrieve.

**Response:**

A JSON object representing the game session. The response includes fields from the `game_sessions` table (see `docs/database_schema.md`), such as: `id`, `sessionName`, `maxPlayers`, `questionGroupId`, `timePerQuestionInSec`, `createdAt`, `status`, and `question_index`. The `players` field is a JSONB object (see `docs/database_schema.md`) where:

*   Keys: User IDs (UUIDs).
*   Values: Objects containing player-specific data for this session, including:
    *   `score` (INT): The user's current score in the session.
    *   `answers` (JSON): An object where keys are question IDs and values are the player's submitted answers for those questions.
For example: `{"user1_id": {"score": 100, "answers": {"question1_id": "A", "question2_id": "B"}}, "user2_id": {"score": 150, "answers": {"question1_id": "C", "question2_id": "A"}}}`.


### Update Game Session

**Method:** PUT

**Path:** `/api/game_sessions/{gameId}`

**Description:** Updates a specific game session.

**Request Parameters:**

*   `gameId` (UUID, required) - The ID of the game session to update.

**Request Body:**

A JSON object containing the fields to update (e.g., `status`, `question_index`). For example, to start a game, the request body would be: `{ "status": "active" }`. To move to the next question, it might be: `{ "question_index": 2 }`.

**Example Request Body:**



### Submit Answer

**Method:** POST

**Path:** `/api/game_sessions/{gameId}/answers`

**Description:** Submits a player's answer to a question in a game session.

**Request Parameters:**

*   `gameId` (UUID, required) - The ID of the game session.

**Request Body:**

A JSON object containing the player's ID, the question ID, and the submitted answer. For example: `{ "playerId": "user-uuid", "questionId": "question-uuid", "answer": "A" }`.

**Example Request Body:**



## Questions

### Get Questions by Group ID

**Method:** GET

**Path:** `/api/questions?groupId={groupId}`
**Description:** Fetches all questions belonging to a specific group.
**Response:** An array of JSON objects, each representing a question. Each question in the response has fields corresponding to the columns in the `questions` table (see `docs/database_schema.md`), such as:
    *   `id` (UUID): Unique identifier for the question.
    *   `text` (TEXT): The text content of the question.
    *   `answers` (JSONB): An array of possible answers.
    *   `correctAnswer` (TEXT): The correct answer of the question.
    *   `groupId` (UUID): The ID of the group that the question belongs to.
    *   `difficulty` (INT): The difficulty of the question.
