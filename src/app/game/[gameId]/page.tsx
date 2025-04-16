'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
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
import { Users } from "@/components/users";
import { Edit, Trash, Check, X, Plus, User, ListOrdered, BarChart, Play, Info, Stop, Pause, Clock } from "lucide-react";

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
    id: string;
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
    const [groupName, setGroupName] = useState<string | null>(null);
    const [playersCount, setPlayersCount] = useState(0);
    const [openAlertDialog, setOpenAlertDialog] = useState(false);
    const [userToKick, setUserToKick] = useState<string | null>(null);


    const sessionId = gameId as string;


    useEffect(() => {
        const loadSession = async () => {
            const userSession = JSON.parse(localStorage.getItem('userSession') || '{}');
            setSessionData(userSession);
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
                const { data: groupData, error: groupError } = await supabase
                  .from('groups')
                  .select('name')
                  .eq('id', gameSessionData.questionGroupId)
                  .single();

                if (groupError) {
                  console.error("Error fetching group:", groupError);
                  return;
                }

                if (groupData) {
                  setGroupName(groupData.name);
                }


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

                // Fetch usernames for the lobby
                fetchPlayers(sessionId);
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
                const leaderboardArray = Object.entries(parsedData).map(([userId, score]) => ({
                    userId,
                    score: Number(score)
                }));
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
                    setPlayersCount(userIds.length);

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

    useEffect(() => {
      fetchPlayers(sessionId);
    }, [sessionId]);

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

    const title = 'Admin Game Page';

    const fetchPlayersInSession = async (): Promise<{ nickname: string; id: string }[]> => {
        try {
            const { data: redisData, error: redisError } = await supabase
                .from('redis')
                .select('value')
                .eq('key', sessionId)
                .maybeSingle();

            if (redisError) {
                console.error('Error fetching Redis data:', redisError);
                toast({
                    title: "Error",
                    description: "Failed to fetch session players.",
                    variant: "destructive"
                });
                return [];
            }

            if (redisData && redisData.value) {
                try {
                    const players = JSON.parse(redisData.value);
                    const userIds = Object.keys(players);
                    const { data: usersData, error: usersError } = await supabase
                        .from('users')
                        .select('nickname, id')
                        .in('id', userIds);

                    if (usersError) {
                        console.error('Error fetching usernames:', usersError);
                        toast({
                            title: "Error",
                            description: "Failed to fetch usernames.",
                            variant: "destructive"
                        });
                        return [];
                    }

                    return usersData || [];
                } catch (parseError) {
                    console.error('Error parsing Redis data:', parseError);
                    toast({
                        title: "Error",
                        description: "Failed to parse session players data.",
                        variant: "destructive"
                    });
                    return [];
                }
            } else {
                return [];
            }
        } catch (error) {
            console.error('Unexpected error fetching Redis data:', error);
            return [];
        }
    };

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

    const getGroupName = (groupId: string) => {
      // Ensure gameSession and groupData are not null before accessing their properties
      if (!gameSession || !questions) {
        return 'Loading...'; // Or any other placeholder text
      }
      return groupName || 'Unknown Group';
    };

    const kickPlayer = async (userId: string) => {
      setOpenAlertDialog(true);
      setUserToKick(userId);
    };

    const handleRemovePlayerFromSession = async () => {
      if (!userToKick) return;
        try {
            const { data: redisData, error: redisError } = await supabase
                .from('redis')
                .select('value')
                .eq('key', sessionId)
                .maybeSingle();

            if (redisError) {
                console.error('Error fetching Redis data:', redisError);
                toast({
                    title: "Error",
                    description: "Failed to fetch session players.",
                    variant: "destructive"
                });
                return;
            }

            if (redisData && redisData.value) {
                try {
                    const players = JSON.parse(redisData.value);
                    if (players[userToKick]) {
                        delete players[userToKick];

                        const { error: updateError } = await supabase
                            .from('redis')
                            .update({ value: JSON.stringify(players) })
                            .eq('key', sessionId);

                        if (updateError) {
                            console.error('Error updating Redis data:', updateError);
                            toast({
                                title: "Error",
                                description: "Failed to remove player from session.",
                                variant: "destructive"
                            });
                            return;
                        }

                        // Fetch usernames for the lobby
                        fetchPlayers(sessionId);
                        setPlayersInSession(prevPlayers => prevPlayers.filter(player => player.id !== userToKick));

                    }
                } catch (parseError) {
                    console.error('Error parsing Redis data:', parseError);
                    toast({
                        title: "Error",
                        description: "Failed to parse session players data.",
                        variant: "destructive"
                    });
                    return;
                }
            }
        } catch (error) {
            console.error('Unexpected error fetching Redis data:', error);
        } finally {
          setOpenAlertDialog(false);
          setUserToKick(null);
        }
  };

  const handleKickPlayer = useCallback(async (userId: string) => {
    setOpenAlertDialog(true);
    setUserToKick(userId);
  }, [setOpenAlertDialog, setUserToKick]);


    return (
        <div className="game-page-container bg-gray-900 text-white min-h-screen flex">
            {/* Left Menu */}

            <div className="w-64 p-4 flex flex-col">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" className="justify-start mb-2">
                            <User className="mr-2 h-4 w-4" /> List Players
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80">
                        <Card>
                            <CardHeader>
                                <CardTitle>Players in Session</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {playersInSession.map((player) => (
                                    <div key={player.id} className="flex items-center space-x-4 py-2">
                                        <Avatar>
                                            <AvatarImage src="https://github.com/shadcn.png" />
                                            <AvatarFallback>{player.nickname?.substring(0, 2)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="text-sm font-medium leading-none">{player.nickname}</p>
                                        </div>
                                        <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                            <Button size="icon" variant="destructive">
                                              <Trash className="h-4 w-4"/>
                                            </Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent>
                                            <AlertDialogHeader>
                                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                              <AlertDialogDescription>
                                                This action will remove this player from the session.
                                              </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                              <AlertDialogCancel onClick={() => {
                                                setOpenAlertDialog(false);
                                                setUserToKick(null);
                                              }}>Cancel</AlertDialogCancel>
                                              <AlertDialogAction onClick={handleRemovePlayerFromSession}>Continue</AlertDialogAction>
                                            </AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </PopoverContent>
                </Popover>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" className="justify-start mb-2">
                            {gameSession?.status === 'waiting' ? (
                                <Info className="mr-2 h-4 w-4 text-blue-500" />
                            ) : gameSession?.status === 'active' ? (
                                <Play className="mr-2 h-4 w-4 text-green-500" />
                            ) : (
                                <Pause className="mr-2 h-4 w-4 text-orange-500" />
                            )}
                            Game Info
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80">
                        <Card>
                            <CardHeader>
                                <CardTitle>Game Session Information</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {gameSession && (
                                    <>
                                        <p><strong>Name:</strong> {gameSession.sessionName}</p>
                                        <p>
                                            <strong>Players:</strong>{" "}
                                            {playersCount}/{gameSession.maxPlayers}
                                        </p>
                                        <p><Clock className="mr-2 h-4 w-4" /> {gameSession.timePerQuestionInSec} s</p>
                                        <p><strong>Group:</strong> {getGroupName(gameSession.questionGroupId)}</p>
                                        <p><strong>Status:</strong> {gameSession.status}</p>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </PopoverContent>
                </Popover>
                <Button variant="ghost" className="justify-start mb-2">
                    <BarChart className="mr-2 h-4 w-4" /> Game Results
                </Button>
                <Button variant="ghost" className="justify-start mb-2">
                    <ListOrdered className="mr-2 h-4 w-4" /> Round Results
                </Button>
                <Button variant="ghost" className="justify-start mb-2" onClick={handleStartGame}>
                    <Play className="mr-2 h-4 w-4" /> Start Game
                </Button>
            </div>
            {/* Main Content */}
            <div className="flex-1 p-4">
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

                <div className="mt-8 text-center">
                    <h2 className="text-2xl font-bold">Admin View</h2>
                    {gameSession && (
                        <div className="mb-4">

                        </div>
                    )}
                </div>

            </div>
              <AlertDialog open={openAlertDialog} onOpenChange={setOpenAlertDialog}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmation</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to remove this player from the session?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => {
                      setOpenAlertDialog(false);
                      setUserToKick(null);
                    }}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRemovePlayerFromSession}>Confirm</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
        </div>
    );
};

export default GamePage;
