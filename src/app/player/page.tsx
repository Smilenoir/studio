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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

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
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [gameSessions, setGameSessions] = useState<GameSession[]>([]);
  const [session, setSession] = useState(null);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertDescription, setAlertDescription] = useState('');


  useEffect(() => {
    // supabase.auth.getSession().then(({ data: { session } }) => {
    //   setSession(session)
    // })

    // supabase.auth.onAuthStateChange((_event, session) => {
    //   setSession(session)
    // })
    fetchGameSessions();
    loadSession();
  }, []);


  const loadSession = async () => {
    const currentSession = await supabase.auth.getSession();
    setSession(currentSession.data.session);
  }


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
      setLoading(true);

      // Check if nickname already exists
      const { data: existingUser, error: selectError } = await supabase
        .from('users')
        .select('*')
        .eq('nickname', nickname)
        .maybeSingle();

      if (selectError) {
        throw selectError;
      }

      if (existingUser) {
        setAlertTitle("Error");
        setAlertDescription("Nickname already exists. Please choose a different one.");
        setAlertOpen(true);
        return;
      }

      // const saltRounds = 10;
      // const hashedPassword = await bcrypt.hash(password, saltRounds);

      const { error: insertError } = await supabase
        .from('users')
        .insert({ nickname, password })
        .select();

      if (insertError) {
        throw insertError;
      }

      setAlertTitle("Success");
      setAlertDescription('Account created successfully. You can now sign in.');
      setAlertOpen(true);

      // Automatically sign in the user after successful registration
      await handleSignIn();


    } catch (error) {
       setAlertTitle("Error");
       setAlertDescription(error.error_description || error.message);
       setAlertOpen(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleSignIn() {
    try {
      setLoading(true)
      // Find the user by nickname
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('nickname', nickname)
        .maybeSingle();

      if (userError) throw userError;

      if (!user) {
        setAlertTitle("Error");
        setAlertDescription("User not found");
        setAlertOpen(true);
        return;
      }

      // Compare the entered password with the hashed password
      // const isPasswordCorrect = await bcrypt.compare(password, user.password);
      // if (!isPasswordCorrect) {
      //   setAlertTitle("Error");
      //   setAlertDescription("Invalid credentials");
      //   setAlertOpen(true);
      //   return;
      // }

      if (password !== user.password){
          setAlertTitle("Error");
          setAlertDescription("Invalid credentials");
          setAlertOpen(true);
          return;
      }


      const { data, error } = await supabase.auth.signInWithPassword({
        email: user.nickname + '@example.com',
        password: password,
      })

      if (error) {
         setAlertTitle("Error");
         setAlertDescription(error.error_description || error.message);
         setAlertOpen(true);
        return;
      }


      setAlertTitle("Success");
      setAlertDescription("Signed in successfully!");
      setAlertOpen(true);

      await loadSession();

    } catch (error: any) {
        setAlertTitle("Error");
        setAlertDescription(error.error_description || error.message);
        setAlertOpen(true);

    } finally {
      setLoading(false)
    }
  }

  async function handleSignOut() {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setSession(null);
    } catch (error: any) {
        setAlertTitle("Error");
        setAlertDescription(error.error_description || error.message);
        setAlertOpen(true);
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
              <CardDescription>Sign in or create an account to join the game.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-2">
                  <Label htmlFor="nickname">Nickname</Label>
                  <Input
                    type="text"
                    id="nickname"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="Enter your nickname"
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
              </div>
              <div className="flex justify-between">
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
                  Create
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border">
            <CardHeader>
              <CardTitle>Welcome!</CardTitle>
              <CardDescription>Hello, {session?.user?.user_metadata?.nickname}! GL HF!</CardDescription>
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

         <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{alertTitle}</AlertDialogTitle>
                <AlertDialogDescription>
                  {alertDescription}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogAction onClick={() => setAlertOpen(false)}>OK</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>



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

