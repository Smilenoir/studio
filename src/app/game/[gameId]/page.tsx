'use client';

// Основные импорты
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
// Компоненты UI
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
// Иконки и утилиты
import { ArrowLeft, Info, Play, Pause, Clock, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import LeftMenu from '@/components/LeftMenu';

// Типы данных
interface UserSession {
  nickname: string | null;
  id: string | null;
  type: string | null;
}

interface Question {
  text: string;
  answers: string[];
  type: "multiple-choice" | "numerical";
}

interface GameSessionData {
  id: string;
  sessionName: string;
  maxPlayers: number;
  questionGroupId: string;
  timePerQuestionInSec: number;
  status: 'waiting' | 'active' | 'finished';
  question_index: number | null;
}

const GamePage = () => {
  const router = useRouter();
  const { gameId } = useParams();
  const { toast } = useToast();
  
  // Состояния приложения
  const [sessionData, setSessionData] = useState<UserSession | null>(null);
  const [gameSession, setGameSession] = useState<GameSessionData | null>(null);
  const [playersInSession, setPlayersInSession<{ nickname: string; id: string }[]>([]);
  const [questions, setQuestions<Question[] | null>(null);
  const [question, setQuestion<Question | null>(null);
  const [time, setTime<number | null>(null);
  const [timeExpired, setTimeExpired] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [overallRanking, setOverallRanking] = useState<{ playerId: string; score: number; nickname: string }[]>([]);
  const [questionRanking, setQuestionRanking] = useState<{ playerId: string; score: number; nickname: string }[]>([]);


    // AlertDialog state
    const [openAlertDialog, setOpenAlertDialog] = useState(false);
    const [alertTitle, setAlertTitle] = useState<string>("");
    const [alertDescription, setAlertDescription] = useState<string>("");
    const [userIdToKick, setUserToKick] = useState<string | null>(null);

  // Обработчик ошибок Supabase
  const handleSupabaseError = (error: any) => {
    toast({ title: "Error", description: error.message || "An unexpected error occurred." });
  };

  // Загрузка сессии пользователя
  useEffect(() => {
    const userSession = JSON.parse(localStorage.getItem('userSession') || '{}');
    setSessionData(userSession);
  }, []);

  // Основная загрузка данных игры
  useEffect(() => {
    const fetchGameData = async () => {
      try {
        // Параллельная загрузка данных
        const gameSessionRes = await supabase
            .from('game_sessions')
            .select('*')
            .eq('id', gameId)
            .single();
        
        if (gameSessionRes.error) throw gameSessionRes.error;

        setGameSession(gameSessionRes.data);
        
        if (sessionData?.id) {
          const { data: userData } = await supabase
            .from('users')
            .select('type')
            .eq('id', sessionData.id)
            .single();
          setIsAdmin(userData?.type === 'admin');
        }

        // Загрузка вопросов
        if (gameSessionRes.data?.questionGroupId) {
            const questionsRes = await supabase
                .from('questions')
                .select('*')
                .eq('groupId', gameSessionRes.data.questionGroupId);
            if (questionsRes.error) throw questionsRes.error;
            setQuestions(questionsRes.data);
        }

        // Настройка таймера
        if (gameSessionRes.data?.timePerQuestionInSec) {
          setTime(gameSessionRes.data.timePerQuestionInSec);
        }

      } catch (error) {
        handleSupabaseError(error);
      }
    };
    fetchGameData();
  }, [gameId, sessionData?.id]);

  // Таймер обратного отсчета
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (time !== null && time > 0) {
            timer = setInterval(() => {
                setTime(prev => {
                    if (prev && prev > 0) {
                        return prev - 1;
                    } else {
                        clearInterval(timer);
                        return 0;
                    }
                });
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [time]);

  // Обработчик отправки ответа
  const handleSubmitAnswer = async () => {
    try {
      // Расчет баллов
      let points = 0;

      // Обновление данных в Redis
      const { data: redisData } = await supabase
        .from('redis')
        .select('value')
        .eq('key', gameId)
        .single();

      const playerData = JSON.parse(redisData?.value || '{}');
      playerData[sessionData!.id!] = (playerData[sessionData!.id!] || 0) + points;
      
      await supabase
        .from('redis')
        .update({ value: JSON.stringify(playerData) })
        .eq('key', gameId);

      // Уведомление пользователя
      toast({
        title: points > 0 ? "Answer Accepted!" : "Incorrect Answer",
        description: points > 0 ? `You earned ${points} points!` : "You did not answer correctly.",
        variant: points > 0 ? "default" : "destructive"
      });

    } catch (error) {
      handleSupabaseError(error);
    } finally {
      setTimeExpired(true);
    }
  };

  const handleAnswerSelect = (answer: string) => {
        setSelectedAnswer(answer);
    };

    const getAnswerStyle = (answer: string) => {
        if (timeExpired) {
            return answer === question?.correctAnswer ? 'bg-green-500' : 'bg-red-500';
        }
        return selectedAnswer === answer ? 'bg-blue-700' : 'bg-blue-500 hover:bg-blue-700';
    };

  // Function to handle starting the game
  const handleStartGame = async () => {
    try {
      const { error } = await supabase
        .from('game_sessions')
        .update({ status: 'active' })
        .eq('id', gameId);

      if (error) {
        console.error('Error starting game:', error);
        handleSupabaseError(error);
        return;
      }
       toast({
                title: "Success",
                description: "Game started!"
            });
    } catch (error) {
        handleSupabaseError(error);
    }
  };

  const handleNextQuestion = async () => {
        try {
          // Update the game session to the next question
          if (gameSession && questions && gameSession.question_index !== null && gameSession.question_index < questions.length - 1) {
            const nextQuestionIndex = gameSession.question_index + 1;
            const { error } = await supabase
              .from('game_sessions')
              .update({ question_index: nextQuestionIndex })
              .eq('id', gameId);

            if (error) {
              console.error('Error updating question index:', error);
              handleSupabaseError(error);
              return;
            }
               toast({
                    title: "Success",
                    description: "Next question!"
                });
          }
        } catch (error) {
            handleSupabaseError(error);
        }
    };

     const handleNextAdminQuestion = async () => {
        if (questions && gameSession && sessionData && sessionData.id) {
            const currentQuestionIndex = gameSession.question_index || 0;
            if (currentQuestionIndex < questions.length - 1) {
                const nextQuestionIndex = currentQuestionIndex + 1;
                //console.log(`Moving to question index: ${nextQuestionIndex}`);

                const { data, error } = await supabase
                    .from('game_sessions')
                    .update({ question_index: nextQuestionIndex })
                    .eq('id', gameId)
                    .select();

                if (error) {
                    console.error('Error updating question index:', error);
                    return;
                }

                const nextQuestion = questions[nextQuestionIndex];
                setQuestion(nextQuestion);
            } else {
                toast({
                    title: "All questions answered!",
                    description: "Redirect to results page!"
                });
                router.push('/results');
            }
        }
    };

    const handleFinishGame = async () => {
        try {
          const { error } = await supabase
            .from('game_sessions')
            .update({ status: 'finished' })
            .eq('id', gameId);
    
          if (error) {
            console.error('Error finishing game:', error);
            handleSupabaseError(error);
            return;
          }
          toast({
                title: "Success",
                description: "Game finished!"
            });
          router.push('/results');
        } catch (error) {
            handleSupabaseError(error);
        }
    };

      const handleRemovePlayer = async () => {
        if (!userIdToKick || !gameId) {
            console.error("User ID or Game ID is missing.");
            toast({
                title: "Error",
                description: "Cannot remove player: Missing information.",
                variant: "destructive",
            });
            return;
        }

        setOpenAlertDialog(false);

        try {
            // 1. Fetch current game data from Redis
            const { data: redisData, error: fetchError } = await supabase
                .from('redis')
                .select('value')
                .eq('key', gameId)
                .single();

            if (fetchError) {
                console.error('Error fetching game data from Redis:', fetchError);
                toast({
                    title: "Error",
                    description: "Failed to remove player (fetch game data).",
                    variant: "destructive",
                });
                return;
            }

            // 2. Parse JSON
            let gameData;
            try {
                gameData = JSON.parse(redisData.value);
            } catch (parseError) {
                console.error('Error parsing game data from Redis:', parseError);
                toast({
                    title: "Error",
                    description: "Failed to remove player (parse game data).",
                    variant: "destructive",
                });
                return;
            }

            // 3. Remove the player (assuming gameData is an object with player IDs as keys)
            delete gameData[userIdToKick];

            // 4. Stringify updated game data
            const updatedGameData = JSON.stringify(gameData);

            // 5. Update Redis with new data
            const { error: updateError } = await supabase
                .from('redis')
                .update({ value: updatedGameData })
                .eq('key', gameId);

            if (updateError) {
                console.error('Error updating game data in Redis:', updateError);
                toast({
                    title: "Error",
                    description: "Failed to remove player (update game data).",
                    variant: "destructive",
                });
                return;
            }

            // setPlayersInSession(prev => prev.filter(player => player.id !== userIdToKick));
           // fetchUserNicknames(userIdToKick);

            toast({
                title: "Success",
                description: "Player removed successfully!",
            });
            setUserToKick(null);
        } catch (error: any) {
            console.error('Unexpected error removing player:', error);
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        }
    };

  const handleKickPlayer = (userId: string) => {
        setAlertTitle("Remove Player");
        setAlertDescription("Are you sure you want to remove this player from the session?");
        setUserToKick(userId);
        setOpenAlertDialog(true);
    };

    const calculatePoints = (): number => {
        if (!time) {
            return 0;
        }

        return time;
    }
    

  return (
    <div className="game-container">
      {/* Левое меню управления */}
      
      
        {gameSession && (
          <LeftMenu
            data = {{
              gameSession: gameSession,
              playersInSession: playersInSession,
              sessionData: sessionData,
              playersCount: playersInSession.length,
              getGroupName: () => "TODO",
              isAdmin: isAdmin,
              isLastQuestion: false,
              timeExpired: false,
              handleStartGame: handleStartGame,
              handleNextQuestion: handleNextQuestion,
              handleFinishGame: handleFinishGame
            }}
          />
        )}
        
      

      {/* Основная область контента */}
      <div className="main-content">
        {/* Заголовок и кнопка возврата */}
        <div className="header-section">
          <Button variant="outline" onClick={() => router.push('/')}>
            <ArrowLeft className="icon" />
          </Button>
          <h1>{gameSession?.sessionName}</h1>
        </div>

        {/* Блок с вопросом */}
        {question && (
          <Card className="question-card">
            <CardHeader>
              <CardTitle>{question.text}</CardTitle>
            </CardHeader>
            
            {/* Варианты ответов */}
            <div className="answers-grid">
              {question.answers.map((answer) => (
                <Button 
                  key={answer}
                  onClick={() => handleAnswerSelect(answer)}
                  className={getAnswerStyle(answer)}>
                  {answer}
                </Button>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Диалоговые окна */}
      <AlertDialog open={openAlertDialog} onOpenChange={setOpenAlertDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Action</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemovePlayer}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default GamePage;
