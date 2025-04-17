

# Leaderboard and Ranking Logic

This document explains the logic behind the leaderboard and ranking systems in the application.

## Fetching Leaderboard

-   The application fetches and displays a leaderboard that shows the scores of players in the current game session. The data is retrieved from Redis.
-   **Redis Data Structure:** The leaderboard data is stored in Redis as a JSON string. When parsed, it is expected to be a JSON object where:
    -   **Keys:** Are user IDs (strings).
    -   **Values:** Are the corresponding player scores (numbers).
-   **Example Redis Data:**
    
- **Redis Operation:** The following Supabase query is used to retrieve the leaderboard data from redis.
  
-   The leaderboard entries are then sorted by score (typically in descending order) to display players with higher scores at the top.
-   The sorted leaderboard data is then used to render the leaderboard in the user interface.

## Fetching Ranking

-   In addition to the overall leaderboard, the application also fetches and displays a ranking of players, potentially for the current question or round. The exact scope of this ranking needs clarification.
-   Similar to the leaderboard, the ranking data is also retrieved from Redis.
-   The data format and parsing steps are likely the same as for the leaderboard, involving mapping user IDs to scores, parsing the data, and transforming it into a display-friendly format.
-   The ranking data might be sorted differently or filtered to represent a subset of players (e.g., only players who answered the current question).
-   The ranking information is then displayed in the UI, possibly alongside the leaderboard or in a separate section.

## Updating Leaderboard/Ranking

-   The leaderboard and ranking data are updated whenever player scores change. This happens when:
    -   Players submit correct answers to questions.
    -   The logic for updating scores is triggered (as described in "Questions and Answers Logic").
-   The update process involves:
    1.  Fetching the current score data from Redis.
    2.  Modifying the data to reflect the score changes for the relevant player(s).
    3.  Storing the updated data back in Redis.
-   After the data is updated in Redis, the application typically re-fetches the leaderboard and/or ranking data to reflect the changes in the user interface. This ensures that the displayed information is always up-to-date.