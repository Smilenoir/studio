// src/components/LeftMenu.tsx
import React from "react";
import {
    Button,
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@radix-ui/react-avatar";
import { Info, Play, Pause, Clock, User, ArrowRight } from "lucide-react";
import PlayerList from "./PlayerList";
import GameInfo from "./GameInfo";
import AdminControls from "./AdminControls";


interface GameSession {
    id: string;
    sessionName: string;
    maxPlayers: number;
    questionGroupId: string;
    timePerQuestionInSec: number;
    createdAt: string;
    status: 'waiting' | 'active' | 'finished';
    players: string[];
    question_index: number | null;
}

interface UserSession {
  nickname: string | null;
  id: string | null;
  type: string | null;
}
interface Player {
    nickname: string;
    id: string;
}

export interface LeftMenuData {
    gameSession: GameSession | null;
    playersInSession: Player[];
    sessionData: UserSession | null;
    playersCount: number;
    getGroupName: (groupId: string) => string;
    isAdmin: boolean;
    isLastQuestion: boolean;
    timeExpired: boolean;
    handleStartGame: () => void;
    handleNextQuestion: () => void;
    handleFinishGame: () => void;
}

interface LeftMenuProps {
    data: LeftMenuData;
}

const LeftMenu: React.FC<LeftMenuProps> = ({ data }) => {
    const { gameSession, playersInSession, sessionData, playersCount, getGroupName, isAdmin, isLastQuestion, timeExpired, handleStartGame, handleNextQuestion, handleFinishGame } = data;
    return (
        <div className="w-64 p-4 flex flex-col">
            {gameSession?.status !== "waiting" && (
                <PlayerList playersInSession={playersInSession} />
            )}
            <GameInfo gameSession={gameSession} playersCount={playersCount} getGroupName={getGroupName} />
            {/* Placeholder for Game Results and Round Results */}
            <div>Game Results</div>
            <div>Round Results</div>
           {isAdmin &&  <AdminControls gameSession={gameSession} sessionData={sessionData} isLastQuestion={isLastQuestion} timeExpired={timeExpired} handleStartGame={handleStartGame} handleNextQuestion={handleNextQuestion} handleFinishGame={handleFinishGame} />}
        </div>
    );
};

export default LeftMenu;