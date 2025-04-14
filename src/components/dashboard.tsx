'use client';

import {useState, useEffect} from 'react';

interface GameSession {
  id: string;
  name: string;
  maxPlayers: number;
  questionGroupId: string;
  timePerQuestion?: number;
  joinedPlayers: number; // Добавлено: количество подключенных игроков
  status: 'active' | 'waiting' | 'finished'; // Добавлено: статус игры
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
              {session.name} - Players: {session.joinedPlayers !== undefined ? session.joinedPlayers : 0}/{session.maxPlayers}, Status: {session.status}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};


