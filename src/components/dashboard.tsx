'use client';

import {useState, useEffect} from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {Button} from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {supabase} from "@/lib/supabaseClient";
import {useToast} from "@/hooks/use-toast";
import {format} from 'date-fns';
import {useRouter} from "next/navigation";
import {Edit, Trash, RefreshCcw, Eye} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";


interface GameSession {
  id: string;
  sessionName: string;
  maxPlayers: number;
  questionGroupId: string;
  timePerQuestionInSec: number;
  createdAt: string;
  status: 'waiting' | 'active' | 'finished';
}

interface Group {
    id: string;
    name: string;
}

export const Dashboard = () => {
  const [activeSessions, setActiveSessions] = useState<GameSession[]>([]);
    const [availableGroups, setAvailableGroups] = useState<Group[]>([]);
  const [open, setOpen] = useState(false);
    const {toast} = useToast();
    const router = useRouter();
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [restartingSessionId, setRestartingSessionId] = useState<string | null>(null);

  const [editSessionId, setEditSessionId] = useState<string | null>(null);
  const [editSessionOpen, setEditSessionOpen] = useState(false);
  const [editedSession, setEditedSession] = useState<Partial<GameSession>>({});
    const [playersInSession, setPlayersInSession] = useState<{ [key: string]: number }>({});


  useEffect(() => {
    fetchSessions();
      fetchGroups();
  }, []);

  const fetchSessions = async () => {
    try {
      const {data, error} = await supabase
        .from('game_sessions')
        .select('*');

      if (error) {
        console.error('Error fetching game sessions:', JSON.stringify(error));
        toast({
          variant: "destructive",
          title: "Error",
          description: `Failed to fetch game sessions: ${error.message}`,
        });
        return;
      }

      setActiveSessions(data || []);
    } catch (error: any) {
      console.error('Unexpected error fetching game sessions:', error);
      let errorMessage = "Unexpected error fetching game sessions.";
      if (error.message) {
        errorMessage = error.message;
      } else if (error.error?.message) {
        errorMessage = error.error.message;
      } else if (error.data?.message) {
        errorMessage = error.data.message;
      }
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    }
  };

    const fetchGroups = async () => {
        try {
            const {data, error} = await supabase
                .from('groups')
                .select('*');
            if (error) {
                console.error('Error fetching groups:', JSON.stringify(error));
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Failed to fetch groups."
                })
                return;
            }
            setAvailableGroups(data || []);
        } catch (error) {
            console.error('Unexpected error fetching groups:', JSON.stringify(error));
            toast({
                variant: "destructive",
                title: "Error",
                description: "Unexpected error fetching groups."
            })
        }
    };

  const deleteAllSessions = async () => {
    try {
      const {error} = await supabase
        .from('game_sessions')
        .delete()
        .neq('id', 'null'); // Delete all rows

      if (error) {
        console.error('Error deleting all sessions:', JSON.stringify(error));
          toast({
              variant: "destructive",
              title: "Error",
              description: "Failed to delete all sessions."
          })
        return;
      }

      setActiveSessions([]);
      setOpen(false);
        toast({
            title: "Success",
            description: "All sessions deleted successfully."
        })
    } catch (error) {
      console.error('Unexpected error deleting all sessions:', JSON.stringify(error));
        toast({
            variant: "destructive",
            title: "Error",
            description: "Unexpected error deleting all sessions."
        })
    }
  };

    const getGroupName = (groupId: string) => {
        return availableGroups.find(group => group.id === groupId)?.name || 'Unknown Group';
    };

  const confirmRestartSession = (sessionId: string) => {
    setRestartingSessionId(sessionId);
    setOpen(true);
  };

  const restartGameSession = async () => {
    if (!restartingSessionId) return;
    try {
      const { error } = await supabase
        .from('game_sessions')
        .update({ status: 'waiting', question_index: null })
        .eq('id', restartingSessionId);
  
      if (error) {
        console.error('Error restarting game session:', JSON.stringify(error));
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to restart game session."
        });
        return;
      }
  
      // Optimistically update the UI
      setActiveSessions(prevSessions =>
        prevSessions.map(session =>
          session.id === restartingSessionId ? { ...session, status: 'waiting', question_index: null } : session
        )
      );
  
      toast({
        title: "Success",
        description: "Game session restarted successfully."
      });
    } catch (error) {
      console.error('Unexpected error restarting game session:', JSON.stringify(error));
      toast({
        variant: "destructive",
        title: "Error",
        description: "Unexpected error restarting game session."
      });
    } finally {
        setOpen(false);
        setRestartingSessionId(null);
    }
  };

  const confirmDeleteSession = (sessionId: string) => {
    setSessionToDelete(sessionId);
    setOpen(true);
  };
  
  const deleteSession = async () => {
    if (!sessionToDelete) return;
    try {
      const { error } = await supabase
        .from('game_sessions')
        .delete()
        .eq('id', sessionToDelete);
  
      if (error) {
        console.error('Error deleting session:', JSON.stringify(error));
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to delete session."
        });
        return;
      }
  
      setActiveSessions(prevSessions => prevSessions.filter(session => session.id !== sessionToDelete));
      setOpen(false);
  
      toast({
        title: "Success",
        description: "Session deleted successfully."
      });
    } catch (error) {
      console.error('Unexpected error deleting session:', JSON.stringify(error));
      toast({
        variant: "destructive",
        title: "Error",
        description: "Unexpected error deleting session."
      });
    } finally {
        setOpen(false);
        setSessionToDelete(null);
    }
  };

    const handleEditSession = (session: GameSession) => {
        setEditSessionId(session.id);
        setEditedSession({
            sessionName: session.sessionName,
            maxPlayers: session.maxPlayers,
            questionGroupId: session.questionGroupId,
            timePerQuestionInSec: session.timePerQuestionInSec
        });
        setEditSessionOpen(true);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const {name, value} = e.target;
        setEditedSession(prev => ({...prev, [name]: value }));
    };

    const handleSelectChange = (value: string, name: string) => {
        setEditedSession(prev => ({ ...prev, [name]: value }));
    };

    const updateSession = async () => {
        if (!editSessionId || !editedSession) return;

        try {
            const {error} = await supabase
                .from('game_sessions')
                .update({
                    sessionName: editedSession.sessionName,
                    maxPlayers: editedSession.maxPlayers,
                    questionGroupId: editedSession.questionGroupId,
                    timePerQuestionInSec: editedSession.timePerQuestionInSec
                })
                .eq('id', editSessionId);

            if (error) {
                console.error('Error updating session:', error);
                toast({
                    title: "Error",
                    description: "Failed to update session.",
                    variant: "destructive",
                });
                return;
            }

            setActiveSessions(prevSessions => {
                return prevSessions.map(session => {
                    if (session.id === editSessionId) {
                        return { ...session, ...editedSession } as GameSession;
                    }
                    return session;
                });
            });
            toast({
                title: "Success",
                description: "Session updated successfully."
            });

            setEditSessionOpen(false);
            setEditSessionId(null);
            setEditedSession({});

        } catch (error) {
            console.error("Unexpected error updating session:", error);
            toast({
                title: "Error",
                description: "Unexpected error updating session.",
                variant: "destructive",
            });
        }
    };

    const getConnectedPlayersCount = (sessionId: string): number => {
        if (!sessionId || !playersInSession[sessionId]) {
            return 0;
        }
        return Object.keys(playersInSession[sessionId]).length;
    };

    useEffect(() => {
        const fetchPlayers = async () => {
            const initialPlayers = {};

            for (const session of activeSessions) {
                try {
                    const { data: redisData, error: redisError } = await supabase
                        .from('redis')
                        .select('value')
                        .eq('key', session.id)
                        .maybeSingle();

                    if (redisError) {
                        console.error('Error fetching Redis data:', redisError);
                        toast({
                            variant: "destructive",
                            title: "Error",
                            description: "Failed to fetch players."
                        });
                        continue;
                    }

                    if (redisData && redisData.value) {
                        try {
                            initialPlayers[session.id] = JSON.parse(redisData.value);
                        } catch (parseError) {
                            console.error('Error parsing Redis data:', parseError);
                            toast({
                                variant: "destructive",
                                title: "Error",
                                description: "Failed to parse lobby players data."
                            });
                            continue;
                        }
                    } else {
                        initialPlayers[session.id] = {};
                    }
                } catch (error) {
                    console.error('Unexpected error fetching Redis data:', error);
                    toast({
                        variant: "destructive",
                        title: "Error",
                        description: "Unexpected error fetching players."
                    });
                }
            }

            setPlayersInSession(initialPlayers);
        };

        fetchPlayers();
    }, [activeSessions]);

    useEffect(() => {
        supabase
            .channel('redis-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'redis' },
                payload => {
                    console.log('Change received!', payload);
                    fetchSessions();
                }
            )
            .subscribe()
    }, []);

    const handleTakeControl = (session: GameSession) => {
        router.push(`/game/${session.id}`);
    };


  return (
    <div className="container mx-auto max-w-4xl">
      <h2 className="text-2xl font-semibold mb-4">Active Sessions</h2>

      <div className="mb-4">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">Delete All Sessions</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete all active sessions.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={deleteAllSessions}>Continue</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Name</TableHead>
              <TableHead>Players</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Question Group</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activeSessions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center">No active sessions at the moment.</TableCell>
              </TableRow>
            ) : (
              activeSessions.map(session => (
                <TableRow key={session.id}>
                  <TableCell>{session.sessionName}</TableCell>
                  <TableCell>{getConnectedPlayersCount(session.id)}/{session.maxPlayers}</TableCell>
                  <TableCell>{session.status}</TableCell>
                  <TableCell>{getGroupName(session.questionGroupId)}</TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" onClick={() => handleTakeControl(session)}>
                          <Eye className="h-4 w-4"/>
                      </Button>
                      <Button size="icon" onClick={() => handleEditSession(session)}>
                          <Edit className="h-4 w-4"/>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="outline" onClick={() => confirmRestartSession(session.id)} disabled={session.status === 'waiting'}>
                            <RefreshCcw className="h-4 w-4"/>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action will restart the session.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={restartGameSession}>Continue</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="destructive" onClick={() => confirmDeleteSession(session.id)}>
                            <Trash className="h-4 w-4"/>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete this session.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={deleteSession}>Continue</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
