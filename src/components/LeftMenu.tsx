// src/components/LeftMenu.tsx
import React, { useEffect, useState, useMemo } from "react";
import {
    Button
} from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Info, Play, Pause, Clock, User, ArrowRight } from "lucide-react";
import PlayerList from "./PlayerList";
import GameInfo from "./GameInfo";
import AdminControls from "./AdminControls";
import { supabase } from "@/lib/supabaseClient";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";


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
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline">
                        Players in Session
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                    <Card>
                        <CardHeader>
                            <CardTitle>Players in Session</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4">
                            {playersInSession.map((player) => (
                                <div key={player.id} className="flex items-center space-x-4">
                                    <Avatar>
                                        <AvatarImage
                                            src={`https://api.dicebear.com/7.x/bottts/svg?seed=${player.nickname}`}
                                            alt={player.nickname}
                                        />
                                        <AvatarFallback>{player.nickname.substring(0, 2)}</AvatarFallback>
                                    </Avatar>
                                    <div className="text-sm">
                                        {" "}
                                        <p className="font-medium leading-none">{player.nickname}</p>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </PopoverContent>
            </Popover>


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

