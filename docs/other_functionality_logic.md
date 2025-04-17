# Other Functionality Logic

This document describes miscellaneous functionalities within the application that are not covered in the other documents.

## Game Information

-   The application provides a way to display information about the current game session to the user (likely the administrator).
-   This is typically accessed through a "Game Info" button or a similar UI element.
-   When triggered, the application displays a popover or a similar UI element containing details about the game session.
-   The information displayed typically includes:
    -   `Name`: The name of the game session.
    -   `Players`: The current number of players in the session, potentially along with the maximum allowed number of players.
    -   `Time per Question`: The time limit for each question in seconds.
    -   `Group`: The name or identifier of the question group being used for the session.
    -   `Status`: The current status of the game session (e.g., `waiting`, `active`, `finished`).
-   The data displayed in the game information popover is fetched from the game session data (as described in "Fetching Session Data" in "Game Sessions Logic").

## Navigation

-   The application provides a mechanism for users (likely administrators) to navigate back to a main page or a list of game sessions.
-   This is typically implemented using a button (e.g., labeled with an "ArrowLeft" icon) that, when clicked, navigates the user to a different route within the application (e.g., `/`).
-   The navigation is handled by a routing library or framework used by the application (e.g., Next.js's `useRouter`).