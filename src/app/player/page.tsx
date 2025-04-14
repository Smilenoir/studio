'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
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
} from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabaseClient";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";

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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [gameSessions, setGameSessions] = useState<GameSession[]>([]);
  const [session, setSession] = useState(null);


  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
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


  async function handleSignUp() {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signUp({
        email,
        password,
      })
      if (error) throw error
      toast({
        title: "Success",
        description: "Check your email for confirmation link."
      })
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.error_description || error.message,
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleSignIn() {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.error_description || error.message,
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleSignOut() {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.error_description || error.message,
      })
    } finally {
      setLoading(false)
    }
  }


  // Dummy player data for demonstration
  const getPlayersInSession = (sessionId: string) => {
    // Replace this with actual logic to fetch player data from your data source
    const players = [
      { id: '1', nickname: 'Player1' },
      { id: '2', nickname: 'Player2' },
      { id: '3', nickname: 'Player3' },
    ];
    return players;
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

      <div className="w-full max-w-md">
        {!session ? (
          <Card className="border">
            <CardHeader>
              <CardTitle>Authentication</CardTitle>
              <CardDescription>Sign in or create an account to join the game.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                />
              </div>
              <Button
                className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg"
                onClick={() => {
                  handleSignIn();
                }}
                disabled={loading}
              >
                Sign In
              </Button>
              <Button
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg"
                onClick={() => {
                  handleSignUp();
                }}
                disabled={loading}
              >
                Sign Up
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border">
            <CardHeader>
              <CardTitle>Welcome!</CardTitle>
              <CardDescription>You are logged in.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg"
                onClick={() => {
                  handleSignOut();
                }}
                disabled={loading}
              >
                Sign Out
              </Button>
            </CardContent>
          </Card>
        )}
      </div>


      {/* Game Session List */}
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
                        {`0/${session.maxPlayers}`}
                      </PopoverTrigger>
                      <PopoverContent className="w-80">
                        <Card>
                          <CardHeader>
                            <CardTitle>Players in Session</CardTitle>
                          </CardHeader>
                          <CardContent>
                            {getPlayersInSession(session.id).map((player) => (
                              <div key={player.id} className="flex items-center space-x-4 py-2">
                                <Avatar>
                                  <AvatarImage src="https://github.com/shadcn.png" />
                                  <AvatarFallback>{player.nickname.substring(0, 2)}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="text-sm font-medium leading-none">{player.nickname}</p>
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
                    <Button size="sm">Join Game</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
