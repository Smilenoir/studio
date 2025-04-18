"use client";
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Info, ListOrdered, BarChart, Play, Stop, Pause, Clock, User, Edit, Trash } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import LeftMenu, { LeftMenuData } from '@/components/LeftMenu';

import { Label } from '@/components/ui/label';

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
    group_id: string;
    current_question?: any;
    question_index: number | null;
    results?: { nickname: string; score: number }[];
    asked_questions: string[]; // Added: array to track asked question IDs
    time_per_question: number; // Added: time per question in seconds
}
interface PlayerAnswer {
    [userId: string]: string;
}

let timer: NodeJS.Timeout | null = null;

const GamePageClient: React.FC = () => { // Removed gameId prop
    const router = useRouter();
    const { gameId } = useParams<{ gameId: string }>();

    const [sessionData, setSessionData] = useState<UserSession | null>(null);
    const [gameSession, setGameSession] = useState<GameSessionData | null>(null);
    const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
    const { toast } = useToast();
    const [playersInSession, setPlayersInSession] = useState<{ nickname: string; id: string }[]>([]);
    const [questions, setQuestions] = useState<Question[] | null>(null);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [time, setTime] = useState<number>(0);
    const [timeExpired, setTimeExpired] = useState<boolean>(false);
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const [openAlertDialog, setOpenAlertDialog] = useState(false);
    const [userToKick, setUserToKick] = useState<string | null>(null);
    const [playerAnswers, setPlayerAnswers] = useState<PlayerAnswer>({});
    const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
    const [numericalAnswer, setNumericalAnswer] = useState<string>("");
    const [sessionStatus, setSessionStatus] = useState<string>('waiting');
    const [playerRankings, setPlayerRankings] = useState<{ userId: string; rank: number, points: number }[]>([]);
    const [isAdmin, setIsAdmin] = useState(false);
    //const [isAdminObserver, setIsAdminObserver] = useState(false);

    const isLastQuestion = gameSession && questions && gameSession.question_index !== null && gameSession.question_index >= questions.length - 1;

    useEffect(() => {
        const loadSession = async () => {
            const userSession = JSON.parse(localStorage.getItem('userSession') || '{}');
            setSessionData(userSession);
        };
        loadSession();
    }, []);

    useEffect(() => {
        const loadSession = async () => {
            // Assuming gameId is available somehow (e.g., from URL params)
            // You'll need to adjust this to get the actual gameId


            if (!gameId) {
                console.error('Game ID not found');
                // Handle error
                return;
            }

            const { data, error } = await supabase
                .from<GameSessionData>('game_sessions') // Replace with your table name
                .select('*')
                .eq('id', gameId)
                .single();

            if (error) {
                console.error('Error loading session:', error);
                // Handle error
            } else if (data) {
                setGameSession(data);
                if (data.status === 'active') {
                    setCurrentQuestion(data.current_question);
                }
                if (data.status === 'waiting') {
                    await startGame(data);
                }
            }
        };

        const startGame = async (sessionData: GameSessionData) => {
            const { data: questions, error: questionsError } = await supabase
                .from('questions') // Replace with your questions table
                .select('*')
                .eq('group_id', sessionData.questionGroupId);

            if (questionsError || !questions || questions.length === 0) {
                console.error('Error loading questions:', questionsError);
                // Handle error
                return;
            }

            const randomIndex = Math.floor(Math.random() * questions.length);
            const selectedQuestion = questions[randomIndex];

            const { error: updateError } = await supabase
                .from('game_sessions')
                .update({ status: 'active', current_question: selectedQuestion, asked_questions: [] }) // Initialize asked_questions here
                .eq('id', sessionData.id);

            if (updateError) {
                console.error('Error updating session:', updateError);
                // Handle error
            } else {
                setGameSession({ ...sessionData, status: 'active', current_question: selectedQuestion, asked_questions: [] });
                setCurrentQuestion(selectedQuestion);
            }
        };

        const nextQuestion = async () => {
            if (!gameSession) return;

            // 1. Get all questions for the session's group
            const { data: allQuestions, error: questionsError } = await supabase
                .from('questions') // Replace with your questions table
                .select('*')
                .eq('group_id', gameSession.questionGroupId);

            if (questionsError) {
                console.error('Error loading questions:', questionsError);
                // Handle error
                return;
            }

            if (!allQuestions || allQuestions.length === 0) {
                console.error('No questions found for this group');
                // Handle error (e.g., display a message)
                return;
            }

            // 2. Filter out already asked questions
            const availableQuestions = allQuestions.filter(
                (question) => !gameSession.asked_questions.includes(question.id) // Assuming question.id is the ID
            );

            // 3. Check if there are any questions left
            if (availableQuestions.length === 0) {
                // No more questions - end the game
                const { error: updateError } = await supabase
                    .from('game_sessions')
                    .update({ status: 'finished' })
                    .eq('id', gameSession.id);

                if (updateError) {
                    console.error('Error updating session status to finished:', updateError);
                    // Handle error
                } else {
                    setGameSession({ ...gameSession, status: 'finished' });
                }
                return;
            }

            // 4. Select a random question
            const randomIndex = Math.floor(Math.random() * availableQuestions.length);
            const nextQuestion = availableQuestions[randomIndex];

            // 5. Update the session in Supabase
            const { error: updateError } = await supabase
                .from('game_sessions')
                .update({
                    current_question: nextQuestion,
                    asked_questions: [...gameSession.asked_questions, nextQuestion.id],
                    status: 'in_progress', // Or 'active', depending on your preference
                })
                .eq('id', gameId);

            if (updateError) {
                console.error('Error updating session with next question:', updateError);
                // Handle error
            } else {
                // 6. Update component state
                setGameSession({
                    ...gameSession,
                    current_question: nextQuestion,
                    asked_questions: [...gameSession.asked_questions, nextQuestion.id],
                    status: 'in_progress',
                });
                setCurrentQuestion(nextQuestion);
            }
        }

        useEffect(() => {
            if (sessionData && sessionData.id) {
                const fetchUserData = async () => {
                    try {
                        const { data: userData, error: userError } = await supabase
                            .from('users')
                            .select('type')
                            .eq('id', sessionData.id)
                            .single();

                        if (userError) {
                            console.error('Error fetching user data:', userError);
                            toast({
                                variant: 'destructive',
                                title: 'Error',
                                description: 'Failed to fetch user data.',
                            });
                            return;
                        }

                        setIsAdmin(userData?.type === 'admin');

                    } catch (error) {
                        console.error('Unexpected error fetching user data:', error);
                        toast({
                            variant: 'destructive',
                            title: 'Error',
                            description: 'Unexpected error fetching user data.',
                        });
                    }
                };

                fetchUserData();
            }
        }, [sessionData?.id, supabase, toast]);

        loadSession();
    }, [supabase, gameId]); // Removed params.gameId, assuming it's handled in loadSession


    const getAnswerButtonClass = (answer: string, isAdmin: boolean) => {

        if (isAdmin) {
            return question?.answers.includes(answer) ? 'bg-green-500 text-white' : '';
        } else {
            if (timeExpired && question && question.answers.includes(answer)) {
                return 'bg-green-500 text-white';
            } else if (timeExpired && selectedAnswer === answer && !question?.answers.includes(answer)) {
                return 'bg-red-500 text-white';
            } else if (!timeExpired && playerAnswers[sessionData?.id!]) {
                return playerAnswers[sessionData?.id!] === answer ? 'bg-orange-500 text-white' : '';
            }

            return '';
        };
    };
    const handleStartGame = async () => {
        try {
            const { data: currentSession } = await supabase
                .from('game_sessions')
                .select('question_index')
                .eq('id', gameId)
                .single();

            if (currentSession?.question_index !== null) {
                // Сессия уже была запущена
                return;
            }

            const response = await fetch(`/api/game_sessions/${gameId}`, {
                method: "PUT",
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status: "active" }),
            });

            setSessionStatus("active")

            if (response.ok) {
                // Обработать успешный ответ, например, обновить состояние сессии.
                setSessionStatus("active");
            } else {
                // Обработать ошибку.
                console.error('Error starting game:', JSON.stringify(response.error));
            }

            const { error } = await supabase.from('game_sessions').update({ status: 'active', question_index: 0, }).eq('id', gameId);
            if (error) {
                console.error('Error starting game:', JSON.stringify(error));
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: 'Failed to start game.',
                });
                return;
            };

        } catch (error) {
            console.error('Unexpected error starting game:', JSON.stringify(error));
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Unexpected error starting game.',
            });
        }
    };

    const endGame = async () => {
        if (!gameSession) return;


        try {
            const { error } = await supabase
                .from('game_sessions')
                .delete()
                .eq('id', gameSession.id);

            if (error) {
                console.error('Error ending game:', error);
                // Handle error
            } else {
                router.push('/admin');
            }
        } catch (error) {
            console.error("Error ending game:", error);
        }
    };


    const nextQuestion = async () => {

    };




    const handleNextQuestion = async () => {

        try {
            if (!gameSession) {
                console.error('Game session data not loaded.');
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: 'Game session data not loaded.',
                });
                return;
            }


            const nextQuestionIndex = (gameSession.question_index || 0) + 1;

            const { error } = await supabase
                .from('game_sessions')
                .update({ question_index: nextQuestionIndex })
                .eq('id', gameId);

            if (error) {
                console.error('Error updating game session:', JSON.stringify(error));
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: 'Failed to update game session.',
                });
                return;
            }

            const { data: updatedGameSession } = await supabase
                .from('game_sessions')
                .select('*')
                .eq('id', gameId)
                .single();

            setGameSession(updatedGameSession);
            setTimeExpired(false);

        } catch (error) {
            console.error('Unexpected error updating game session:', JSON.stringify(error));
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Unexpected error updating game session.',
            });
        }
    };

    const handleFinishGame = async () => {
        try {
            const { error } = await supabase
                .from('game_sessions')
                .update({ status: 'finished' })
                .eq('id', gameId);

            if (error) {
                console.error('Error finishing game:', JSON.stringify(error));
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: 'Failed to finish game.',
                });
                return;
            }

            const { data } = await supabase
                .from('game_sessions')
                .select('*')
                .eq('id', gameId)
                .single();

            setGameSession(data);
        } catch (error) {
            console.error('Unexpected error finishing game:', JSON.stringify(error));
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Unexpected error finishing game.',
            });
        }
    };


    // Обработчик ошибок Supabase
    const handleSupabaseError = (error: any) => {
        toast({ title: "Error", description: error.message || "An unexpected error occurred." });
    };


    const isPlayer = (userId: string | null) => {
        return gameSession?.players.includes(userId!);
    }

    // Основная загрузка данных игры
    useEffect(() => {
        const fetchGameData = async () => {

            if (gameSession?.status === 'in_progress' && currentQuestion && gameSession.timePerQuestionInSec) {
                setTimeLeft(gameSession.timePerQuestionInSec);
                timer = setInterval(() => {
                    setTimeLeft((prevTime) => {
                        if (prevTime <= 1) {
                            clearInterval(timer!);
                            handleTimeOut();
                            return 0;
                        }
                        return prevTime - 1;
                    });
                }, 1000);

                return () => clearInterval(timer!); // Cleanup on question change or unmount
            }

            const handleTimeOut = async () => {
                if (!gameSession || !currentQuestion) return;

                const { error: updateError } = await supabase
                    .from('game_sessions')
                    .update({
                        // Example:  incorrect_answers: gameSession.incorrect_answers + 1,
                        //  Adapt this to how you track (lack of) answers
                    })
                    .eq('id', gameId);

                if (updateError) {
                    console.error('Error handling time out:', updateError);
                }

                const { data: userData } = await supabase
                    .from('users')
                    .select('type')
                    .eq('id', sessionData.id)
                    .single();

                setIsAdmin(userData?.type === 'admin');

                // Настройка таймера
                if (gameSession?.timePerQuestionInSec) {
                    setTime(gameSession.timePerQuestionInSec);
                }
            }
        }
        fetchGameData();
    }, [gameId, sessionData?.id, supabase]);


    const handleAnswerSelect = (answer: string) => {
        if (!isAnswerSubmitted) {
            setSelectedAnswer(answer);
            setPlayerAnswers({ ...playerAnswers, [sessionData?.id!]: answer });
        }
    };
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

    const calculatePoints = () => {
        if (!currentQuestion || !sessionData || !sessionData.id) {
            return 0;
        }

        let points = 0;
        const correctAnswer = currentQuestion.correctAnswer;
        const selected = playerAnswers[sessionData.id];

        if (selected === correctAnswer) {
            // Рассчет баллов в зависимости от типа вопроса
            if (currentQuestion.type === "multiple-choice") {
                points = 100;
            } else if (currentQuestion.type === "numerical") {
                points = 200;
                // Дополнительная логика, если ответ числовой
            }
            // Дополнительные баллы за скорость ответа
            points += Math.max(0, time! * 1);
        }

        return points;
    };


    const handleRemovePlayer = async () => {
        if (userToKick) {
            try {
                const { error } = await supabase
                    .from('game_sessions')
                    .update({ players: supabase.raw(`array_remove(players, '${userToKick}')`) })
                    .eq('id', gameId);

                if (error) {
                    console.error('Error removing player:', JSON.stringify(error));
                    toast({
                        variant: 'destructive',
                        title: 'Error',
                        description: 'Failed to remove player.',
                    });
                } else {
                    // Обновление списка игроков после удаления
                    setPlayersInSession(prevPlayers => prevPlayers.filter(p => p.id !== userToKick));
                }
            } catch (error) {
                console.error('Unexpected error removing player:', JSON.stringify(error));
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: 'Unexpected error removing player.',
                });
            } finally {
                setOpenAlertDialog(false); // Закрытие модального окна
            }
        }
    };


    const handleKickPlayer = (userId: string) => {
        setUserToKick(userId);
        setOpenAlertDialog(true);

    };


    const ResultsTable = ({ results }: { results: { nickname: string; score: number }[] }) => {
        // Sort results by score in descending order
        const sortedResults = results.sort((a, b) => b.score - a.score);

        return (
            <table>
                <thead>
                    <tr>
                        <th>Place</th>
                        <th>Nickname</th>
                        <th>Score</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedResults.map((result, index) => (
                        <tr key={index}>
                            <td>{index + 1}</td>
                            <td>{result.nickname}</td>
                            <td>{result.score}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    };




    const getLeftMenuData = useCallback((): LeftMenuData => ({
        gameSession,
        playersInSession,
        sessionData,
        playersCount: playersInSession.length,
        getGroupName: () => 'Some Group Name', // Mock, replace with the real implementation, possibly fetch from a db
        isAdmin: isAdmin,
        isLastQuestion: isLastQuestion,
        timeExpired: timeExpired,
        handleStartGame: handleStartGame,
        handleNextQuestion: handleNextQuestion,
        handleFinishGame: handleFinishGame
    }), [gameSession, playersInSession, sessionData, isAdmin, isLastQuestion, timeExpired, handleStartGame, handleNextQuestion, handleFinishGame]);

    return (
        
            {/* Левое меню управления */}
            <LeftMenu data={getLeftMenuData()} />

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
                                        onClick={() => handleAnswerSelect(answer)}
                                        className={getAnswerButtonClass(answer, isAdmin)}>
                                        {answer}
                                    </Button>
                                ))}
                            </div>
                            <Button onClick={handleSubmitAnswer}>Submit answer</Button>
                        </CardContent>
                    </Card>
                )}

                {gameSession?.status === "waiting" && (
                    <Button disabled>Start</Button>
                )}
                {gameSession?.status === "active" && (
                    <Button disabled>Game In Progress</Button>
                )}
                {gameSession?.status === "in_progress" && (
                    <Button onClick={handleNextQuestion}>Next Question</Button>
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
        
    );
};
export default GamePageClient;
