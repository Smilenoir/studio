'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabaseClient";

interface GameSession {
  id: string;
  sessionName: string;
  maxPlayers: number;
  questionGroupId: string;
  timePerQuestionInSec: number;
  createdAt: string;
  status: 'waiting' | 'active' | 'finished';
}

export default function PlayerPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState('');
  const [gameSessions, setGameSessions] = useState<GameSession[]>([]);

  useEffect(() => {
    fetchGameSessions();
  }, []);

  const fetchGameSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('status', 'waiting'); // Fetch only waiting sessions

      if (error) {
        console.error('Error fetching game sessions:', error);
        return;
      }
      setGameSessions(data || []);
    } catch (error) {
      console.error('Unexpected error fetching game sessions:', error);
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen py-2 bg-gray-900 text-white">
      <div className="absolute bottom-4 left-4">
        <Button
          variant="outline"
          className="h-10 w-10 p-0 bg-black border-gray-500 text-white rounded-full"
          onClick={() => router.push('/')}
        >
          <ArrowLeft
            className="h-6 w-6"
            aria-hidden="true"
          />
        </Button>
      </div>
      <h1 className="text-3xl font-bold mb-4">Player Page</h1>

      {/* Nickname Input */}
      <div className="mb-4">
        <Input
          type="text"
          placeholder="Enter your nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
        />
      </div>

      {/* Game Session List */}
      <div className="grid gap-4">
        {gameSessions.map((session) => (
          <Card key={session.id}>
            <CardHeader>
              <CardTitle>{session.sessionName}</CardTitle>
              <CardDescription>
                Players: 0/{session.maxPlayers}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>Time per Question: {session.timePerQuestionInSec === 0 ? '∞' : session.timePerQuestionInSec} seconds</p>
              <Button>Join Game</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
