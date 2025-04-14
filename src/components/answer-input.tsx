interface AnswerInputProps {
  options: string[];
  onAnswer: (answer: string) => void;
  selectedAnswer: string;
  onSubmit: () => void;
}

export const AnswerInput: React.FC<AnswerInputProps> = ({
  options,
  onAnswer,
  selectedAnswer,
  onSubmit,
}) => {
  return (
    <div>
      {options.map(option => (
        <button
          key={option}
          className={`w-full py-2 px-4 rounded-lg text-white font-bold ${
            selectedAnswer === option
              ? 'bg-blue-700'
              : 'bg-blue-500 hover:bg-blue-700'
          } mb-2`}
          onClick={() => onAnswer(option)}
        >
          {option}
        </button>
      ))}
      <button
        className="w-full bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg"
        onClick={onSubmit}
      >
        Submit Answer
      </button>
    </div>
  );
};
