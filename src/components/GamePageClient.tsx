"use client";
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { ArrowLeft } from "lucide-react";
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

    useEffect(() => {
        const loadUserSession = () => {
            const userSession = JSON.parse(localStorage.getItem('userSession') || '{}');
            setSessionData(userSession);
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
        };

        if (gameId) fetchGameSession();
    }, [gameId, toast]);

    const handleStartGame = useCallback(async () => {
        try {
            const { error } = await supabase
                .from('game_sessions')
                .update({ status: 'active' })
                .eq('id', gameId);

            if (error) throw error;

            toast({
                title: 'Game started!',
                description: 'The game has been successfully started',
            });
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to start game',
            });
        }
    }, [gameId, toast]);

    const handleNextQuestion = useCallback(async () => {
        if (!gameSession) return;

        const nextIndex = (gameSession.question_index || 0) + 1;
        
        const { data: questions } = await supabase
            .from('questions')
            .select('*')
            .eq('group_id', gameSession.questionGroupId);

        if (!questions || nextIndex >= questions.length) {
            await handleFinishGame();
            return;
        }

        const { error } = await supabase
            .from('game_sessions')
            .update({ 
                question_index: nextIndex,
                current_question: questions[nextIndex]
            })
            .eq('id', gameId);

        if (!error) {
            setCurrentQuestion(questions[nextIndex]);
            setTimeLeft(gameSession.timePerQuestionInSec);
        }
    }, [gameSession, gameId]);

    const handleFinishGame = useCallback(async () => {
        const { error } = await supabase
            .from('game_sessions')
            .update({ status: 'finished' })
            .eq('id', gameId);

        if (!error) {
            router.push('/results');
        }
    }, [gameId, router]);

    return (
        <div className="game-container">
            <LeftMenu
                data={{
                    gameSession,
                    playersInSession,
                    sessionData,
                    playersCount: playersInSession.length,
                    getGroupName: () => gameSession?.questionGroupId || '',
                    isAdmin,
                    isLastQuestion: gameSession?.question_index === ((gameSession?.asked_questions?.length || 0) - 1),
                    timeExpired: timeLeft <= 0,
                    handleStartGame,
                    handleNextQuestion,
                    handleFinishGame
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
                            <Button onClick={() => {}}>Submit answer</Button>
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

export default GamePageClient;