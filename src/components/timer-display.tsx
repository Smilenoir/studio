interface TimerDisplayProps {
  time: number;
}

export const TimerDisplay: React.FC<TimerDisplayProps> = ({time}) => {
  return (
    <div className="text-xl mb-4">
      Time Remaining: {time} seconds
    </div>
  );
};
