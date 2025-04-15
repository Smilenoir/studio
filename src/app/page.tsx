'use client'
import {Button} from '@/components/ui/button';
import {useRouter} from 'next/navigation';
import { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabaseClient';
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { LogOut } from "lucide-react";

interface UserSession {
  nickname: string | null;
  id: string | null;
  type: string | null;
}

export default function Home() {
  const router = useRouter();
    const [nickname, setNickname] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [session, setSession] = useState<UserSession>({nickname: null, id: null, type: null});
    const [alertOpen, setAlertOpen] = useState(false);
    const [alertTitle, setAlertTitle] = useState<string | null>(null);
    const [alertDescription, setAlertDescription] = useState<string | null>(null);
    const {toast} = useToast();
    const [userType, setUserType] = useState<string | null>(null);


  useEffect(() => {
    loadSession();
  }, []);

  const loadSession = async () => {
    // Load session from local storage
    const storedSession = localStorage.getItem('userSession');
    if (storedSession) {
      setSession(JSON.parse(storedSession));
    }
  }

    const saveSession = async (userSession: UserSession) => {
        // Save session to local storage
        localStorage.setItem('userSession', JSON.stringify(userSession));
    }

    const clearSession = async () => {
        // Remove session from local storage
        localStorage.removeItem('userSession');
    }

    async function handleSignUp() {
        try {
            setLoading(true);

            if (!password) {
                setAlertOpen(true);
                setAlertTitle('Error');
                setAlertDescription("Password cannot be empty. Please enter a password.");
                toast({
                    title: "Error",
                    description: "Password cannot be empty. Please enter a password.",
                    variant: "destructive"
                });
                return;
            }

            // Check if nickname already exists
            const {data: existingUser, error: selectError} = await supabase
                .from('users')
                .select('*')
                .eq('nickname', nickname)
                .maybeSingle();

            if (selectError) {
                setAlertOpen(true);
                setAlertTitle('Error');
                setAlertDescription("Nickname already exists. Please choose a different one.");
                toast({
                    title: "Error",
                    description: "Nickname already exists. Please choose a different one.",
                    variant: "destructive"
                });
                return;
            }

            if (existingUser) {
                setAlertOpen(true);
                setAlertTitle('Error');
                setAlertDescription("Nickname already exists. Please choose a different one.");
                toast({
                    title: "Error",
                    description: "Nickname already exists. Please choose a different one.",
                    variant: "destructive"
                });
                return;
            }

            const {error: insertError, data: newUser} = await supabase
                .from('users')
                .insert({nickname, password, created_at: new Date().toISOString(), type: 'player'})
                .select();

            if (insertError) {
                setAlertOpen(true);
                setAlertTitle('Error');
                setAlertDescription(insertError.message);

                toast({
                    title: "Error",
                    description: insertError.message,
                    variant: "destructive"
                });
                return;
            }

            toast({
                title: "Success",
                description: "User created successfully!"
            });

            setAlertOpen(true);
            setAlertTitle('Success');
            setAlertDescription('User created successfully!');

            // Clear input fields
            setNickname('');
            setPassword('');

            //setUserType(newUser[0].type);

        } catch (error: any) {
            setAlertOpen(true);
            setAlertTitle('Error');
            setAlertDescription(error.error_description || error.message);
            toast({
                title: "Error",
                description: error.error_description || error.message,
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    }

    async function handleSignIn() {
        try {
            setLoading(true)
            // Find the user by nickname
            const {data: user, error: userError} = await supabase
                .from('users')
                .select('*')
                .eq('nickname', nickname)
                .maybeSingle();

            if (userError) {
                setAlertOpen(true);
                setAlertTitle('Error');
                setAlertDescription(userError.message);

                toast({
                    title: "Error",
                    description: userError.message,
                    variant: "destructive"
                });
                return;
            }

            if (!user) {
                setAlertOpen(true);
                setAlertTitle('Error');
                setAlertDescription('Invalid credentials');

                toast({
                    title: "Error",
                    description: "User not found",
                    variant: "destructive"
                });
                return;
            }


            if (password !== user.password) {
                setAlertOpen(true);
                setAlertTitle('Error');
                setAlertDescription('Invalid credentials');
                toast({
                    title: "Error",
                    description: "Invalid credentials",
                    variant: "destructive"
                });
                return;
            }

            const userSession: UserSession = {
                nickname: user.nickname,
                id: user.id,
                type: user.type,
            };

            setSession(userSession);
            await saveSession(userSession);

            toast({
                title: "Success",
                description: "Signed in successfully!"
            });

            setAlertOpen(true);
            setAlertTitle('Success');
            setAlertDescription('Signed in successfully!');

        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive"
            });

        } finally {
            setLoading(false)
        }
    }

    async function handleSignOut() {
        try {
            setLoading(true)
            await clearSession();
            setSession({nickname: null, id: null, type: null});
            toast({
                title: "Success",
                description: "Signed out successfully!"
            });
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.error_description || error.message,
                variant: "destructive"
            });
        } finally {
            setLoading(false)
        }
    }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2 bg-gray-900 text-white">
          {session.nickname && (
              <div className="absolute bottom-4 right-4">
                  <Button
                      variant="outline"
                      className="h-10 w-10 p-0 text-white rounded-full"
                      onClick={() => {
                          handleSignOut();
                      }}
                      disabled={loading}
                  >
                      <LogOut
                          className="h-6 w-6"
                          aria-hidden="true"
                      />
                  </Button>
              </div>
          )}
      <h1 className="text-3xl font-bold mb-4">QuizWhiz</h1>
        {!session.nickname ? (
          <div className="w-full max-w-md">
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
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSignIn();
                        }
                      }}
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
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSignIn();
                        }
                      }}
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
          </div>
        ) : (
            <div className="w-full max-w-md">
              <Card className="border">
                <CardHeader className="flex justify-between">
                  <CardTitle>Welcome!</CardTitle>
                </CardHeader>
                <CardDescription>
                  Hello, {session?.nickname}! GL HF!
                </CardDescription>
              </Card>
            </div>
        )}

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

      <div className="flex space-x-4 mt-4">
          {session?.type === 'admin' && (
              <Button onClick={() => router.push('/admin')}>Admin</Button>
          )}
          {session?.type === 'player' && (
              <Button onClick={() => router.push('/player')}>Player</Button>
          )}
      </div>

    </div>
  );
}
