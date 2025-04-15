'use client';
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient'; // Assuming you have your Supabase client initialized here

interface User {
  type: string;
};

interface Answer {
  text: string;
  isCorrect: boolean;
}

interface Question {
  text: string;
  answers: Answer[];
}

interface GameSessionData {
  sessionName: string;
  currentQuestion: Question | null;
}

const GamePage = () => {
  const { gameId } = useParams();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gameSession, setGameSession] = useState<GameSessionData | null>(null);

  useEffect(() => {
    const fetchGameSession = async () => {
      setLoading(true);
      setError(null);

      if (!gameId || typeof gameId !== 'string') {
        setError('Invalid game ID');
        setLoading(false);
        return;
      }

      try {
        // Fetch game session data
        const { data: sessionData, error: sessionError } = await supabase
          .from('game_sessions')
          .select('*')
          .eq('id', gameId)
          .single();

        if (sessionError) {
          console.error('Error fetching game session:', sessionError);
          setError('Failed to fetch game session');
          setLoading(false);
          return;
        }

        if (!sessionData) {
          setError('Game session not found');
          setLoading(false);
          return;
        }

        setGameSession(sessionData);

        // Determine admin status from localStorage
        const storedSession = localStorage.getItem('userSession');
        if (storedSession) {
          const userSession = JSON.parse(storedSession);
          if (userSession.type === 'admin') {
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
          }
        } else {
          setIsAdmin(false);
        }

      } catch (err) {
        console.error('Unexpected error:', err);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchGameSession();
  }, [gameId]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!gameSession) {
    return <div>Game session not found.</div>;
  }

  return (
    <div className="game-page-container bg-gray-900 text-white min-h-screen flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold mb-8">Game Session: {gameSession.sessionName}</h1>

      {/* Question Area */}
      <div className="question-area bg-gray-800 p-6 rounded-lg shadow-md mb-8 w-full max-w-2xl text-center">
        <h2 className="text-xl font-semibold mb-4">Question</h2>
        {gameSession.currentQuestion && (
          <p className="text-lg">{gameSession.currentQuestion.text}</p>
        )}
      </div>

      {/* Answer Choices Area */}
      <div className="answer-choices-area grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
        {gameSession.currentQuestion &&
          gameSession.currentQuestion.answers.map((answer:Answer, index:number) => (
            <button
              key={index}
              className={`answer-button bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 px-6 rounded-lg transition-colors duration-200 ${
                isAdmin && answer.isCorrect ? 'bg-green-500 hover:bg-green-600' : ''
              }`}
              disabled={isAdmin} // Disable answer buttons for admin
            >
              {answer.text}
                {isAdmin && answer.isCorrect && <span className='text-green-300'> (Correct Answer)</span>}
            </button>
          ))}
      </div>

        {/* Admin/Player View */}
        {isAdmin ? (
            <div className="mt-8 text-center">
                <h2 className="text-2xl font-bold">Admin View</h2>
                {/* Add admin controls here */}
            </div>
        ) : (
            <div className="mt-8 text-center">
                <h2 className="text-2xl font-bold">Player View</h2>
                {/* Add player information and participation details here */}
            </div>
        )}

    </div>

  );
};

export default GamePage;

