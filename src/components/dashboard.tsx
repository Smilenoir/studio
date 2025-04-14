'use client';

import {useState, useEffect} from 'react';

interface GameSession {
  id: string;
  name: string;
  maxPlayers: number;
  questionGroupId: string;
  timePerQuestion?: number;
}

export const Dashboard = () => {
  const [activeSessions, setActiveSessions] = useState<GameSession[]>([]);

  useEffect(() => {
    // Fetch active sessions from local storage
    const storedSessions = localStorage.getItem('gameSessions');
    if (storedSessions) {
      setActiveSessions(JSON.parse(storedSessions));
    }
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-2">Active Sessions</h2>
      {activeSessions.length === 0 ? (
        <p>No active sessions at the moment.</p>
      ) : (
        <ul>
          {activeSessions.map(session => (
            <li key={session.id}>
              {session.name} - Max Players: {session.maxPlayers}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

