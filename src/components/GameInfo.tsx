// src/components/GameInfo.tsx
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Clock } from "lucide-react";

interface GameSession {
  id: string;
  sessionName: string;
  maxPlayers: number;
  questionGroupId: string;
  timePerQuestionInSec: number;
  createdAt: string;
  status: "waiting" | "active" | "finished";
  players: string[];
  question_index: number | null;
}

interface GameInfoProps {
  gameSession: GameSession | null;
  playersCount: number;
  getGroupName: (groupId: string) => string;
}

const GameInfo: React.FC<GameInfoProps> = ({
  gameSession,
  playersCount,
  getGroupName,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Game Session Information</CardTitle>
      </CardHeader>
      <CardContent>
        {gameSession && (
          <>
            <div>
              <strong>Name:</strong> {gameSession.sessionName}
            </div>
            <div>
              <strong>Players:</strong> {playersCount}/{gameSession.maxPlayers}
            </div>
            <div>
              <Clock className="mr-2 h-4 w-4" />{" "}
              {gameSession.timePerQuestionInSec} s
            </div>
            <div>
              <strong>Group:</strong> {getGroupName(gameSession.questionGroupId)}
            </div>
            <div>
              <strong>Status:</strong> {gameSession.status}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default GameInfo;