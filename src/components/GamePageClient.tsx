"use client";
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/lib/supabaseClient';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { ArrowLeft, Info, ListOrdered, BarChart, Play, Stop, Pause, Clock, User, Edit, Trash } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import LeftMenu, { LeftMenuData } from '@/components/LeftMenu';

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

const GamePageClient: React.FC = () => {
    const router = useRouter();
    const { gameId } = useParams<{ gameId: string }>();
    const { toast } = useToast();

    const [sessionData, setSessionData] = useState<UserSession | null>(null);
    const [gameSession, setGameSession] = useState<GameSessionData | null>(null);
    const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
    const [playersInSession, setPlayersInSession] = useState<{ nickname: string; id: string }[]>([]);
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const [openAlertDialog, setOpenAlertDialog] = useState(false);
    const [userToKick, setUserToKick] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [playersInLobby, setPlayersInLobby] = useState<string[]>([]);


    const fetchPlayersInLobby = async () => {
        if (!gameId) return;

        const { data: redisData } = await supabase
            .from('redis')
            .select('value')
            .eq('key', gameId)
            .maybeSingle();

        if (redisData?.value) {
            const players = JSON.parse(redisData.value);
            const playerIds = Object.keys(players);
            const { data: usersData } = await supabase.from('users').select('nickname').in('id', playerIds);
            setPlayersInLobby(usersData?.map((user) => user.nickname) || []);
        }
    };

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
            const { data, error } = await supabase
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

             fetchPlayersInLobby();
        };

        if (gameId) fetchGameSession();
    }, [gameId, toast]);

    return (
        <>
            {gameSession && gameSession.status === 'waiting' && sessionData && sessionData.type === 'player' ? (
                <div className="container mx-auto max-w-4xl mt-8">
                    <h2 className="text-2xl font-semibold mb-4">Players in Lobby</h2>
                    <Card className="border">
                        <CardContent>
                            {playersInLobby.map((player) => (
                                <div key={player} className="flex items-center space-x-4 py-2">
                                    <Avatar>
                                        <AvatarImage src="https://github.com/shadcn.png" />
                                        <AvatarFallback>{player?.substring(0, 2)}</AvatarFallback>
                                    </Avatar>
                                    <p className="text-sm font-medium leading-none">
                                        {player}
                                    </p>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                    <Button onClick={() => router.push('/')}>Leave Lobby</Button>
                </div>
            ) : (


                <div className="game-container">
                    <LeftMenu
                        data={{
                            gameSession,
                            playersInSession,
                            sessionData,
                            playersCount: playersInSession.length,
                            getGroupName: () => gameSession?.questionGroupId || '',
                            isAdmin,
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

                    <div className="main-content">
                        <div className="header-section">
                            <Button variant="outline" onClick={() => router.push('/')}>
                                <ArrowLeft className="icon" />
                            </Button>
                            <h1>{gameSession?.sessionName}</h1>
                        </div>

                        {currentQuestion && (
                            <Card className="question-card">
                                <CardHeader>
                                    <CardTitle>{currentQuestion.text}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p>Time Left: {timeLeft}</p>
                                    <div className="answers-grid">
                                        {currentQuestion.answers.map((answer) => (
                                            <Button
                                                key={answer}
                                                onClick={() => setSelectedAnswer(answer)}
                                            >
                                                {answer}
                                            </Button>
                                        ))}
                                    </div>
                                    <Button onClick={() => {
                                    }}>Submit answer</Button>
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
            )}
        </>

    );
};

export default GamePageClient;
