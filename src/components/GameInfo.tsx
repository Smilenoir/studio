// src/components/GameInfo.tsx
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import { Clock, Info } from "lucide-react";

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
  playersInLobbyCount: number;
  getGroupName: (groupId: string) => string;
}

const GameInfo: React.FC<GameInfoProps> = ({
  gameSession,
  playersInLobbyCount,
    getGroupName,
}) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button >
          <Info className="mr-2 h-4 w-4" />
          Game Info
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
          {gameSession && (
              <>
                  <div>
                      <strong>Name:</strong> {gameSession.sessionName}
                  </div>
                  <div>
                      <strong>Players:</strong> {playersInLobbyCount}/{gameSession.maxPlayers}
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
      </PopoverContent>
    </Popover>
  );
};

export default GameInfo;
