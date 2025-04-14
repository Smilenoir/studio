interface QuestionDisplayProps {
  question: string;
}

export const QuestionDisplay: React.FC<QuestionDisplayProps> = ({question}) => {
  return (
    <div className="mb-4">
      <p className="text-lg font-semibold">{question}</p>
    </div>
  );
};
