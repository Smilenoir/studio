'use client';

import {useRouter} from "next/navigation";
import {useEffect, useState} from "react";
import {supabase} from "@/lib/supabaseClient";
import {QuestionDisplay} from "@/components/question-display";
import {AnswerInput} from "@/components/answer-input";
import {ResultsDisplay} from "@/components/results-display";
import {TimerDisplay} from "@/components/timer-display";
import {useParams} from 'next/navigation';
import {Button} from "@/components/ui/button";
import {ArrowLeft} from "lucide-react";

interface Question {
  id: string;
  groupId: string;
  questionType: 'multipleChoice' | 'numerical';
  questionText: string;
  answers: string[];
  correctAnswer: string | null;
  correctNumber: number | null;
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
}

export default function GamePage() {
  const [question, setQuestion] = useState<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [time, setTime] = useState(0);
  const [gameSession, setGameSession] = useState<GameSession | null>(null);
  const {sessionId} = useParams();
  const router = useRouter();
  const [isTimed, setIsTimed] = useState(false);
  const [isObserver, setIsObserver] = useState(false); // New state for observer mode

  useEffect(() => {
    if (!sessionId) return;

    const fetchSessionAndQuestions = async () => {
      const {data: session, error: sessionError} = await supabase
        .from('game_sessions')
        .select('*')
        .eq('id', sessionId)
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
        setQuestion(fetchedQuestions[0]);
      }
    };

    fetchSessionAndQuestions();
  }, [sessionId]);

  useEffect(() => {
    if (gameSession && gameSession.status !== 'active') {
      router.push('/player');
    }
  }, [gameSession, router]);

  useEffect(() => {
    if (isTimed && question) {
      setTime(gameSession?.timePerQuestionInSec || 0);
      const timerId = setInterval(() => {
        setTime(prevTime => {
          if (prevTime <= 0) {
            clearInterval(timerId);
            handleSubmitAnswer();
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);

      return () => clearInterval(timerId);
    }
  }, [question, isTimed, gameSession]);

  const handleAnswer = (answer: string) => {
    setSelectedAnswer(answer);
  };

  const handleSubmitAnswer = () => {
    if (!question) return;

    let isCorrect = false;
    if (question.questionType === 'multipleChoice') {
      isCorrect = selectedAnswer === question.correctAnswer;
    } else if (question.questionType === 'numerical') {
      isCorrect = question.correctNumber !== null && parseFloat(selectedAnswer) === question.correctNumber;
    }

    if (isCorrect) {
      setCorrectAnswers(prevCount => prevCount + 1);
    }

    handleNextQuestion();
  };

  const handleNextQuestion = () => {
    setSelectedAnswer('');
    setTime(gameSession?.timePerQuestionInSec || 0);
    setCurrentQuestionIndex(prevIndex => {
      const nextIndex = prevIndex + 1;
      if (nextIndex < questions.length) {
        setQuestion(questions[nextIndex]);
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
        .eq('id', sessionId)
        .single();

      if (error) {
        console.error('Error fetching game session:', error);
        return false;
      }

      // Check if the admin is the only one in the session
      if (data && data.players && data.players.length === 1) {
        return true;
      }

      return false;
    } catch (error) {
      console.error('Unexpected error fetching game session:', error);
      return false;
    }
  };

  useEffect(() => {
    async function checkIfAdminObserver() {
      const observerStatus = await isAdminObserver();
      setIsObserver(observerStatus);
    }

    checkIfAdminObserver();
  }, [sessionId]);

  const handleNextAdminQuestion = async () => {
    if (!sessionId) return;

    try {
      const { data: session, error: sessionError } = await supabase
        .from('game_sessions')
        .select('question_index')
        .eq('id', sessionId)
        .single();

      if (sessionError) {
        console.error("Error fetching session:", sessionError);
        return;
      }

      const nextIndex = (session?.question_index || 0) + 1;

      if (nextIndex < questions.length) {
        const { error: updateError } = await supabase
          .from('game_sessions')
          .update({ question_index: nextIndex })
          .eq('id', sessionId);

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

  return (
    <div className="flex flex-col items-center min-h-screen py-2 bg-gray-900 text-white">
      <div className="absolute bottom-4 left-4">
        <Button
          variant="outline"
          className="h-10 w-10 p-0 bg-black border-gray-500 text-white rounded-full"
          onClick={() => router.push(isObserver ? '/admin' : '/player')}
        >
          <ArrowLeft
            className="h-6 w-6"
            aria-hidden="true"
          />
        </Button>
      </div>
      <h1 className="text-3xl font-bold mb-4">Game Page</h1>
      {isTimed && question && <TimerDisplay time={time} />}
      {question ? (
        <>
          <QuestionDisplay question={question.questionText} />
          {question.questionType === 'multipleChoice' ? (
            <AnswerInput
              options={question.answers}
              onAnswer={handleAnswer}
              selectedAnswer={selectedAnswer}
              onSubmit={handleSubmitAnswer}
            />
          ) : (
            <div>
              <input
                type="number"
                value={selectedAnswer}
                onChange={(e) => handleAnswer(e.target.value)}
                placeholder="Enter your answer"
              />
              <button onClick={handleSubmitAnswer}>Submit Answer</button>
            </div>
          )}
        </>
      ) : (
        <ResultsDisplay results={results} />
      )}
      {isObserver && (
        <Button onClick={handleNextAdminQuestion}>
          Next Question
        </Button>
      )}
    </div>
  );
}
