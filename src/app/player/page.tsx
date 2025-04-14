'use client'
import {QuestionDisplay} from '@/components/question-display';
import {AnswerInput} from '@/components/answer-input';
import {TimerDisplay} from '@/components/timer-display';
import {FunFactGenerator} from '@/components/fun-fact-generator';
import {ResultsDisplay} from '@/components/results-display';
import {Card} from '@/components/ui/card';
import {useEffect, useState} from 'react';
import {supabase} from "@/lib/supabaseClient";
import {useToast} from "@/hooks/use-toast";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";

interface Question {
  id: number;
  text: string;
  options: string[];
  correctAnswer: string;
}

interface GameSession {
    id: string;
    sessionName: string;
    maxPlayers: number;
    questionGroupId: string;
    timePerQuestionInSec: number;
    createdAt: string;
    status: 'waiting' | 'active' | 'finished';
}

const questions: Question[] = [
  {
    id: 1,
    text: 'What is the capital of France?',
    options: ['London', 'Paris', 'Berlin', 'Rome'],
    correctAnswer: 'Paris',
  },
  {
    id: 2,
    text: 'What is the highest mountain in the world?',
    options: ['K2', 'Kangchenjunga', 'Lhotse', 'Mount Everest'],
    correctAnswer: 'Mount Everest',
  },
  {
    id: 3,
    text: 'What is the capital of Australia?',
    options: ['Sydney', 'Melbourne', 'Canberra', 'Perth'],
    correctAnswer: 'Canberra',
  },
];

const getRandomNickname = () => {
    const adjectives = ['Funny', 'Silly', 'Crazy', 'Happy', 'Brave'];
    const nouns = ['Whiz', 'Wizard', 'Champ', 'Ace', 'Pro'];
    const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    return `${randomAdjective} ${randomNoun}`;
};

export default function PlayerPage() {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<string[]>(
    Array(questions.length).fill('')
  );
  const [quizFinished, setQuizFinished] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [results, setResults] = useState<{
    correct: number;
    total: number;
    percentage: number;
  }>({correct: 0, total: 0, percentage: 0});

    const [sessions, setSessions] = useState<GameSession[]>([]);
    const [nickname, setNickname] = useState(getRandomNickname());

    const {toast} = useToast();

  const currentQuestion = questions[currentQuestionIndex];

  useEffect(() => {
      fetchSessions();
    if (timeRemaining > 0 && !quizFinished) {
      const timerId = setTimeout(() => {
        setTimeRemaining(timeRemaining - 1);
      }, 1000);
      return () => clearTimeout(timerId);
    } else if (!quizFinished) {
      handleAnswer(''); // Submit empty answer if time runs out
      nextQuestion();
    }
  }, [timeRemaining, quizFinished]);

    const fetchSessions = async () => {
        try {
            const {data, error} = await supabase
                .from('game_sessions')
                .select('*');
            if (error) {
                console.error('Error fetching game sessions:', JSON.stringify(error));
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Failed to fetch game sessions."
                })
                return;
            }
            setSessions(data || []);
        } catch (error) {
            console.error('Unexpected error fetching game sessions:', JSON.stringify(error));
            toast({
                variant: "destructive",
                title: "Error",
                description: "Unexpected error fetching game sessions."
            })
        }
    };

  const handleAnswer = (answer: string) => {
    const newAnswers = [...userAnswers];
    newAnswers[currentQuestionIndex] = answer;
    setUserAnswers(newAnswers);
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setTimeRemaining(30); // Reset timer
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = () => {
    setQuizFinished(true);
    calculateResults();
  };

  const calculateResults = () => {
    let correctAnswers = 0;
    questions.forEach((question, index) => {
      if (question.correctAnswer === userAnswers[index]) {
        correctAnswers++;
      }
    });
    const totalQuestions = questions.length;
    const percentage = (correctAnswers / totalQuestions) * 100;
    setResults({
      correct: correctAnswers,
      total: totalQuestions,
      percentage: percentage,
    });
  };

  const handleRestart = () => {
    setCurrentQuestionIndex(0);
    setUserAnswers(Array(questions.length).fill(''));
    setQuizFinished(false);
    setTimeRemaining(30);
    setResults({correct: 0, total: 0, percentage: 0});
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2 bg-gray-900 text-white">
      <h1 className="text-3xl font-bold mb-4">QuizWhiz - Player</h1>

        <div className="mb-4">
            <Label htmlFor="nickname">Nickname:</Label>
            <Input
                type="text"
                id="nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="text-black"
            />
        </div>

        <h2 className="text-xl font-semibold mb-2">Available Game Sessions</h2>
        {sessions.length === 0 ? (
            <div>No sessions available.</div>
        ) : (
            <ul className="list-disc pl-5">
                {sessions.map(session => (
                    <li key={session.id} className="mb-2">
                        {session.sessionName} (Max Players: {session.maxPlayers})
                        <Button className="ml-2">Join</Button>
                    </li>
                ))}
            </ul>
        )}
      <Card className="w-full max-w-md p-4 rounded-lg shadow-md bg-gray-800">
        {!quizFinished ? (
          <>
            <TimerDisplay time={timeRemaining} />
            <QuestionDisplay question={currentQuestion.text} />
            <AnswerInput
              options={currentQuestion.options}
              onAnswer={handleAnswer}
              selectedAnswer={userAnswers[currentQuestionIndex]}
              onSubmit={nextQuestion}
            />
          </>
        ) : (
          <>
            <ResultsDisplay results={results} />
            <FunFactGenerator topics={questions.map(q => q.text)} />
            <button
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mt-4"
              onClick={handleRestart}
            >
              Restart Quiz
            </button>
          </>
        )}
      </Card>
    </div>
  );
}

