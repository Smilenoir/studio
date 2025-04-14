'use client';

import {useState, useEffect} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Slider} from '@/components/ui/slider';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {supabase} from "@/lib/supabaseClient";
import {useToast} from "@/hooks/use-toast";
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

interface GameSession {
  id: string;
  name: string;
  maxPlayers: number;
  questionGroupId: string;
  timePerQuestion?: number;
  joinedPlayers: number;
  status: 'waiting' | 'active' | 'finished';
}

interface Group {
  id: string;
  name: string;
}

export const GameSessions = () => {
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [newSession, setNewSession] = useState({
    name: '',
    maxPlayers: 5,
    questionGroupId: '',
    timePerQuestion: 0,
  });

  const [availableGroups, setAvailableGroups] = useState<Group[]>([]);
  const {toast} = useToast();
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);

  useEffect(() => {
    fetchGroups();
    loadSessionsFromLocalStorage();
  }, []);

  const loadSessionsFromLocalStorage = () => {
    const storedSessions = localStorage.getItem('gameSessions');
    if (storedSessions) {
      setSessions(JSON.parse(storedSessions));
    }
  };

  useEffect(() => {
    localStorage.setItem('gameSessions', JSON.stringify(sessions));
  }, [sessions]);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const {name, value} = e.target;
    setNewSession({...newSession, [name]: value});
  };

  const handleSliderChange = (value: number[]) => {
    setNewSession({...newSession, maxPlayers: value[0]});
  };

    const handleTimeSliderChange = (value: number[]) => {
        setNewSession({...newSession, timePerQuestion: value[0]});
    };

  const handleSelectChange = (value: string) => {
    setNewSession({...newSession, questionGroupId: value});
  };

  const addSession = () => {
    if (newSession.name.trim() === '') {
      alert('Session name cannot be empty.');
      return;
    }

    const newId = Math.random().toString(36).substring(2, 15);
    const sessionToAdd: GameSession = {
      id: newId,
      name: newSession.name,
      maxPlayers: newSession.maxPlayers,
      questionGroupId: newSession.questionGroupId,
      timePerQuestion: newSession.timePerQuestion,
      joinedPlayers: 0,
      status: 'waiting',
    };

    setSessions([...sessions, sessionToAdd]);

    setNewSession({
      name: '',
      maxPlayers: 5,
      questionGroupId: '',
      timePerQuestion: 0,
    });
  };

  const startEditing = (id: string) => {
    const sessionToEdit = sessions.find(session => session.id === id);
    if (sessionToEdit) {
      setNewSession({
        name: sessionToEdit.name,
        maxPlayers: sessionToEdit.maxPlayers,
        questionGroupId: sessionToEdit.questionGroupId,
        timePerQuestion: sessionToEdit.timePerQuestion,
      });
      setEditingSessionId(id);
    }
  };

  const updateSession = () => {
    if (editingSessionId) {
      const updatedSessions = sessions.map(session =>
        session.id === editingSessionId ? {
          ...session,
          name: newSession.name,
          maxPlayers: newSession.maxPlayers,
          questionGroupId: newSession.questionGroupId,
          timePerQuestion: newSession.timePerQuestion,
        } : session
      );
      setSessions(updatedSessions);
      setEditingSessionId(null);
      setNewSession({
        name: '',
        maxPlayers: 5,
        questionGroupId: '',
        timePerQuestion: 0,
      });
    }
  };

  const confirmDeleteSession = (id: string) => {
    setDeletingSessionId(id);
    setOpen(true);
  };

  const deleteSession = () => {
    if (deletingSessionId) {
      const updatedSessions = sessions.filter(session => session.id !== deletingSessionId);
      setSessions(updatedSessions);
      setOpen(false);
      setDeletingSessionId(null);
    }
  };

  const restartSession = (id: string) => {
    const updatedSessions = sessions.map(session =>
      session.id === id ? {...session, joinedPlayers: 0, status: 'waiting'} : session
    );
    setSessions(updatedSessions);
  };

    const getGroupName = (groupId: string) => {
        return availableGroups.find(group => group.id === groupId)?.name || 'Unknown Group';
    };

  return (
    <div className="flex flex-col md:flex-row gap-4">
      {/* Session Creation Form */}
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Create Game Session</CardTitle>
          <CardDescription>Configure and create a new game session.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="sessionName">Session Name</Label>
            <Input
              type="text"
              id="sessionName"
              name="name"
              value={newSession.name}
              onChange={handleInputChange}
              placeholder="Enter session name"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="maxPlayers">Max Players ({newSession.maxPlayers})</Label>
            <Slider
              defaultValue={[5]}
              max={30}
              min={1}
              step={1}
              onValueChange={value => handleSliderChange(value as number[])}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="questionGroupId">Question Group</Label>
            <Select onValueChange={handleSelectChange}>
              <SelectTrigger id="questionGroupId">
                <SelectValue placeholder="Select a question group">
                  {availableGroups.find(group => group.id === newSession.questionGroupId)?.name || "Select a group"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {availableGroups.map(group => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="timePerQuestion">Time per Question (seconds) ({newSession.timePerQuestion === 0 ? '∞' : newSession.timePerQuestion})</Label>
            <Slider
                defaultValue={[0]}
                max={60}
                min={0}
                step={1}
                onValueChange={value => handleTimeSliderChange(value as number[])}
            />
          </div>

          <Button type="button" onClick={editingSessionId ? updateSession : addSession}>
            {editingSessionId ? 'Update Session' : 'Create Session'}
          </Button>
        </CardContent>
      </Card>

      {/* Session List */}
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Existing Sessions</CardTitle>
          <CardDescription>Manage existing game sessions.</CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Max Players</TableHead>
                        <TableHead>Question Group</TableHead>
                        <TableHead>Time per Question</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sessions.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center">No sessions created yet.</TableCell>
                        </TableRow>
                    ) : (
                        sessions.map(session => (
                            <TableRow key={session.id}>
                                <TableCell>{session.name}</TableCell>
                                <TableCell>{session.maxPlayers}</TableCell>
                                <TableCell>{getGroupName(session.questionGroupId)}</TableCell>
                                <TableCell>{session.timePerQuestion === 0 ? '∞' : session.timePerQuestion}</TableCell>
                                <TableCell>{session.status}</TableCell>
                                <TableCell>
                                    <Button size="sm" onClick={() => startEditing(session.id)}>Edit</Button>
                                    <Button size="sm" onClick={() => restartSession(session.id)}>Restart</Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button size="sm" variant="destructive">Delete</Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This action cannot be undone. This will permanently delete the session and remove its data.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => deleteSession()}>Continue</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  );
};
