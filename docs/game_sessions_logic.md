# Game Sessions Logic



This document details the logic related to game sessions within the application.

## Database Schema: `game_sessions`

The `game_sessions` table in the Supabase database stores information about each game session. The relevant columns for this application's logic are:

-   `id` (UUID, primary key): Unique identifier for the game session.
-   `sessionName` (TEXT): The name of the game session.
-   `maxPlayers` (INT): The maximum number of players allowed in the session.
-   `questionGroupId` (UUID): A foreign key referencing the `groups` table, indicating the question group associated with this session.
-   `timePerQuestionInSec` (INT): The time limit for each question, in seconds.
-   `createdAt` (TIMESTAMP): The timestamp indicating when the game session was created.
-   `status` (TEXT): The current status of the game session, which can be one of the following: `waiting`, `active`, or `finished`.
-   `players` (JSONB): A JSONB object storing information about players in the session.
    The structure is a JSON object where:
    -   **Keys:** User IDs (UUIDs).
    -   **Values:** Objects containing player-specific data for this session, including:
        -   `score` (INT): The user's current score in the session.
        -   `answers` (JSON): An object where keys are question IDs and values are the player's submitted answers for those questions.
    **Example `players` JSON structure:**
    
-   `question_index` (INT): The index of the currently active question in the question group.

## Supabase Query to Fetch a Game Session



The following Supabase query is used to fetch a game session by its ID:


## Fetching Session Data

-   When a user navigates to a game session page (e.g., `/game/[gameId]`), the application attempts to fetch the game session data from a database (likely Supabase).
-   The `gameId` parameter from the URL is used to query the database for the specific game session.
-   The fetched data includes:
    -   `id`: Unique identifier of the game session.
    -   `sessionName`: Name of the game session.
    -   `maxPlayers`: Maximum number of players allowed in the session.
    -   `questionGroupId`: Identifier of the question group associated with the session.
    -   `timePerQuestionInSec`: Time limit for each question in seconds.
    -   `createdAt`: Timestamp indicating when the session was created.
    -   `status`: Current status of the session (`waiting`, `active`, or `finished`).
    -   `players`: An array or object representing the players in the session (the exact format needs to be clarified).
    -   `question_index`: The index of the current question being presented in the session.
-   If the game session data is successfully fetched, it is stored in the component's state (e.g., using `useState`).
-   If there are errors during the fetch, appropriate error handling is performed (e.g., logging the error, displaying a user-friendly message).

## Session Status

-   The application monitors the game session's status.
-   If the status is `finished`, the application attempts to redirect the user to a results page. However, the results page functionality might not be fully implemented yet.

## Starting a Game

-   An administrator (or a user with appropriate permissions) can initiate the start of a game session.
-   This action triggers an update to the game session's status in the database. The status is changed from `waiting` to `active`.
-   Upon successful update, a success message is displayed. If there are errors during the update, an error message is shown.