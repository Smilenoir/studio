'use client';

import {useState, useEffect} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Slider} from "@/components/ui/slider";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {useToast} from "@/hooks/use-toast"
import {supabase} from "@/lib/supabaseClient";

interface GameSession {
  id: string;
  name: string;
  maxPlayers: number;
  questionGroupId: string;
  timePerQuestion?: number;
  joinedPlayers: number; // Добавлено: количество подключенных игроков
  status: 'active' | 'waiting' | 'finished'; // Добавлено: статус игры
}

interface Group {
  id: string;
  name: string;
}

const GAME_SESSIONS_STORAGE_KEY = 'gameSessions';

export const GameSessions = () => {
  const [sessions, setSessions] = useState<GameSession[]>(() => {
    // Initialize from local storage
    if (typeof window !== 'undefined') {
      const storedSessions = localStorage.getItem(GAME_SESSIONS_STORAGE_KEY);
      return storedSessions ? JSON.parse(storedSessions) : [];
    }
    return [];
  });
  const [newSession, setNewSession] = useState({
    name: '',
    maxPlayers: 10,
    questionGroupId: '',
    timePerQuestion: undefined as number | undefined,
  });
  const [sessionNameError, setSessionNameError] = useState<string | null>(null);
  const {toast} = useToast();
  const [groups, setGroups] = useState<Group[]>([]);

  useEffect(() => {
    fetchGroups();
  }, []);

  // Save sessions to local storage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(GAME_SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
    }
  }, [sessions]);

  const fetchGroups = async () => {
    try {
      const {data, error} = await supabase.from('groups').select('*');
      if (error) {
        console.error('Error fetching groups:', JSON.stringify(error));
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch groups."
        });
        return;
      }
      setGroups(data || []);
    } catch (error) {
      console.error('Unexpected error fetching groups:', JSON.stringify(error));
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch groups."
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const {name, value} = e.target;
    setNewSession({...newSession, [name]: value});
  };

  const handleSliderChange = (value: number[]) => {
    setNewSession({...newSession, maxPlayers: value[0]});
  };

  const handleSelectChange = (value: string, name: string) => {
    setNewSession({...newSession, [name]: value});
  };

  const addSession = () => {
    if (newSession.name.trim() === '') {
      setSessionNameError('Session name cannot be empty.');
      toast({
        variant: "destructive",
        title: "Error",
        description: "Session name cannot be empty."
      });
      return;
    }

    const newId = Math.random().toString(36).substring(2, 15);
    const sessionToAdd: GameSession = {
      id: newId,
      name: newSession.name,
      maxPlayers: newSession.maxPlayers,
      questionGroupId: newSession.questionGroupId,
      timePerQuestion: newSession.timePerQuestion,
      joinedPlayers: 0, // Initial value for joined players
      status: 'waiting', // Initial status
    };
    setSessions([...sessions, sessionToAdd]);
    setNewSession({
      name: '',
      maxPlayers: 10,
      questionGroupId: '',
      timePerQuestion: undefined,
    });
    toast({
      title: "Success",
      description: "Session added successfully."
    });
  };

  return (
    <div className="flex flex-col md:flex-row gap-4">
      {/* Session Editor Form */}
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Game Session Editor</CardTitle>
          <CardDescription>Create and manage game sessions.</CardDescription>
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
            {sessionNameError && <p className="text-red-500">{sessionNameError}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="maxPlayers">Max Players</Label>
            <Slider
              defaultValue={[10]}
              max={30}
              min={1}
              step={1}
              onValueChange={(value) => handleSliderChange(value)}
            />
            <p>Selected: {newSession.maxPlayers} players</p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="questionGroupId">Question Group</Label>
            <Select onValueChange={(value) => handleSelectChange(value, 'questionGroupId')}>
              <SelectTrigger id="questionGroupId">
                <SelectValue placeholder="Select a group">
                  {newSession.questionGroupId
                    ? groups.find(group => group.id === newSession.questionGroupId)?.name
                    : 'Select a group'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {groups.map(group => (
                  <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="timePerQuestion">Time per Question (seconds)</Label>
            <Input
              type="number"
              id="timePerQuestion"
              name="timePerQuestion"
              value={newSession.timePerQuestion || ''}
              onChange={handleInputChange}
              placeholder="Enter time in seconds (optional)"
            />
          </div>

          <Button type="button" onClick={addSession}>
            Create Session
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
          {sessions.length === 0 ? (
            <div>No sessions added yet.</div>
          ) : (
            <div className="grid gap-4">
              {sessions.map(session => (
                <Card key={session.id}>
                  <CardHeader>
                    <CardTitle>{session.name}</CardTitle>
                    <CardDescription>
                      Max Players: {session.maxPlayers}, Group: {groups.find(group => group.id === session.questionGroupId)?.name || 'Unknown Group'}, Time per Question: {session.timePerQuestion ? session.timePerQuestion + ' seconds' : 'Unlimited'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex gap-2">
                    <Button size="sm">Start</Button>
                    <Button size="sm" variant="destructive">Delete</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
