interface ResultsDisplayProps {
  results: {
    correct: number;
    total: number;
    percentage: number;
  };
}

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({results}) => {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">Results</h2>
      <p>
        Correct Answers: {results.correct} / {results.total}
      </p>
      <p>Percentage: {results.percentage.toFixed(2)}%</p>
    </div>
  );
};
