'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient'; // Assuming you have your Supabase client initialized here
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { generateId } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface UserSession {
    nickname: string | null;
    id: string | null;
    type: string | null;
}

interface User {
    nickname: string | null;
    id: string | null;
    type: string | null;
}

interface Question {
    text: string;
    answers: string[];
}

interface Answer {
    text: string;
    isCorrect: boolean;
}

interface GameSessionData {
    sessionName: string;
    maxPlayers: number;
    questionGroupId: string;
    timePerQuestionInSec: number;
    createdAt: string;
    status: 'waiting' | 'active' | 'finished';
    players: string[];
    question_index: number | null;
}

const GamePage = () => {
    const router = useRouter();
    const { gameId } = useParams();
    const [sessionData, setSessionData] = useState<UserSession | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [gameSession, setGameSession] = useState<GameSessionData | null>(null);
    const { toast } = useToast();
    const [playersInSession, setPlayersInSession] = useState<{ nickname: string; id: string }[]>([]);
    const [questions, setQuestions] = useState<Question[] | null>(null);
    const [question, setQuestion] = useState<Question | null>(null);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [time, setTime] = useState<number | null>(null);
    const [isTimed, setIsTimed] = useState<boolean>(false);
    const [timeExpired, setTimeExpired] = useState<boolean>(false);
    const [questionRanking, setQuestionRanking] = useState<{ userId: string; score: number }[]>([]);
    const [overallRanking, setOverallRanking] = useState<{ userId: string; score: number }[]>([]);

    const sessionId = gameId as string;


    useEffect(() => {
        const loadSession = async () => {
            // Replace this with your actual session loading logic
            // For example, fetching from localStorage or a context
            const userSession = JSON.parse(localStorage.getItem('userSession') || '{}');
            setSessionData(userSession);

            if (userSession && userSession.id) {
                // Fetch user data from Supabase to get the 'type'
                const { data, error } = await supabase
                    .from('users')
                    .select('type')
                    .eq('id', userSession.id)
                    .single();

                if (error) {
                    console.error('Error fetching user data:', error);
                    // Handle error appropriately, e.g., redirect or show an error message
                }

                if (data && data.type === 'admin') {
                    setIsAdmin(true);
                } else {
                    setIsAdmin(false);
                }
            }
        };

        loadSession();
    }, []);

    useEffect(() => {
        const fetchGameSessionAndQuestions = async () => {
            if (!sessionId) {
                console.error("Session ID is missing.");
                return;
            }

            try {
                const { data: gameSessionData, error: gameSessionError } = await supabase
                    .from('game_sessions')
                    .select('*')
                    .eq('id', sessionId)
                    .single();

                if (gameSessionError) {
                    console.error("Error fetching game session:", gameSessionError);
                    return;
                }

                if (!gameSessionData) {
                    console.log('Game session not found');
                    return;
                }

                setGameSession(gameSessionData);

                const { data: questionGroupData, error: questionGroupError } = await supabase
                    .from('questions')
                    .select('*')
                    .eq('groupId', gameSessionData.questionGroupId);

                if (questionGroupError) {
                    console.error("Error fetching questions:", questionGroupError);
                    return;
                }

                if (!questionGroupData || questionGroupData.length === 0) {
                    console.log('No questions found for this game session.');
                    return;
                }

                setQuestions(questionGroupData);
                if (gameSessionData.question_index !== null && questionGroupData[gameSessionData.question_index]) {
                  setQuestion(questionGroupData[gameSessionData.question_index]);
                } else {
                  setQuestion(questionGroupData[0]);
                }



                if (gameSessionData.timePerQuestionInSec > 0) {
                    setIsTimed(true);
                    setTime(gameSessionData.timePerQuestionInSec);
                } else {
                    setIsTimed(false);
                    setTime(null);
                }
                await fetchPlayers(sessionId);

                await fetchLeaderboard(sessionId);
                await fetchRanking(sessionId);

            } catch (error) {
                console.error("Unexpected error:", error);
                return;
            }
        };

        fetchGameSessionAndQuestions();
    }, [sessionId]);

    useEffect(() => {
        const checkSessionStatus = async () => {
            const { data, error } = await supabase
                .from('game_sessions')
                .select('status')
                .eq('id', sessionId)
                .single();

            if (error) {
                console.error("Error fetching session status:", error);
                return;
            }

            if (data && data.status === 'finished') {
                // Redirect to results page
                router.push('/results');
            }
        };
        checkSessionStatus();
    }, [router, sessionId]);

    // Admin next question
    const handleNextAdminQuestion = async () => {
      if (!gameSession) return;

      const nextQuestionIndex = (gameSession.question_index === null ? 0 : gameSession.question_index + 1);

      if (!questions || nextQuestionIndex >= questions.length) {
        console.log('No more questions.');
        return;
      }
      // Update question index
      const { error } = await supabase
        .from('game_sessions')
        .update({ question_index: nextQuestionIndex })
        .eq('id', sessionId);
      // Update session data locally
      setGameSession({ ...gameSession, question_index: nextQuestionIndex });

      if (error) {
        console.error('Error updating question:', error);
          toast({
              title: "Error",
              description: "Failed to update question.",
              variant: "destructive",
          });
        return;
      }
      // set next question
      setQuestion(questions[nextQuestionIndex]);
      // Reset selected Answer
      setSelectedAnswer(null);

    };

    const fetchLeaderboard = async (sessionId: string) => {
        const redisKey = sessionId;
        const { data: redisData, error: redisError } = await supabase
            .from('redis')
            .select('value')
            .eq('key', redisKey)
            .maybeSingle();

        if (redisError) {
            console.error('Error fetching Redis data:', redisError);
            toast({
                title: "Error",
                description: "Failed to fetch leaderboard.",
                variant: "destructive"
            });
            return;
        }

        if (redisData && redisData.value) {
            try {
                const parsedData = JSON.parse(redisData.value);
                // Convert the object into an array of { userId, score }
                const leaderboardArray = Object.entries(parsedData).map(([userId, score]) => ({
                    userId,
                    score: Number(score) // Ensure score is a number
                }));
                // Sort the leaderboard array by score in descending order
                leaderboardArray.sort((a, b) => b.score - a.score);
                setOverallRanking(leaderboardArray);
            } catch (parseError) {
                console.error('Error parsing Redis data:', parseError);
                toast({
                    title: "Error",
                    description: "Failed to parse leaderboard data.",
                    variant: "destructive"
                });
                return;
            }
        }
    };

    const fetchRanking = async (sessionId: string) => {
      const redisKey = sessionId;
        const { data: redisData, error: redisError } = await supabase
          .from('redis')
          .select('value')
          .eq('key', redisKey)
          .maybeSingle();

        if (redisError) {
          console.error('Error fetching Redis data:', redisError);
          toast({
            title: "Error",
            description: "Failed to fetch leaderboard.",
            variant: "destructive"
          });
          return;
        }

        if (redisData && redisData.value) {
          try {
            const parsedData = JSON.parse(redisData.value);
            // Convert the object into an array of { userId, score }
            const leaderboardArray = Object.entries(parsedData).map(([userId, score]) => ({
              userId,
              score: Number(score) // Ensure score is a number
            }));
            // Sort the leaderboard array by score in descending order
            leaderboardArray.sort((a, b) => b.score - a.score);
            setQuestionRanking(leaderboardArray);
          } catch (parseError) {
            console.error('Error parsing Redis data:', parseError);
            toast({
              title: "Error",
              description: "Failed to parse leaderboard data.",
              variant: "destructive"
            });
            return;
          }
        }
    };

    useEffect(() => {
      const intervalId = setInterval(() => {
        if (time !== null) {
          if (time > 0) {
            setTime(time - 1);
          } else {
            setTimeExpired(true);
            toast({
              title: "Time's up!",
              description: "Time has expired for this question.",
            });
            clearInterval(intervalId); // Clear interval when time expires
          }
        }
      }, 1000);
      // Clean up the interval when the component unmounts
      return () => clearInterval(intervalId);
    }, [time, toast]);

    

    const handleSubmitAnswer = async () => {
      if (!sessionData || !question || !sessionId || !gameSession) {
        toast({
          title: "Error",
          description: "Missing data. Cannot submit answer.",
          variant: "destructive"
        });
        return;
      }

      const isCorrect = question.answers.includes(selectedAnswer as string);
      let points = 0;

      if (isTimed && time !== null && time > 0) {
        if (isCorrect) {
          points = time; // Award points based on remaining time
        }
      }

      if (!isCorrect) {
          toast({
              title: "Incorrect Answer",
              description: "You did not answer correctly.",
              variant: "destructive"
          });
          return;
      }

      const redisKey = sessionId;
      try {
        // Fetch current data from Redis
        const { data: redisData, error: redisError } = await supabase
          .from('redis')
          .select('value')
          .eq('key', redisKey)
          .maybeSingle();

        if (redisError) {
          console.error('Error fetching Redis data:', redisError);
          toast({
            title: "Error",
            description: "Failed to submit answer (fetch Redis data).",
            variant: "destructive"
          });
          return;
        }

        if (!redisData || !redisData.value) {
          toast({
            title: "Error",
            description: "No data found in Redis.",
            variant: "destructive"
          });
          return;
        }

        // Parse JSON data
        let playerData;
        try {
          playerData = JSON.parse(redisData.value);
        } catch (parseError) {
          console.error('Error parsing Redis data:', parseError);
          toast({
            title: "Error",
            description: "Failed to parse Redis data.",
            variant: "destructive"
          });
          return;
        }

        // Update player's score
        playerData[sessionData.id] = (playerData[sessionData.id] || 0) + points;

        // Stringify updated game data
        const updatedGameData = JSON.stringify(playerData);

        // Update Redis with new data
        const { error: updateError } = await supabase
          .from('redis')
          .update({ value: updatedGameData })
          .eq('key', redisKey);

        if (updateError) {
          console.error('Error updating game data in Redis:', updateError);
          toast({
            title: "Error",
            description: "Failed to submit answer (update Redis data).",
            variant: "destructive"
          });
          return;
        }

        toast({
          title: "Correct Answer!",
          description: `You earned ${points} points!`,
        });
        fetchLeaderboard(sessionId);
        fetchRanking(sessionId);

      } catch (error: any) {
        console.error('Unexpected error submitting answer:', error);
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive"
        });
      } finally {
        setTimeExpired(true);
      }
    };

    const fetchUserNicknames = async (userIds: string[]) => {
      if (!userIds || userIds.length === 0) {
        setPlayersInSession([]);
        return;
      }
      try {
        // Fetch user data from Supabase to get the 'type'
        const { data, error } = await supabase
          .from('users')
          .select('nickname, id')
          .in('id', userIds);

        if (error) {
          console.error('Error fetching user data:', error);
          return;
        }
        setPlayersInSession(data || []);

      } catch (error) {
        console.error("Unexpected error:", error);
        return;
      }
    }

    const fetchPlayers = async (gameId: string) => {
      try {
        const { data: redisData, error: redisError } = await supabase
          .from('redis')
          .select('value')
          .eq('key', gameId)
          .maybeSingle();

        if (redisError) {
          console.error('Error fetching Redis data:', redisError);
          toast({
            title: "Error",
            description: "Failed to fetch session players."
          });
          return;
        }

        if (redisData && redisData.value) {
          try {
            const players = JSON.parse(redisData.value);
            const userIds = Object.keys(players);
            fetchUserNicknames(userIds);

          } catch (parseError) {
            console.error('Error parsing Redis data:', parseError);
            toast({
              title: "Error",
              description: "Failed to parse session players data."
            });
            return;
          }
        } else {
          setPlayersInSession([]);
        }
      } catch (error) {
        console.error('Unexpected error fetching Redis data:', error);
      }
    };

    const isAdminObserver = async (): Promise<boolean> => {
        if (!sessionId) {
            console.error('Session ID is missing.');
            return false;
        }
        if (!sessionData || !sessionData.id) {
            console.error('Session data or user ID is missing.');
            return false;
        }
        try {
            // Fetch game session data
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('type')
                .eq('id', sessionData.id)
                .single();
            if (userError) {
                console.error('Error fetching game session:', userError);
                return false;
            }
            return userData?.type === 'admin';
        } catch (error) {
            console.error('Unexpected error:', error);
            return false;
        }
    };

    useEffect(() => {
        const checkIfAdminObserver = async () => {
            const isAdminValue = await isAdminObserver();
            setIsAdmin(isAdminValue);
        };
        checkIfAdminObserver();
    }, [sessionData, sessionId]);

    const handleStartGame = async () => {
      try {
          const { error } = await supabase
              .from('game_sessions')
              .update({ status: 'active' })
              .eq('id', sessionId);

          if (error) {
              console.error('Error starting game session:', error);
              toast({
                  variant: "destructive",
                  title: "Error",
                  description: "Failed to start game session."
              });
              return;
          }

          toast({
              title: "Success",
              description: "Game session started successfully."
          });
      } catch (error) {
          console.error('Unexpected error starting game session:', JSON.stringify(error));
          toast({
              variant: "destructive",
              title: "Error",
              description: "Unexpected error starting game session."
          });
      }
    };

    useEffect(() => {
        if (questions && questions.length > 0) {
            // Now it's safe to set the initial question
            setQuestion(questions[0]);
        }
    }, [questions]);

    useEffect(() => {
        // if (isTimed && time !== null) {
        //   if (time > 0) {
        //     setTimeout(() => setTime(time - 1), 1000);
        //   } else {
        //     setTimeExpired(true);
        //     alert("Time's up!");
        //   }
        // }
    }, [isTimed, time]);

    useEffect(() => {
        if (gameSession && questions) {
            const userIds = new Set<string>();
            for (const player of playersInSession) {
                userIds.add(player.id!);
            }
            // Fetch nicknames for these user IDs
            fetchUserNicknames(Array.from(userIds));
        }
    }, [overallRanking, questionRanking]);

    

    const title = isAdmin ? 'Admin Game Page' : 'Player Game Page';

    return (
        <div className="game-page-container bg-gray-900 text-white min-h-screen flex flex-col items-center p-4">
            <div className="absolute bottom-4 left-4">
                <Button
                    variant="outline"
                    className="h-10 w-10 p-0 bg-black border-gray-500 text-white rounded-full"
                    onClick={() => router.push('/')}
                >
                    <ArrowLeft
                        className="h-6 w-6"
                        aria-hidden="true"
                    />
                </Button>
            </div>
            <h1 className="text-3xl font-bold mb-4 mt-4">{title}</h1>

            {isAdmin ? (
                <div className="mt-8 text-center">
                  <h2 className="text-2xl font-bold">Admin View</h2>
                  {gameSession && (
                    <div className="mb-4">
                      <strong>Session Status:</strong> {gameSession.status}
                    </div>
                  )}
                    {/* Display list of players in the session */}
                    <div>
                        <h2 className="text-xl font-semibold mb-4">Players in Session</h2>
                        {playersInSession.length === 0 ? (
                            <p>No players in this session.</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {playersInSession.map((player) => (
                                    <div key={player.id} className="bg-gray-800 p-4 rounded-lg shadow-md">
                                        <h3 className="text-lg font-semibold">{player.nickname}</h3>
                                        {/* Display additional user details if needed */}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                  {gameSession?.status === 'waiting' ? (
                      <Button onClick={handleStartGame}>Start Game</Button>
                  ) : (
                      <Button onClick={handleNextAdminQuestion}>Next Question</Button>
                  )}
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
