# Current Application Logic

This document summarizes the core logic of the application, focusing on the `GamePage` component (`src/app/game/[gameId]/page.tsx`).

## Game Sessions

-   **Fetching Session Data:** On loading, the component fetches game session data (ID, name, status, etc.) and associated questions from the database using the `gameId` parameter.
-   **Session Status:** The application checks if the game session status is 'finished'. If so, it redirects to a results page (currently not implemented).
-   **Starting a Game:** The admin can start the game, which updates the session status in the database to 'active'.

## Players

-   **Listing Players:** The "List Players" button displays a popover with the list of players currently in the session. This list is fetched from Redis, which stores player information (likely user IDs). User nicknames are then fetched from the database.
-   **Removing Players:** The functionality to remove players from a session (indicated by a trash icon) has been temporarily removed from the UI. The underlying logic for removing players involved updating the player list in Redis, but it was not functioning correctly.

## Questions and Answers

-   **Fetching Questions:** Questions are fetched from the database based on the game session's question group ID.
-   **Current Question:** The component displays the current question to the players.
-   **Submitting Answers:** Players can submit answers. The application checks the answer against the correct answer and awards points based on whether the answer was correct and, potentially, the time taken to answer (though the timing logic might be incomplete).
-   **Updating Scores:** Player scores are stored and updated in Redis.

## Leaderboard and Ranking

-   **Fetching Leaderboard:** The application fetches and displays a leaderboard showing player scores. This data is retrieved from Redis.
-   **Fetching Ranking:** The application also fetches and displays player rankings, likely for the current question or round. This data is also retrieved from Redis.

## Timing

-   **Question Timer:** If a time limit per question is set for the game session, a timer is displayed. The timer logic might be incomplete or not fully integrated with the answer submission process.

## Other Functionality

-   **Game Information:** The "Game Info" button displays a popover with information about the game session (name, number of players, time per question, etc.).
-   **Navigation:** An "ArrowLeft" button allows navigation back to the main page.

**Note:** This documentation is based on a snapshot of the code and may not reflect all details or potential future changes.