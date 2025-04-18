// src/components/AdminControls.tsx
import { Button } from "@/components/ui/button";

interface GameSession {
  id: string;
  status: "waiting" | "active" | "finished";
}

interface UserSession {
  type: string | null;
}

interface AdminControlsProps {
  gameSession: GameSession | null;
  sessionData: UserSession | null;
  isLastQuestion: boolean;
  timeExpired: boolean;
  handleStartGame: () => void;
  handleNextQuestion: () => void;
  handleFinishGame: () => void;
}

const AdminControls: React.FC<AdminControlsProps> = ({
  gameSession,
  sessionData,
  isLastQuestion,
  timeExpired,
  handleStartGame,
  handleNextQuestion,
  handleFinishGame,
}) => {
  if (sessionData?.type !== "admin") {
    return null;
  }

  if (gameSession?.status === "waiting") {
    return <Button onClick={handleStartGame}>Start Game</Button>;
  }

  if (gameSession?.status === "active" && timeExpired) {
    return (
      <div>
        {isLastQuestion ? (
          <Button onClick={handleFinishGame}>Finish Game</Button>
        ) : (
          <Button onClick={handleNextQuestion}>Next Question</Button>
        )}
      </div>
    );
  }

  return null;
};

export default AdminControls;