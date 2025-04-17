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
import { ArrowLeft, Info, ListOrdered, BarChart, Play, Stop, Pause, Clock, User, Edit, Trash } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { generateId } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users } from "@/components/users";


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
    type: "multiple-choice" | "numerical";
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

interface PlayerAnswer {
  [userId: string]: string;
}

const GamePage = () => {
    const router = useRouter();
    const { gameId } = useParams();
    const [sessionData, setSessionData] = useState<UserSession | null>(null);
    const [title, setTitle] = useState<string>('Game Page');
    const [gameSession, setGameSession] = useState<GameSessionData | null>(null);
    const { toast } = useToast();
    const [playersInSession, setPlayersInSession: React.Dispatch<React.SetStateAction<{ nickname: string; id: string }[]>> = useState([]);
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
    const [playerAnswers, setPlayerAnswers] = useState<PlayerAnswer>({});
    const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
    const [waitingForPlayers, setWaitingForPlayers] = useState(false);
    const [numericalAnswer, setNumericalAnswer] = useState<string>("");
    const [playerRankings, setPlayerRankings] = useState<{ userId: string; rank: number, points: number }[]>([]);
    const isLastQuestion = gameSession && questions && gameSession.question_index !== null && gameSession.question_index >= questions.length - 1;
    const [isAdmin, setIsAdmin] = useState(false);




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
                  // Check if the user is an admin or a player in the game
                if (sessionData && sessionData.id) {
                    const { data: userData, error: userError } = await supabase
                        .from('users')
                        .select('type')
                        .eq('id', sessionData.id)
                        .single();

                    if (userError) {
                        console.error("Error fetching user data:", userError);
                        return;
                    }

                    const isAdminUser = userData && userData.type === 'admin';
                    setIsAdmin(isAdminUser);
                    const isPlayer = Object.keys(JSON.parse((await supabase.from('redis').select('value').eq('key', sessionId).maybeSingle()).data!.value || '{}')).includes(sessionData.id);

                    // Redirect if the user is neither an admin nor a player
                    if (!isAdminUser && !isPlayer) {
                      toast({
                        title: 'Unauthorized',
                        description: 'You are not authorized to access this game session.',
                        variant: 'destructive',
                      });
                      router.push('/');
                      return;
                    }
                    if (isAdminUser){
                         setTitle( 'Admin Game Page');
                    } else {
                       setTitle( 'Player Game Page');
                    }
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




    
        const getNumericalAnswerStatus = (): { status: 'correct' | 'incorrect' | 'waiting'; answer: string | null } => {
        if (!timeExpired) {
            return { status: 'waiting', answer: null };
        }
        if (!question || question.type !== 'numerical') {
            return { status: 'waiting', answer: null };
        }
        const correctAnswer = question.answers[0];

        const userAnswer = numericalAnswer;

        if (userAnswer === correctAnswer) {
            return { status: 'correct', answer: correctAnswer };
        }
        return { status: 'incorrect', answer: correctAnswer };

    };

    const numericalAnswerStatus = getNumericalAnswerStatus();

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

        let currentUserRanking = null;
        if (!sessionData || !question || !sessionId || !gameSession) {
            toast({
                title: "Error",
                description: "Missing data. Cannot submit answer.",
                variant: "destructive"
            });
            
            return;
        }

        let points = 0;

        if (question.type === "multiple-choice") {
          const correctAnswer = question.answers.find(ans => ans === selectedAnswer);
          const allPlayersAnswers = Object.entries(playerAnswers).filter(([_, answer]) => answer).length;

          if (timeExpired || !correctAnswer) {
            points = 0;
          } else {
            const sortedPlayers = Object.entries(playerAnswers)
              .filter(([_, answer]) => question.answers.includes(answer)) // Filter for correct answers
              .sort(([_userIdA, answerA], [_userIdB, answerB]) => {
                  const indexA = question.answers.indexOf(answerA);
                  const indexB = question.answers.indexOf(answerB);
                  //  players sort by order of selecting
                  return indexA - indexB;
              });

            const playerIndex = sortedPlayers.findIndex(([userId, _]) => userId === sessionData.id);

            if (playerIndex !== -1) {
              points = (1 + allPlayersAnswers - (playerIndex + 1)) * 5;
            }
          }
          
        }

        if (question.type === "numerical") {
            const correctAnswer = parseFloat(question.answers[0]);
           
            const playersWithAnswers: { userId: string; answer: number; accuracy: number; timestamp: number }[] = [];

              for (const [userId, userAnswer] of Object.entries(playerAnswers)) {
                const answerNumber = parseFloat(userAnswer);
                if (!isNaN(answerNumber)) {
                  const difference = Math.abs(correctAnswer - answerNumber);
                  const accuracy = (1 - (difference / correctAnswer)) * 100;

                  playersWithAnswers.push({
                    userId,
                    answer: answerNumber,
                    accuracy: accuracy < 0 ? 0 : accuracy,
                    timestamp: Date.now(),
                  });
                }
              }

              const playerAccuracyRanking = playersWithAnswers.map((player) => ({
                userId: player.userId,
                accuracy: player.accuracy,
                timestamp: player.timestamp,
              }));
              playerAccuracyRanking.sort((a, b) => {
                if (b.accuracy !== a.accuracy) {
                  return b.accuracy - a.accuracy;
                }
                return a.timestamp - b.timestamp;
              });
              const currentUserIndex = playerAccuracyRanking.findIndex((player) => player.userId === sessionData.id);

              if (currentUserIndex !== -1) {
                points = (1 + playersWithAnswers.length - (currentUserIndex + 1)) * 5;
                // Update playerRankings
                const newPlayerRankings = playerAccuracyRanking.map((player, index) => ({
                  userId: player.userId,
                  rank: index + 1,
                  points: (1 + playersWithAnswers.length - (index + 1)) * 5,
                }));

                setPlayerRankings(newPlayerRankings);
                currentUserRanking = newPlayerRankings.find((player) => player.userId === sessionData.id);
              } else {
                points = 0;
              }



            // Calculate points based on ranking
            const localPlayerRankings = playerZScores.map((player, index) => ({
                userId: player.userId,
                rank: index + 1,
                points: (index + 1) * 2, // Example: rank 1 gets 2 points, rank 2 gets 4 points, etc.
            }));
            const z = Math.abs(correctAnswer - parseFloat(numericalAnswer));  

            if (playersWithAnswers.length > 0 && z === 0) {
            points = 10;
          } else {
            points = 0;
          }
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
            if(points > 0){
              toast({
                  title: "Answer Accepted!",
                  description: `You earned ${points} points!`,
              });
            }
            if(points === 0 && question.type === "multiple-choice" && !timeExpired){
                  toast({
                    title: "Incorrect Answer",
                    description: "You did not answer correctly.",
                    variant: "destructive",
                  });}
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
            setIsAnswerSubmitted(true);
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
          if (gameSession && questions && playersInSession) {
              const allPlayersAnswered = Object.keys(playerAnswers).length === playersInSession.length;
              const allPlayersAnsweredOrTimeExpired = allPlayersAnswered || timeExpired;
            setWaitingForPlayers(!allPlayersAnsweredOrTimeExpired);
        }
    }, [playerAnswers, playersInSession, timeExpired]);

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

    useEffect(  () => {
        if (gameSession && questions && playersInSession) {
            const userIds = new Set<string>();
            for (const player of playersInSession) {
                userIds.add(player.id!);
            }
            // Fetch nicknames for these user IDs
            fetchUserNicknames(Array.from(userIds));
        }
    }, [overallRanking, questionRanking]);


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
        console.log("handleRemovePlayerFromSession called. userToKick:", userToKick);
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
                    console.log("Raw Redis data:", redisData.value);
                    console.log("Parsed players data:", players);
                    if (players[userToKick]) {
                       delete players[userToKick];

                        const { error: updateError } = await supabase
                            .from('redis')
                            .update({ value: JSON.stringify(players) })
                            .eq('key', sessionId);

                        console.log("Supabase update result:", { updateError });
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

            } else {
              console.log("No data found in Redis for key:", sessionId);
            }
        } catch (error) {
            console.error('Unexpected error fetching Redis data:', error);
        } finally {
          setOpenAlertDialog(false);
          setUserToKick(null);
        }      
  };

    const handleNextQuestion = async () => {
      if (!gameSession || !questions || !sessionId) return;

      const nextQuestionIndex = (gameSession.question_index || 0) + 1;
      if (nextQuestionIndex >= questions.length) {
        }

        // Update the game session in Supabase
        const { error } = await supabase
            .from('game_sessions')
            .update({ question_index: nextQuestionIndex })
            .eq('id', sessionId);

        if (error) {
            console.error('Error updating game session question index:', error);
            toast({ title: "Error", description: "Failed to load next question.", variant: "destructive" });
            return;
        }

        // Update local state
        setGameSession({ ...gameSession, question_index: nextQuestionIndex });
        setQuestion(questions[nextQuestionIndex]);
        setTimeExpired(false);
        setIsAnswerSubmitted(false);
        setNumericalAnswer('');
        setPlayerAnswers({});
    };

    const handleFinishGame = async () => {
        if (!gameSession || !sessionId) return;
    
        try {
            const { error } = await supabase
                .from('game_sessions')
                .update({ status: 'finished' })
                .eq('id', sessionId);
    
            if (error) {
                console.error('Error updating game session status to finished:', error);
                toast({ title: "Error", description: "Failed to finish the game.", variant: "destructive" });
                return;
            }
    
            toast({ title: "Game Finished!", description: "The game has ended.", variant: "success" });
            router.push('/results');
        } catch (error) {
            console.error('Unexpected error finishing the game:', error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Unexpected error finishing the game."
            });
        }
    };

    const handleKickPlayer = useCallback((userId: string) => {
    console.log("handleKickPlayer called with userId:", userId);
    setOpenAlertDialog(true);
    setUserToKick(userId);
  }, [setOpenAlertDialog, setUserToKick]);
  
  const handleAnswerSelect = (answer: string) => {
    if (sessionData?.type !== 'admin' && gameSession?.status === 'active' && question?.type === 'multiple-choice') {
      setSelectedAnswer(answer);
      setPlayerAnswers(prev => ({
        ...prev,
        [sessionData.id!]: answer,
      }));
    }
  };

  const getAnswerButtonClass = (answer: string, isAdmin: boolean) => {
    if (isAdmin) {
      return question?.answers.includes(answer) ? 'bg-green-500 text-white' : '';
    } else {
        if (timeExpired && question && question.answers.includes(answer)) {
        return 'bg-green-500 text-white';
      } else if (timeExpired && selectedAnswer === answer && !question?.answers.includes(answer)) {
        return 'bg-red-500 text-white';
      } else if (!timeExpired && playerAnswers[sessionData!.id!]) return playerAnswers[sessionData!.id!] === answer ? 'bg-orange-500 text-white': '';
      return '';
    }
  };

    return (
        
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
                            
                                {playersInSession.map((player) => (
                                    
                                        
                                            
                                                
                                                    
                                                        {player.nickname?.substring(0, 2)}
                                                    
                                                
                                                
                                                    
                                                
                                            
                                        
                                    
                                    
                                ))}
                            
                        
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
                    
                        
                            
                                Game Session Information
                            
                            
                                {gameSession && (
                                    <>
                                        
                                            <strong>Name:</strong> {gameSession.sessionName}
                                        
                                        
                                            <strong>Players:</strong>{" "}
                                            {playersCount}/{gameSession.maxPlayers}
                                        
                                        
                                            <Clock className="mr-2 h-4 w-4" /> {gameSession.timePerQuestionInSec} s
                                        
                                        
                                            <strong>Group:</strong> {getGroupName(gameSession.questionGroupId)}
                                        
                                        
                                            <strong>Status:</strong> {gameSession.status}
                                        
                                    </>
                                )}
                            
                        
                    
                </Popover>
                
                     Game Results
                 
                
                     Round Results
                 
                 {sessionData?.type === 'admin' && gameSession?.status === 'waiting' && (
                    
                         Start Game
                     
                )}
                      {sessionData?.type === 'admin' && gameSession?.status === 'active' && timeExpired && (
                                    
                                        {isLastQuestion ? (
                                            
                                                Finish Game
                                            
                                        ) : (
                                            
                                                Next Question
                                            
                                        )}
                                    
                                )}
            
            {/* Main Content */}
            
                
                    
                        
                            
                                
                                    <Button
                                        variant="outline"
                                        className="h-10 w-10 p-0 bg-black border-gray-500 text-white rounded-full"
                                        onClick={() => router.push('/')}
                                    >
                                        
                                            
                                        
                                    </Button>
                                
                            
                            
                
                
                         {question && (
                            
                                {question.text}
                           
                         )}
                    
                     
              
              {question.answers.map((answer, index) => (
                
                  
                    {answer}
                  
                
              ))}
            

                     
                        
                            
                                Your answer
                                
                                    Confirm
                                
                            
                        
                    
                    
                       
                            Correct answer: {numericalAnswerStatus.answer}
                               {numericalAnswerStatus.status === 'correct' ? (
                                
                                  You answered correctly!
                                
                             ) : (
                                
                                  You answered incorrectly.
                                
                             )}
                             {/* Display player ranking here */}
                               {(gameSession?.status === 'active' && question.type === 'numerical' && timeExpired) && (
                                        <>
                                          
                                            { Object.values(playerAnswers).length > 0 ? (
                                                
                                                  Your ranking: {
                                                playerAnswers[sessionData.id!] ? (playerRankings?.find(player => player.userId === sessionData.id)?.rank || 'N/A') : 'N/A'
                                                } out of {Object.keys(playerAnswers).length}
                                                
                                            ) : null}
                                        
                                    )}
                          
                         
                     
                    

                    
                    {sessionData?.type === 'admin' && gameSession?.status === 'waiting' && (
                        
                            
                                Players in Lobby:
                            
                           
                            
                                {playersInSession.map((player) => (
                                    
                                        
                                            {player.nickname}
                                            
                                                Kick
                                            
                                        
                                    
                                ))}
                            
                        
                    )}
                    
                        
                    
                
            
        
    );
};

export default GamePage;
