# Timing Logic

This document details the logic related to managing time limits for questions in the application.

## Question Timer

-   The application implements a timer to limit the amount of time players have to answer each question.
-   The timer is active only if a time limit per question is set for the game session. This time limit is stored in the `timePerQuestionInSec` property of the game session data.
-   When a question is displayed, the timer is initialized with the value of `timePerQuestionInSec`.
-   The timer then counts down every second. This is typically implemented using JavaScript's `setInterval` function or a similar mechanism.
-   The countdown is implemented using JavaScript's `setInterval`. The remaining time is stored in the `time` state variable, which is updated every second.
-   The following code snippet illustrates how the timer is implemented using `setInterval` and the `time` state variable:
    

    
-   The remaining time is displayed in the user interface, often as a visual countdown.
-   If the timer reaches zero:
    -   The application should prevent further answer submissions for that question.
    -   It might automatically submit the current state as an unanswered question, or it might require explicit action (although current logic is unclear).
    -   The application might provide feedback to the player that the time has expired (e.g., a message or sound).
-   The timer is reset or cleared when transitioning to the next question. This involves stopping the countdown and potentially re-initializing the time with the new question's time limit (if applicable).

## Time Expired Handling

-   The application needs to handle the scenario when the time for a question expires.
-   This involves:
    1.  Preventing further answer submissions for the expired question.
    2.  Potentially recording or submitting the current state as an unanswered question (the exact behavior needs clarification).
    3.  Providing feedback to the player that the time has run out.
    4.  Transitioning to the next question (as described in "Next Question" in "Questions and Answers Logic").

## Integration with Answer Submission

-   The timing logic needs to be tightly integrated with the answer submission process.
-   When a player submits an answer:
    1.  The timer should be stopped immediately.
    2.  The remaining time (at the moment of submission) might be used as a factor in calculating the player's score (e.g., awarding more points for faster correct answers).
    3.  The submission should be processed, and feedback should be provided to the player (as described in "Submitting Answers" in "Questions and Answers Logic").