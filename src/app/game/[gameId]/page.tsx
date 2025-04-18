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
  const [playersInSession, setPlayersInSession] = useState<{ nickname: string; id: string }[]>([]);
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [time, setTime] = useState<number | null>(null);
  const [timeExpired, setTimeExpired] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

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
        const [gameSessionRes, groupRes, questionsRes] = await Promise.all([
          supabase.from('game_sessions').select('*').eq('id', gameId).single(),
          supabase.from('groups').select('name').eq('id', gameSessionRes.data?.questionGroupId).single(),
          supabase.from('questions').select('*').eq('groupId', gameSessionRes.data?.questionGroupId)
        ]);

        // Обработка ошибок
        if (gameSessionRes.error) throw gameSessionRes.error;
        if (questionsRes.error) throw questionsRes.error;

        // Установка состояний
        setGameSession(gameSessionRes.data);
        setQuestions(questionsRes.data);

        // Проверка прав доступа
        if (sessionData?.id) {
          const { data: userData } = await supabase
            .from('users')
            .select('type')
            .eq('id', sessionData.id)
            .single();
          
          setIsAdmin(userData?.type === 'admin');
          if (!userData && !isPlayer(sessionData.id)) {
            router.push('/');
            toast({ title: 'Unauthorized', variant: 'destructive' });
          }
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
  }, [gameId]);

  // Таймер обратного отсчета
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(prev => (prev && prev > 0 ? prev - 1 : (clearInterval(timer), 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Обработчик отправки ответа
  const handleSubmitAnswer = async () => {
    try {
      // Расчет баллов
      let points = calculatePoints(); 

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

  // Рендер основного интерфейса
  return (
    <div className="game-container">
      {/* Левое меню управления */}
      <LeftMenu
        gameSession={gameSession}
        players={playersInSession}
        isAdmin={isAdmin}
        onStart={handleStartGame}
        onNext={handleNextQuestion}
        onFinish={handleFinishGame}
      />

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

        {/* Управление для администратора */}
        {isAdmin && gameSession?.status === 'waiting' && (
          <Card className="admin-panel">
            <CardHeader>
              <CardTitle>Players Management</CardTitle>
            </CardHeader>
            <CardContent>
              {playersInSession.map(player => (
                <div key={player.id} className="player-row">
                  <span>{player.nickname}</span>
                  <Button 
                    variant="destructive" 
                    onClick={() => handleKickPlayer(player.id)}>
                    Kick
                  </Button>
                </div>
              ))}
            </CardContent>
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
