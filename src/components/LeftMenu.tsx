// src/components/LeftMenu.tsx
import React, { useEffect, useState, useMemo } from "react";
import {
    Button,
    Popover,
} from "@/components/ui/button";
import { Info, Play, Pause, Clock, User, ArrowRight } from "lucide-react";
import PlayerList from "./PlayerList";
import GameInfo from "./GameInfo";
import AdminControls from "./AdminControls";
import { supabase } from "@/lib/supabaseClient";


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
    const { gameSession, playersInSession, sessionData, getGroupName, isAdmin, isLastQuestion, timeExpired, handleStartGame, handleNextQuestion, handleFinishGame } = data;
    const [playersInLobbyCount, setPlayersInLobbyCount] = useState(0);


    useEffect(() => {
        const fetchPlayersInLobbyCount = async () => {
            if (!gameSession?.id) return;

            const { data: redisData } = await supabase
                .from("redis")
                .select("value")
                .eq("key", gameSession.id)
                .maybeSingle();

            if (redisData?.value) {
                const players = JSON.parse(redisData.value);
                setPlayersInLobbyCount(Object.keys(players).length);
            } else {
                setPlayersInLobbyCount(0);
            }
        };
        fetchPlayersInLobbyCount();
    }, [gameSession?.id]);

    return (
        <div className="w-64 p-4 flex flex-col">
            {gameSession?.status !== "waiting" && (
                <PlayerList playersInSession={playersInSession} />
            )}
            <GameInfo
                gameSession={gameSession}
                playersInLobbyCount={playersInLobbyCount}
                getGroupName={getGroupName}/>
            {/* Placeholder for Game Results and Round Results */}
            <div>Game Results</div>
            <div>Round Results</div>
           {isAdmin &&  <AdminControls gameSession={gameSession} sessionData={sessionData} isLastQuestion={isLastQuestion} timeExpired={timeExpired} handleStartGame={handleStartGame} handleNextQuestion={handleNextQuestion} handleFinishGame={handleFinishGame} />}
        </div>
    );
};





export default LeftMenu;
