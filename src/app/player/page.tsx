'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabaseClient';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LogOut } from "lucide-react";

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

export default function PlayerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [gameSessions, setGameSessions] = useState<GameSession[]>([]);
  const [session, setSession] = useState<UserSession>({ nickname: null, id: null, type: null });
  const { toast } = useToast();
  const [joinedSessionId, setJoinedSessionId] = useState<string | null>(null);
  const [sessionPlayers, setSessionPlayers] = useState<{ [sessionId: string]: string[] }>({});
  const [playersInLobby, setPlayersInLobby] = useState<string[]>([]);
  const [lobbyGameSession, setLobbyGameSession] = useState<GameSession | null>(null);

  useEffect(() => {
    fetchGameSessions();
    loadSession();
  }, []);

  const fetchSessionPlayers = async (sessionId: string) => {
    const players = await getPlayersInSession(sessionId);
    setSessionPlayers(prev => ({ ...prev, [sessionId]: players }));
  };

  const loadSession = async () => {
    try {
      const storedSession = localStorage.getItem('userSession');
      if (storedSession) {
        const parsedSession = JSON.parse(storedSession);
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', parsedSession.id)
            .single();
        if (error) {
            console.error('Error fetching user data:', error);
            toast({
                description: "Failed to load user session data.",
            })
        }
        setSession({
          nickname: data?.nickname || null,
          id: data?.id || null,
          type: data?.type || null,
        });
      }
    } catch (error) {
      toast({
        description: "Failed to load user session data.",
      })
    }
  }

  const fetchGameSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('game_sessions')
        .select('*');

      if (error) {
        toast({
          title: "Error",
          description: "Failed to fetch game sessions.",
          variant: "destructive"
        });
        return;
      }
        setGameSessions(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Unexpected error fetching game sessions.",
        variant: "destructive"
      });
    }
  };

  const getPlayersInSession = async (sessionId: string): Promise<string[]> => {
    try {
      const { data: redisData } = await supabase
        .from('redis')
        .select('value')
        .eq('key', sessionId)
        .maybeSingle();

      if (!redisData || !redisData.value) return [];

      const players = JSON.parse(redisData.value);
      const playerIds = Object.keys(players);

      const { data: usersData } = await supabase
        .from('users')
        .select('nickname')
        .in('id', playerIds);

      return usersData ? usersData.map(user => user.nickname || '') : [];
    } catch (error) {
      console.error('Error fetching players:', error);
      return [];
    }
  };

    const joinGame = async (sessionId: string) => {
        if (!session.id) {
            toast({title: "Error", description: "You must sign in to join a game.", variant: "destructive"});
            return;
        }

        try {
            // Get game session from the game_sessions table
            const {data: gameSession, error: gameSessionError} = await supabase
                .from('game_sessions')
                .select('*')
                .eq('id', sessionId)
                .single();

            if (gameSessionError) {
                toast({title: "Error", description: "Game session not found.", variant: "destructive"});
                return;
            }

            // Get existing data from Redis
            const redisKey = sessionId;
            const {data: redisData, error: redisError} = await supabase
                .from('redis')
                .select('value')
                .eq('key', redisKey)
                .maybeSingle();

            let updatedPlayers = { [session.id]: 0 };
            if (redisData) {
                updatedPlayers = { ...JSON.parse(redisData.value), [session.id]: 0 };
            }

            // Upsert the updated players to Redis
            const {error: updateError} = await supabase
                .from('redis')
                .upsert({key: redisKey, value: JSON.stringify(updatedPlayers)}, {onConflict: 'key'})
                .select();

            if (updateError) {
                console.error('Error joining game:', updateError);
                toast({
                    title: "Error",
                    description: "Failed to join game.",
                    variant: "destructive"
                });
                return;
            }

            // Set joined session ID and game session
            setJoinedSessionId(sessionId);
            setLobbyGameSession(gameSession);
            toast({title: "Success", description: "Successfully joined the game!"});

            // Fetch usernames for the lobby
            fetchLobbyUsernames(sessionId);
            await fetchGameSessions();

            router.push(`/game/${sessionId}`);

            // Subscribe to Redis changes
            const channel = supabase.channel('redis-changes')
                .on('postgres_changes',
                    {event: '*', schema: 'public', table: 'redis', filter: `key=eq.${redisKey}`},
                    () => fetchLobbyUsernames(sessionId)
                )
                .subscribe();

            return () => {
                channel.unsubscribe();
            };
        } catch (error: any) {
            toast({title: "Error", description: error.message, variant: "destructive"});
        }
    };

  const fetchLobbyUsernames = async (sessionId: string) => {
    const { data: redisData } = await supabase
      .from('redis')
      .select('value')
      .eq('key', sessionId)
      .maybeSingle();

    if (redisData?.value) {
      const players = JSON.parse(redisData.value);
      const playerIds = Object.keys(players);

      const { data: usersData } = await supabase
        .from('users')
        .select('nickname')
        .in('id', playerIds);

      setPlayersInLobby(usersData?.map(user => user.nickname) || []);
    }
  };

  const leaveLobby = async () => {
    if (!joinedSessionId || !session.id) return;

    try {
      const { data: redisData } = await supabase
        .from('redis')
        .select('value')
        .eq('key', joinedSessionId)
        .single();

      if (redisData?.value) {
        const gameData = JSON.parse(redisData.value);
        delete gameData[session.id];

        await supabase
          .from('redis')
          .update({ value: JSON.stringify(gameData) })
          .eq('key', joinedSessionId);
      }

      setJoinedSessionId(null);
      setLobbyGameSession(null);
      toast({ title: "Success", description: "Left the lobby successfully!" });
      router.push('/player')
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  useEffect(() => {
    const checkGameStatus = async () => {
      if (joinedSessionId && session.id) {
        const { data: gameSession } = await supabase
          .from('game_sessions')
          .select('status')
          .eq('id', joinedSessionId)
          .single();

        if (gameSession?.status === 'active') {
          router.push(`/game/${joinedSessionId}`);
        }
      }
    };

    const intervalId = setInterval(checkGameStatus, 5000);
    return () => clearInterval(intervalId);
  }, [joinedSessionId, session.id, router]);

  return (
    <div className="flex flex-col items-center min-h-screen py-2 bg-gray-900 text-white">
      <div className="absolute bottom-4 left-4">
        <Button
          variant="outline"
          className="h-10 w-10 p-0 bg-black border-gray-500 text-white rounded-full"
          onClick={() => router.push('/')}
        >
          <ArrowLeft className="h-6 w-6" aria-hidden="true" />
        </Button>
      </div>
      <div className="absolute bottom-4 right-4">
          {session.nickname && (
              <Button
                  variant="outline"
                  className="h-10 w-10 p-0 text-white rounded-full"
                  onClick={() => {
                      localStorage.removeItem('userSession');
                      router.push('/');
                  }}
                  disabled={loading}
              >
                  <LogOut
                      className="h-6 w-6"
                      aria-hidden="true"
                  />
              </Button>
          )}
      </div>

      <h1 className="text-3xl font-bold mb-4">Player Page</h1>

      {joinedSessionId ? (
        <div className="container mx-auto max-w-4xl mt-8">
          <h2 className="text-2xl font-semibold mb-4">Waiting for Game to Start</h2>
          {lobbyGameSession && (
            <Card className="border mb-4">
              <CardHeader>
                <CardTitle>{lobbyGameSession.sessionName}</CardTitle>
                <CardDescription>
                  {playersInLobby.length}/{lobbyGameSession.maxPlayers} Players | 
                  Time per Question: {lobbyGameSession.timePerQuestionInSec || '∞'}s
                </CardDescription>
              </CardHeader>
            </Card>
          )}
          <Card className="border">
            <CardHeader>
              <CardTitle>Players in Lobby</CardTitle>
              <CardDescription>Waiting for the game to start...</CardDescription>
            </CardHeader>
            <CardContent>
              {playersInLobby.map((player) => (
                <div key={player} className="flex items-center space-x-4 py-2">
                  <Avatar>
                    <AvatarImage src="https://github.com/shadcn.png" />
                    <AvatarFallback>{player?.substring(0, 2)}</AvatarFallback>
                  </Avatar>
                  <p className="text-sm font-medium leading-none">{player}</p>
                </div>
              ))}
              <Button onClick={leaveLobby}>Leave Lobby</Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="container mx-auto max-w-4xl mt-8">
          <h2 className="text-2xl font-semibold mb-4">Available Game Sessions</h2>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Session Name</TableHead>
                  <TableHead>Players</TableHead>
                  <TableHead>Time per Question</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gameSessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell className="font-medium">{session.sessionName}</TableCell>
                    <TableCell>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="link">
                            {`${sessionPlayers[session.id]?.length || 0}/${session.maxPlayers}`}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                          <Card>
                            <CardHeader>
                              <CardTitle>Players in Session</CardTitle>
                            </CardHeader>
                            <CardContent>
                              {(sessionPlayers[session.id] || []).map((player) => (
                                <div key={player} className="flex items-center space-x-4 py-2">
                                  <Avatar>
                                    <AvatarImage src="https://github.com/shadcn.png" />
                                    <AvatarFallback>{player?.substring(0, 2)}</AvatarFallback>
                                  </Avatar>
                                  <p className="text-sm font-medium leading-none">{player}</p>
                                </div>
                              ))}
                            </CardContent>
                          </Card>
                        </PopoverContent>
                      </Popover>
                    </TableCell>
                    <TableCell>
                      {session.timePerQuestionInSec || '∞'} seconds
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        size="sm" 
                        onClick={() => joinGame(session.id)}
                        disabled={session.status !== "waiting"}
                      >
                        {session.status === "waiting" ? "Join Game" : "Game in progress"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}

