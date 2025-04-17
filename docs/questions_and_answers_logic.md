# Questions and Answers Logic

This document describes the logic for handling questions and answers within the application.

## Fetching Questions
-   The application fetches questions from the Supabase database that are relevant to the current game session.
-   The questions are associated with a "question group," and the `questionGroupId` from the `game_sessions` table is used to identify and retrieve the appropriate set of questions.
-   The questions are stored in the `questions` table in Supabase.
- The `questions` table has at least the following relevant columns:
    -   `id`: Unique identifier for the question.
        (UUID, Primary Key).
    -   `text`: The text content of the question.
        (TEXT).
    -   `answers`: An array of possible answers. (JSONB).
    -   `correctAnswer`: The correct answer of the question. (TEXT)
    -   `groupId`: The ID of the group that the question belongs to.
        (UUID, Foreign Key).
    - `difficulty`: The difficulty of the question. (INT).
- The data fetched for each question includes:
    -   `text`: The text content of the question.
    -   `answers`: An array of possible answers.
    - `groupId`: ID of the group.
- The Supabase query used to fetch questions is as follows:


-   The retrieved questions are stored in the component's state.

## Current Question

-   The application determines and displays the current question to the players in the game session.
-   The logic for determining the current question might involve:
    -   Tracking the `question_index` within the game session data. This index likely points to the current question within the fetched list of questions.
    -   Potentially having different logic for different game states (e.g., the first question at the start of the game, the next question after an answer is submitted).
-   The relevant question data (text and answers) is then rendered in the UI.

## Submitting Answers

-   Players can submit their answers to the current question.
-   The submission process involves:
    1.  Capturing the player's selected answer (e.g., from a button click or input field).
    2.  Validating the submission (e.g., ensuring an answer was selected).
    3.  Determining if the submitted answer is correct. This likely involves comparing the selected answer to the stored correct answer for the question.
    4.  Awarding points (if applicable). The logic for awarding points might consider:
        -   Whether the answer was correct.
        -   Potentially the time taken to answer (if there's a time limit).
        -   Potentially the difficulty of the question.
    5.  Updating the player's score. This involves:
        -   Fetching the current scores from Redis. Redis is used to store player scores and leaderboards for each game session efficiently.
            -   As described in `docs/database_schema.md` and `docs/players_logic.md`, Redis stores this data under a key that matches the game session ID.
            -   The data is stored as a JSON object where:
                -   Keys: User IDs (strings).
                -   Values: The user's current score (number).
        -   Updating the score for the submitting player.
        -   Storing the updated scores back in Redis.
    6.  Providing feedback to the player. This could include:
        -   Indicating whether the answer was correct or incorrect.
        -   Displaying the points earned (if any).

## Next Question

-   After an answer is submitted (or the time for a question expires), the application needs to transition to the next question.
-   The logic for this likely involves:
    1.  Incrementing or updating the `question_index` in the game session data.
    2.  Fetching the next question from the list of questions based on the updated index.
    3.  Updating the UI to display the new current question.
    4.  Potentially resetting any timers or other question-specific state.