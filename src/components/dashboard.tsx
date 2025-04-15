import {useState, useEffect} from 'react';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";


interface GameSession {
  id: string;
  sessionName: string;
  maxPlayers: number;
  questionGroupId: string;
  timePerQuestionInSec: number;
  createdAt: string;
  status: 'waiting' | 'active' | 'finished';
  players: string[];
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
  const [playersInSession, setPlayersInSession] = useState<{[key: string]: number}>({}); // Players in session

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

    const getPlayersInSession = async (sessionId: string) => {
      try {
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
          return {};
        }
  
        if (redisData && redisData.value) {
          try {
            const players = JSON.parse(redisData.value);
            return players;
          } catch (parseError) {
            console.error('Error parsing Redis data:', parseError);
            toast({
              title: "Error",
              description: "Failed to parse lobby players data.",
              variant: "destructive"
            });
            return {};
          }
        }
        return {};
      } catch (error) {
        console.error('Unexpected error fetching session players:', error);
        toast({
          title: "Error",
          description: "Unexpected error fetching session players."
        });
        return {};
      }
    };
  
    useEffect(() => {
      const fetchPlayers = async () => {
        const playersData: {[key: string]: number}[] = await Promise.all(
          activeSessions.map(session => getPlayersInSession(session.id))
        );
  
        // Convert the array of objects into a single object
        const allPlayers: {[key: string]: number} = {};
        playersData.forEach(players => {
          Object.assign(allPlayers, players);
        });
  
        setPlayersInSession(allPlayers);
      };
  
      fetchPlayers();
    }, [activeSessions]);

  const getPlayersCount = (sessionId: string) => {
    const sessionPlayers = Object.keys(playersInSession).filter(key => key === sessionId);
    return sessionPlayers.length;
  };

    const handleTakeControl = (session: GameSession) => {
      setOpen(true);
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
                  <TableCell>{session.maxPlayers !== undefined ? `${Object.keys(playersInSession).length}/${session.maxPlayers}` : `0/${session.maxPlayers}`}</TableCell>
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
                          <Button size="icon" onClick={() => confirmRestartSession(session.id)} disabled={session.status === 'waiting'}>
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

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Session Players</DialogTitle>
              <DialogDescription>
                Here are the players currently in this session.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {/* Display list of players in the session */}
              {/*
              Object.keys(playersInSession).map((player) => (
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
              */}
            </div>
            <DialogFooter>
              <Button type="submit" onClick={() => setOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </div>
  );
};

