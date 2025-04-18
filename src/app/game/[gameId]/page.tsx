'use client';

import {useState, useEffect, useCallback} from 'react';
import {useRouter, useParams} from 'next/navigation';
import {Avatar, AvatarFallback, AvatarImage} from '@/components/ui/avatar';
import {supabase} from '@/lib/supabaseClient';
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Info,
  ListOrdered,
  BarChart,
  Play,
  Stop,
  Pause,
  Clock,
  User,
  Edit,
  Trash
} from "lucide-react";
import {useToast} from '@/hooks/use-toast';
import LeftMenu, {LeftMenuData} from '@/components/LeftMenu';

interface UserSession {
  nickname: string | null;
  id: string | null;
  type: string | null;
}

interface Question {
  text: string;
  answers: string[];
  correctAnswer: string;
  type: "multiple-choice" | "numerical";
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
  results?: { nickname: string; score: number }[];
  asked_questions: string[];
}

const GamePage = () => {
  const router = useRouter();
  const {gameId} = useParams<{ gameId: string }>();
  const {toast} = useToast();

  const [sessionData, setSessionData] = useState<UserSession | null>(null);
  const [gameSession, setGameSession] = useState<GameSessionData | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [playersInSession, setPlayersInSession] = useState<{ nickname: string; id: string }[]>([]);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [openAlertDialog, setOpenAlertDialog] = useState(false);
  const [userToKick, setUserToKick] = useState<string | null>(null);
  const [playersInLobby, setPlayersInLobby] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [users, setUsers] = useState<any[]>([])


  useEffect(() => {
    const loadUserSession = () => {
      const storedSession = localStorage.getItem('userSession');
      if (storedSession) {
        const userSession = JSON.parse(storedSession);
        setSessionData(userSession);
      }
    };
    loadUserSession();
  }, []);

  useEffect(() => {
    const fetchGameSession = async () => {
      const {data, error} = await supabase
        .from('game_sessions')
        .select('*')
        .eq('id', gameId)
        .single();

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load game session',
        });
        return;
      }

      setGameSession(data);
      if (data.status === 'active' && data.current_question) {
        setCurrentQuestion(data.current_question);
      }
      getUsers()

      fetchPlayersInLobby();
    };

    const fetchPlayersInLobby = async () => {
      if (!gameId) return;

      const {data: redisData} = await supabase
        .from('redis')
        .select('value')
        .eq('key', gameId)
        .maybeSingle();

      if (redisData?.value) {
        const players = JSON.parse(redisData.value);
        const playerIds = Object.keys(players);
        const {data: usersData} = await supabase.from('users').select('nickname').in('id', playerIds);
        setPlayersInLobby(usersData?.map((user) => user.nickname) || []);
      }
    };


    if (gameId) fetchGameSession();
  }, [gameId, toast]);


  const handleStartGame = async () => {
    setIsStartingGame(true);
    try {
      const {data, error} = await supabase
        .from('game_sessions')
        .update({status: 'active'})
        .eq('id', gameId);

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to start the game session',
        });
        return;
      }
      setGameSession({...gameSession, status: 'active'});
      toast({
        title: 'Success',
        description: 'Game session started successfully.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Unexpected error starting the game session.',
      });
    } finally {
      setIsStartingGame(false);
    }
  };

  const title = "Admin Game Page"

    const getUsers = async () => {
        try {
            const {data, error} = await supabase
                .from('users')
                .select('*');
            if (error) {
                console.error('Error fetching users:', JSON.stringify(error));
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Failed to fetch users."
                })
                return;
            }
            setUsers(data || []);
        } catch (error) {
            console.error('Unexpected error fetching users:', JSON.stringify(error));
            toast({
                variant: "destructive",
                title: "Error",
                description: "Unexpected error fetching users."
            })
        }
    };

  return (
    <div className="game-page-container bg-gray-900 text-white min-h-screen flex">
      {/* Left Menu */}
      <div className="w-64 p-4 flex flex-col">
        <h1>{title}</h1>
          {sessionData?.type === 'admin' && gameSession?.status === 'waiting' && (
              <Button onClick={handleStartGame} disabled={isStartingGame}>
                  {isStartingGame ? 'Starting...' : 'Start Game'}
              </Button>
          )}
        <LeftMenu
          data={{
            gameSession,
            playersInSession,
            sessionData,
            playersCount: playersInSession.length,
            getGroupName: () => gameSession?.questionGroupId || '',
            isAdmin: sessionData?.type === 'admin',
            isLastQuestion: false,
            timeExpired: timeLeft <= 0,
            handleStartGame: () => {
            },
            handleNextQuestion: () => {
            },
            handleFinishGame: () => {
            }
          }}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4">
        <h1>{gameSession?.sessionName}</h1>
        {/* Question Display */}
        {currentQuestion && (
          <Card className="question-card">
            <CardHeader>
              <CardTitle>{currentQuestion.text}</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Answers or input goes here */}
              {/* Example multiple-choice answers */}
              {currentQuestion.answers.map((answer) => (
                <Button
                  key={answer}
                >
                  {answer}
                </Button>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

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
            <AlertDialogAction>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default GamePage;

