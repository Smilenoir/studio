'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, LogOut } from "lucide-react";
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
// import { generateId } from "@/lib/utils";

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
}


export default function PlayerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [gameSessions, setGameSessions] = useState<GameSession[]>([]);
  const [session, setSession] = useState<UserSession>({ nickname: null, id: null });
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertTitle, setAlertTitle] = useState<string | null>(null);
  const [alertDescription, setAlertDescription] = useState<string | null>(null);
  const { toast } = useToast();
  const [joinedSessionId, setJoinedSessionId] = useState<string | null>(null);
  const [playersInLobby, setPlayersInLobby] = useState<string[]>([]);
  const [lobbyGameSession, setLobbyGameSession] = useState<GameSession | null>(null); // Add game session for the lobby

  useEffect(() => {
    fetchGameSessions();
    loadSession();
  }, []);


  const loadSession = async () => {
    // Load session from local storage
    const storedSession = localStorage.getItem('userSession');
    if (storedSession) {
      setSession(JSON.parse(storedSession));
    }
  }


  const fetchGameSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('game_sessions')
        .select('*');

      if (error) {
        console.error('Error fetching game sessions:', error);
        toast({
          title: "Error",
          description: "Failed to fetch game sessions.",
          variant: "destructive"
        });
        return;
      }
      setGameSessions(data || []);
    } catch (error) {
      console.error('Unexpected error fetching game sessions:', error);
      toast({
        title: "Error",
        description: "Unexpected error fetching game sessions.",
        variant: "destructive"
      });
    }
  };


  

  const joinGame = async (sessionId: string) => {
    if (!session.id) {
      toast({
        title: "Error",
        description: "You must sign in to join a game.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data: gameSession, error: gameSessionError } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (gameSessionError) {
        console.error('Error fetching game session:', gameSessionError);
        toast({
          title: "Error",
          description: "Failed to join game.",
          variant: "destructive"
        });
        return;
      }

      if (!gameSession) {
        toast({
          title: "Error",
          description: "Game session not found.",
          variant: "destructive"
        });
        return;
      }

      // Initialize player scores in Redis
      const redisKey = sessionId;
      const playerInfo = { [session.id]: 0 };

      // Try to get existing data from Redis
      const { data: redisData, error: redisError } = await supabase
        .from('redis')
        .select('value')
        .eq('key', redisKey)
        .maybeSingle();

      if (redisError) {
        console.error('Error fetching Redis data:', redisError);
        toast({
          title: "Error",
          description: "Failed to join game.",
          variant: "destructive"
        });
        return;
      }

      let updatedPlayers;
      if (redisData) {
        // Append new player to existing players
        try {
          const existingPlayers = JSON.parse(redisData.value);
          updatedPlayers = { ...existingPlayers, [session.id]: 0 };
        } catch (parseError) {
          console.error('Error parsing existing Redis data:', parseError);
          toast({
            title: "Error",
            description: "Failed to join game.",
            variant: "destructive"
          });
          return;
        }
      } else {
        // If no data exists, create new entry with the player
        updatedPlayers = playerInfo;
      }

      // Update Redis with the new player data
      const { error: updateError } = await supabase
        .from('redis')
        .upsert({ key: redisKey, value: JSON.stringify(updatedPlayers) }, { onConflict: 'key' });

      if (updateError) {
        console.error('Error updating Redis:', updateError);
        toast({
          title: "Error",
          description: "Failed to join game.",
          variant: "destructive"
        });
        return;
      }

      setJoinedSessionId(sessionId);
      setLobbyGameSession(gameSession); // Store game session in state

       // Redirect to the game session page
       router.push(`/game/${sessionId}`);

      toast({
        title: "Success",
        description: "Successfully joined the game!",
      });

      // Fetch usernames for the lobby
      fetchLobbyUsernames(sessionId);
      await fetchGameSessions();

       // Subscribe to changes in the Redis data
       supabase
       .channel('redis-changes')
       .on(
         'postgres_changes',
         { event: '*', schema: 'public', table: 'redis', filter: `key=eq.${redisKey}` },
         payload => {
           console.log('Change received!', payload)
           fetchLobbyUsernames(sessionId);
         }
       )
       .subscribe()


    } catch (error: any) {
      let errorMessage = "Unexpected error joining game.";
      if (error.message) {
        errorMessage = error.message;
      } else if (error.error?.message) {
        errorMessage = error.error.message;
      } else if (error.data?.message) {
        errorMessage = error.data.message;
      }
      console.error('Unexpected error joining game:', error);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      })
    }
  };

  const fetchLobbyUsernames = async (sessionId: string) => {
        const { data: redisData, error: redisError } = await supabase
          .from('redis')
          .select('value')
          .eq('key', sessionId)
          .maybeSingle();

        if (redisError) {
          console.error('Error fetching Redis data:', redisError);
          toast({
            title: "Error",
            description: "Failed to fetch lobby players.",
            variant: "destructive"
          });
          return;
        }

        if (redisData && redisData.value) {
          try {
            const players = JSON.parse(redisData.value);
            const playerIds = Object.keys(players);
            const { data: usersData, error: usersError } = await supabase
              .from('users')
              .select('nickname')
              .in('id', playerIds);

            if (usersError) {
              console.error('Error fetching usernames:', usersError);
              toast({
                title: "Error",
                description: "Failed to fetch usernames.",
                variant: "destructive"
              });
              return;
            }

            if (usersData) {
              const usernames = usersData.map(user => user.nickname);
              setPlayersInLobby(usernames);
            }
          } catch (parseError) {
            console.error('Error parsing Redis data:', parseError);
            toast({
              title: "Error",
              description: "Failed to parse lobby players data.",
              variant: "destructive"
            });
            return;
          }
        }
      };

      const leaveLobby = async () => {
        const gameId = joinedSessionId;
        const { id: userId, nickname: userNickname } = session;

        if (!userId || !gameId) {
            toast({
                title: "Error",
                description: "Cannot leave lobby: Missing game or user information.",
                variant: "destructive",
            });
            return;
        }

        // Remove player from the local state
        setPlayersInLobby(prevPlayers => prevPlayers.filter(player => player !== userNickname));

        try {
            // 1. Fetch current game data from Redis
            const { data: redisData, error: fetchError } = await supabase
                .from('redis')
                .select('value')
                .eq('key', gameId)
                .single();

            if (fetchError) {
                console.error('Error fetching game data from Redis:', fetchError);
                toast({
                    title: "Error",
                    description: "Failed to leave lobby (fetch game data).",
                    variant: "destructive",
                });
                return;
            }

            // 2. Parse JSON
            let gameData;
            try {
                gameData = JSON.parse(redisData.value);
            } catch (parseError) {
                console.error('Error parsing game data from Redis:', parseError);
                toast({
                    title: "Error",
                    description: "Failed to leave lobby (parse game data).",
                    variant: "destructive",
                });
                return;
            }

            // 3. Remove the player (assuming gameData is an object with player IDs as keys)
            if (gameData && gameData[userId]) {
              delete gameData[userId];
            }

            // 4. Stringify updated game data
            const updatedGameData = JSON.stringify(gameData);

            // 5. Update Redis with new data
            const { error: updateError } = await supabase
                .from('redis')
                .update({ value: updatedGameData })
                .eq('key', gameId);

            if (updateError) {
                console.error('Error updating game data in Redis:', updateError);
                toast({
                    title: "Error",
                    description: "Failed to leave lobby (update game data).",
                    variant: "destructive",
                });
                return;
            }

            // Clear local states
            setJoinedSessionId(null);
            setLobbyGameSession(null);
            toast({
              title: "Success",
              description: "Left the lobby successfully!",
            });
           
             // Unsubscribe from changes
            const channel = supabase.channel('redis-changes');
            if (!channel) {
              console.warn('Channel "redis-changes" does not exist. Skipping unsubscribe.');
              return; // Exit early if the channel is not found
            }

            // Unsubscribe from changes
            supabase.removeChannel(channel)
            
             // Redirect
            router.push('/');

        } catch (error: any) {
            console.error('Unexpected error leaving lobby:', error);
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        }
    };


  useEffect(() => {
    const checkGameStatus = async () => {
      if (joinedSessionId && session.id) {
        const { data: gameSession, error: gameSessionError } = await supabase
          .from('game_sessions')
          .select('status')
          .eq('id', joinedSessionId)
          .single();

        if (gameSessionError) {
          console.error('Error fetching game session status:', gameSessionError);
          return;
        }

        if (gameSession && gameSession.status === 'active') {
          // Redirect the player to the game page
          router.push(`/game/${joinedSessionId}`);
        }
      }
    };

    // Check the game status every 5 seconds
    const intervalId = setInterval(checkGameStatus, 5000);

    // Clean up the interval when the component unmounts or the session changes
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
          <ArrowLeft
            className="h-6 w-6"
            aria-hidden="true"
          />
        </Button>
      </div>

      <h1 className="text-3xl font-bold mb-4">Player Page</h1>

      {joinedSessionId ? (
        // Lobby screen
        <div className="container mx-auto max-w-4xl mt-8">
          <h2 className="text-2xl font-semibold mb-4">Waiting for Game to Start</h2>
          {lobbyGameSession && (
            <Card className="border mb-4">
              <CardHeader>
                <CardTitle>{lobbyGameSession.sessionName}</CardTitle>
                <CardDescription>
                  {getPlayersInSession(joinedSessionId).length}/{lobbyGameSession.maxPlayers} Players | Time per Question: {lobbyGameSession.timePerQuestionInSec === 0 ? '∞' : `${lobbyGameSession.timePerQuestionInSec} seconds`}
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
              {/* Display list of players in the session */}
              {playersInLobby.map((player) => (
                <div key={player} className="flex items-center space-x-4 py-2">
                  <Avatar>
                    <AvatarImage src="https://github.com/shadcn.png" />
                    <AvatarFallback>{player.substring(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium leading-none">{player}</p>
                  </div>
                </div>
              ))}
              <Button onClick={leaveLobby}>Leave Lobby</Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        // Game Session List
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
                        <PopoverTrigger>
                          {`${getPlayersInSession(session.id).length}/${session.maxPlayers}`}
                        </PopoverTrigger> 
                        <PopoverContent className="w-80">
                          <Card>
                            <CardHeader>
                              <CardTitle>Players in Session</CardTitle>
                            </CardHeader>
                            <CardContent>
                              {getPlayersInSession(session.id).map((player) => (
                                <div key={player} className="flex items-center space-x-4 py-2">
                                  <Avatar>
                                    <AvatarImage src="https://github.com/shadcn.png" />
                                    <AvatarFallback>{player.substring(0, 2)}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="text-sm font-medium leading-none">{player}</p>
                                  </div>
                                </div>
                              ))}
                            </CardContent>
                          </Card>
                        </PopoverContent>
                      </Popover>
                    </TableCell>
                    <TableCell>{session.timePerQuestionInSec === 0 ? '∞' : `${session.timePerQuestionInSec} seconds`}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" onClick={() => joinGame(session.id)} >
                        {session.status == "waiting" ? "Join Game" : "Game in progress"}
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

