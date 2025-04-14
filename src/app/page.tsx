'use client'
import {QuestionDisplay} from '@/components/question-display';
import {AnswerInput} from '@/components/answer-input';
import {TimerDisplay} from '@/components/timer-display';
import {FunFactGenerator} from '@/components/fun-fact-generator';
import {ResultsDisplay} from '@/components/results-display';
import {Card} from '@/components/ui/card';
import {useEffect, useState} from 'react';

interface Question {
  id: number;
  text: string;
  options: string[];
  correctAnswer: string;
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

export default function Home() {
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

  const currentQuestion = questions[currentQuestionIndex];

  useEffect(() => {
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
      <h1 className="text-3xl font-bold mb-4">QuizWhiz</h1>
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

    