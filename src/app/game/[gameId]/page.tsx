'use client'

import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {supabase} from "@/lib/supabaseClient";
import {QuestionDisplay} from "@/components/question-display";
import {AnswerInput} from "@/components/answer-input";
import {ResultsDisplay} from "@/components/results-display";
import {TimerDisplay} from "@/components/timer-display";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {FunFactGenerator} from "@/components/fun-fact-generator";
import { ArrowLeft } from "lucide-react";
import {useToast} from "@/hooks/use-toast";

interface Question {
  id: string;
  groupId: string;
  questionType: 'multipleChoice' | 'numerical';
  answers: string[];
  correctAnswer: string | null;
  correctNumber: number | null;
  questionText: string;
}

interface GameSession {
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

interface UserSession {
  nickname: string | null;
  id: string | null; 
  type: string | null;
};

interface UserAnswer {
  userId: string;
  answer: string;
  zScore?: number;
  timestamp: number;
}

const fetchUserNicknames = async (userIds: string[]) => {
  const {data, error} = await supabase
    .from('users')
    .select('id, nickname')
    .in('id', userIds);

  if (error) {
    console.error('Error fetching user nicknames:', error);
    return {};
  }

  return data.reduce((acc, user) => ({...acc, [user.id]: user.nickname}), {});
};

export default function GamePage() {
  const [question, setQuestion] = useState<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [time, setTime] = useState(0);
  const [isTimed, setIsTimed] = useState(false);
  const [isObserver, setIsObserver] = useState(false); // New state for observer mode
  const [timeExpired, setTimeExpired] = useState(false);
  const [userAnswer, setUserAnswer] = useState<UserAnswer | null>(null);
  const [gameSession, setGameSession] = useState<GameSession | null>(null);
  const {gameId} = useParams();
  const router = useRouter();
  const [numericalAnswers, setNumericalAnswers] = useState<UserAnswer[]>([]);
  const [overallRanking, setOverallRanking] = useState<{ userId: string; score: number; }[]>([]); // Overall ranking
  const [questionRanking, setQuestionRanking] = useState<{ userId: string; score: number; timestamp: number; }[]>([]); // Question ranking
  const session = JSON.parse(localStorage.getItem('userSession') || '{}');
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [isNumericalAnswerSubmitted, setIsNumericalAnswerSubmitted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [sessionData, setSessionData] = useState<UserSession | null>(null);
  const [userNicknames, setUserNicknames] = useState<{ [userId: string]: string }>({});
  const {toast} = useToast();

  useEffect(() => {
    if (!gameId) return;

    const fetchSessionAndQuestions = async () => {
      const {data: session, error: sessionError} = await supabase
        .from('game_sessions')
        .select('*')
        .eq('id', gameId)
        .single();

      if (sessionError) {
        console.error("Error fetching session:", sessionError);
        return;
      }

      if (!session) {
        console.error("Session not found");
        return;
      }

      setGameSession(session);
      setIsTimed(session.timePerQuestionInSec > 0);

      const {data: fetchedQuestions, error: questionsError} = await supabase
        .from('questions')
        .select('*')
        .eq('groupId', session.questionGroupId);

      if (questionsError) {
        console.error("Error fetching questions:", questionsError);
        return;
      }

      setQuestions(fetchedQuestions || []);
      if (fetchedQuestions && fetchedQuestions.length > 0) {
        // Fetch the question index from the game session
        const initialQuestionIndex = session.question_index !== null ? session.question_index : 0;
        setCurrentQuestionIndex(initialQuestionIndex);
        setQuestion(fetchedQuestions[initialQuestionIndex] || null);
      }
    };

    fetchSessionAndQuestions();

    const loadSession = async () => {
      // ... your session loading logic ...
      const userSession = session;
      setSessionData(userSession);
      setSessionLoaded(true);
    };
    loadSession();

    // Example of redirecting if no session or handling different user types
    if (!sessionData) {
      router.push("/"); // Redirect to home if no session
    }

      
  }, [gameId]);

  useEffect(() => {
    if (gameSession && gameSession.status !== 'active') {
      router.push('/player');
    }
  }, [gameSession, router]);

  useEffect(() => {
    if (isTimed && question) {
      setTime(gameSession?.timePerQuestionInSec || 0);
      setTimeExpired(false); // Reset timeExpired when a new question is loaded

      const timerId = setInterval(() => {
        setTime(prevTime => {
          if (prevTime <= 0) {
            clearInterval(timerId);
            setTimeExpired(true);
            handleSubmitAnswer();
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);

      return () => clearInterval(timerId);
    }
  }, [question, isTimed, gameSession]);

    useEffect(() => {
    // Collect unique user IDs from overallRanking and questionRanking
    const userIds = new Set<string>();
    overallRanking.forEach(user => userIds.add(user.userId));
    questionRanking.forEach(user => userIds.add(user.userId));

    // Fetch nicknames for these user IDs
      const getUserNicknames = async () => {
        const nicknames = await fetchUserNicknames(Array.from(userIds));
        setUserNicknames(nicknames);
      };
      getUserNicknames();
  }, [overallRanking, questionRanking]);

  const handleAnswer = (answer: string) => {
    setSelectedAnswer(answer);
  };

  const calculateMultipleChoiceScore = () => {
    if (timeExpired) {
      return 0;
    }

    return time;
  };

  const calculateNumericalScore = (answer: string) => {
    if (!question || question.correctNumber === null) return 0;

    const correctAnswer = question.correctNumber;
    const userAnswerValue = parseFloat(answer);

    if (isNaN(userAnswerValue)) return 0;

    const zScore = Math.abs(correctAnswer - userAnswerValue);

    setUserAnswer({
      userId: session.id,
      answer: answer,
      zScore: zScore,
      timestamp: Date.now(),
    });

    return zScore;
  };

  const updateQuestionIndex = async (nextIndex: number) => {
    try {
      const { error: updateError } = await supabase
        .from('game_sessions')
        .update({ question_index: nextIndex })
        .eq('id', gameId);

      if (updateError) {
        console.error("Error updating question index:", updateError);
      }
    } catch (error) {
      console.error("Unexpected error:", error);
    }
  };

  const handleSubmitAnswer = () => {
    if (!question) return;

    let score = 0;
    if (question.questionType === 'multipleChoice') {
      const isCorrect = selectedAnswer === question.correctAnswer;
      score = isCorrect ? calculateMultipleChoiceScore() : 0;
      updateOverallRanking(session.id, score); // Update overall ranking for multiple choice
      handleNextQuestion();
    } else if (question.questionType === 'numerical') {
      score = calculateNumericalScore(selectedAnswer);
    }

    submitAnswer(score);
  };

  const submitAnswer = async (score: number) => {
    if (!question) return;

    if (question.questionType === 'numerical') {
      setTimeExpired(true);
      setIsNumericalAnswerSubmitted(true);
      setNumericalAnswers(prevAnswers => {
        const newAnswers = [...prevAnswers, userAnswer];
        return newAnswers;
      });
    } else {
      handleNextQuestion();
    }
  };

  const updateOverallRanking = (userId: string, score: number) => {
    setOverallRanking(prevRanking => {
      const existingUserIndex = prevRanking.findIndex(entry => entry.userId === userId);

      if (existingUserIndex !== -1) {
        const updatedRanking = [...prevRanking];
        updatedRanking[existingUserIndex] = {
          ...updatedRanking[existingUserIndex],
          score: updatedRanking[existingUserIndex].score + score,
        };
        return updatedRanking;
      } else {
        return [...prevRanking, { userId, score }];
      }
    });
  };

  useEffect(() => {
    if (timeExpired && question?.questionType === 'numerical' && numericalAnswers.length > 0 && isNumericalAnswerSubmitted) {
      const sortedAnswers = [...numericalAnswers].sort((a, b) => {
        if (a.zScore !== b.zScore) {
          return (a.zScore || 0) - (b.zScore || 0);
        }
        return a.timestamp - b.timestamp;
      });

      const newQuestionRanking = sortedAnswers.map((answer, index) => ({
        userId: answer.userId,
        score: (sortedAnswers.length - index) * 2,
        timestamp: answer.timestamp,
      }));

      setQuestionRanking(newQuestionRanking);

      newQuestionRanking.forEach(answer => {
        updateOverallRanking(answer.userId, answer.score); // Update overall ranking for numerical
      });

      handleNextQuestion();
      setIsNumericalAnswerSubmitted(false);
    }
  }, [timeExpired, numericalAnswers, question, session, isNumericalAnswerSubmitted]);

  const handleNextQuestion = () => {
    setSelectedAnswer('');
    setTime(gameSession?.timePerQuestionInSec || 0);
    setTimeExpired(false);
    setUserAnswer(null);
    setNumericalAnswers([]);
    setQuestionRanking([]);

    setCurrentQuestionIndex(prevIndex => {
      const nextIndex = prevIndex + 1;
      if (nextIndex < questions.length) {
        setQuestion(questions[nextIndex]);
        updateQuestionIndex(nextIndex); // Update the question index in the database
        return nextIndex;
      } else {
        setQuestion(null);
        return prevIndex;
      }
    });
  };

  const results = {
    correct: correctAnswers,
    total: questions.length,
    percentage: questions.length > 0 ? (correctAnswers / questions.length) * 100 : 0,
  };

  const isAdminObserver = async () => {
    try {
      const { data, error } = await supabase
        .from('game_sessions')
        .select('players')
        .eq('id', gameId)
        .single();

      if (error) {
        console.error('Error fetching game session:', error);
        return false;
      };

      // Check if the admin is the only one in the session
      if (data && data.players && data.players.length === 1) {
        return true;
      }

      return false;
    } catch (error) {
      console.error('Unexpected error fetching game session:', error);
      return false;
    };
  };

  useEffect(() => {
    async function checkIfAdminObserver() {
      const observerStatus = await isAdminObserver();
      setIsObserver(observerStatus);
    };
    
    checkIfAdminObserver();
  }, [gameId]);
  
  const handleNextAdminQuestion = async () => {
    if (!gameId) return;

    try {
      if (gameSession?.question_index === null) return;

      const nextIndex = gameSession?.question_index + 1;

      if (nextIndex < questions.length) {
        const { error: updateError } = await supabase
          .from('game_sessions')
          .update({ question_index: nextIndex })
          .eq('id', gameId);

        if (updateError) {
          console.error("Error updating question index:", updateError);
          return;
        }

        setQuestion(questions[nextIndex]);
      } else {
        console.log("No more questions");
        setQuestion(null);
      }
    } catch (error) {
      console.error("Unexpected error:", error);
    }
  };

  const handleStartGame = async () => {
    try {
      const { error: updateError } = await supabase
        .from('game_sessions')
        .update({ status: 'active' })
        .eq('id', gameId);

      if (updateError) {
        console.error("Error starting game session:", updateError);
        toast({
          title: "Error",
          description: "Failed to start game session.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Game session started successfully.",
      });
    } catch (error) {
      console.error("Unexpected error:", error);
      toast({
        title: "Error",
        description: "Unexpected error starting game session.",
        variant: "destructive",
      });
    }
  };

  if (!sessionLoaded || !sessionData?.type) {
    return <div>Loading or Invalid Session...</div>;
  }

  if (sessionData.type === 'admin') {
    // Render admin-specific content using GamePageContent
    return <GamePageContent gameId={gameId} gameSession={gameSession} questions={questions} setQuestion={setQuestion} handleNextAdminQuestion={handleNextAdminQuestion} sessionData={sessionData} handleStartGame={handleStartGame} isTimed={isTimed} time={time} question={question} handleAnswer={handleAnswer} selectedAnswer={selectedAnswer} timeExpired={timeExpired} handleSubmitAnswer={handleSubmitAnswer} results={results} overallRanking={overallRanking} questionRanking={questionRanking} isObserver={isObserver} isAdmin={true} sessionId={gameId} fetchSessionAndQuestions={() => {}}/>;
  } else if (sessionData.type === 'player') {
     // Render player-specific content using GamePageContent
     return <GamePageContent gameId={gameId} gameSession={gameSession} questions={questions} setQuestion={setQuestion} handleNextAdminQuestion={handleNextAdminQuestion} sessionData={sessionData} handleStartGame={handleStartGame} isTimed={isTimed} time={time} question={question} handleAnswer={handleAnswer} selectedAnswer={selectedAnswer} timeExpired={timeExpired} handleSubmitAnswer={handleSubmitAnswer} results={results} overallRanking={overallRanking} questionRanking={questionRanking} isObserver={isObserver} isAdmin={false} sessionId={gameId} fetchSessionAndQuestions={() => {}}/>;
    }

  return (
      <div>Something went wrong</div>
  );
}


const GamePageContent = ({ gameId, gameSession, questions, setQuestion, handleNextAdminQuestion, sessionData, handleStartGame, isTimed, time, question, handleAnswer, selectedAnswer, timeExpired, handleSubmitAnswer, results, overallRanking, questionRanking, isObserver, isAdmin, sessionId, fetchSessionAndQuestions }) => {
  const router = useRouter();
  const {toast} = useToast();

  const handleStartGameAction = async () => {
    try {
      const { error: updateError } = await supabase
        .from('game_sessions')
        .update({ status: 'active' })
        .eq('id', gameId);

      if (updateError) {
        console.error("Error starting game session:", updateError);
        toast({
          title: "Error",
          description: "Failed to start game session.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Game session started successfully.",
      });

      // Refresh the session data after starting the game
      fetchSessionAndQuestions();
    } catch (error) {
      console.error("Unexpected error:", error);
      toast({
        title: "Error",
        description: "Unexpected error starting game session.",
        variant: "destructive",
      });
    }
  };

  const title = isAdmin ? "Admin Game Page" : "Player Game Page";
    return (
        <div className="flex flex-col items-center min-h-screen py-2 bg-gray-900 text-white">
            <div className="absolute top-4 left-4">
        <Button
          variant="outline"
          className="h-10 w-10 p-0 bg-black border-gray-500 text-white rounded-full"
          onClick={() => router.push('/admin')}
        >
          <ArrowLeft
            className="h-6 w-6"
            aria-hidden="true"
          />
        </Button>
            </div>
          <h1 className="text-4xl font-bold mb-8 mt-10">{title}</h1>
            <div className="mb-8">{isTimed && question && <TimerDisplay time={time}/>}</div>


      <div className="flex w-full max-w-6xl justify-between space-x-8 px-4">
          {/* Overall Ranking Table */}

        <Card className="w-1/3">
          <CardHeader>
            <CardTitle>Overall Ranking</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                </TableRow> 
              </TableHeader>
              <TableBody>
                {overallRanking.sort((a, b) => b.score - a.score).map((user) => (
                  <TableRow key={user.userId}>
                    <TableCell>{userNicknames[user.userId] || user.userId}</TableCell>
                    <TableCell>{user.score}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

          {/* Main Content Area */}
          <div className="flex flex-col items-center w-1/3 space-y-4">
              {/* Question Display */}

          {question ? (
            <>
              <FunFactGenerator topics={[question.questionText]} />
              <QuestionDisplay question={question.questionText} />
              {question.questionType === 'multipleChoice' ? (
                <>
                  <AnswerInput
                    options={question.answers}
                    onAnswer={handleAnswer}
                    selectedAnswer={selectedAnswer}
                    onSubmit={handleSubmitAnswer}
                    disabled={timeExpired}
                  />
                  {timeExpired && <div>Time's up!</div>}
                </>
              ) : (
                <div>
                  <input
                    type="number"
                    value={selectedAnswer}
                    onChange={(e) => handleAnswer(e.target.value)}
                    placeholder="Enter your answer"
                    disabled={timeExpired}
                  />
                  <Button onClick={handleSubmitAnswer} disabled={timeExpired}>Submit Answer</Button>
                  {timeExpired && <div>Time's up!</div>}
                </div>
              )}
            </>
          ) : (
            <ResultsDisplay results={results} />
          )}
              {isAdmin && (
                  <div className="flex space-x-4 mt-4">
                      {isObserver && (
                          <Button onClick={handleNextAdminQuestion} variant="outline">
                              Next Question
                          </Button>
                      )}
                      {gameSession?.status !== 'active' &&
                          <Button onClick={handleStartGameAction}>
                              Start Game
                          </Button>
                      }
                  </div>
              )}
          )}
        </div>

        {/* Question Ranking Table */}
        <Card className="w-1/3">
          <CardHeader>
            <CardTitle>Question Ranking</CardTitle>
            <CardDescription>Ranking for the current question</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                </TableRow> 
              </TableHeader>
              <TableBody>
                {questionRanking.sort((a, b) => b.score - a.score).map((user) => (
                    <TableRow key={user.userId}>
                    <TableCell>{userNicknames[user.userId] || user.userId}</TableCell>
                    <TableCell>{user.score}</TableCell>
                  </TableRow> 
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );

    }

