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
import {format} from 'date-fns';

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

export const GameSessions = () => {
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [newSession, setNewSession] = useState({
    sessionName: '',
    maxPlayers: 5,
    questionGroupId: '',
    timePerQuestionInSec: 0,
  });

  const [availableGroups, setAvailableGroups] = useState<Group[]>([]);
  const {toast} = useToast();
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [playerCounts, setPlayerCounts] = useState<{ [sessionId: string]: number }>({});

  useEffect(() => {
    fetchGroups();
    fetchSessions();
  }, []);


    // Inside GameSessions component, before fetchGroups
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
                    description: "Failed to fetch game sessions."
                })
                return;
            }

            const fetchedSessions = data || [];
            setSessions(fetchedSessions);
            // After fetching sessions, fetch player counts
            fetchedSessions.forEach(async (session) => {
                const count = await getConnectedPlayerCount(session.id);
                setPlayerCounts((prevCounts) => ({
                    ...prevCounts,
                    [session.id]: count,
                }));
            });
        } catch (error) {
            console.error('Unexpected error fetching game sessions:', JSON.stringify(error));
            toast({
                variant: "destructive",
                title: "Error",
                description: "Unexpected error fetching game sessions."
            })
        }
    };

    const getConnectedPlayerCount = async (gameId: string): Promise<number> => {
        try {
            const { data, error } = await supabase
                .from("redis")
                .select("value")
                .eq("key", gameId)
                .single();

            if (error) {
                console.error("Error fetching game data from Redis:", error);
                return 0;
            }

            if (data && data.value) {
                try {
                    const gameData = JSON.parse(data.value);
                    // Assuming the players data is in an array named 'players'
                    if (Array.isArray(gameData.players)) {
                        return gameData.players.length;
                    } else {
                        console.warn("Unexpected game data format in Redis:", gameData);
                        return 0;
                    }
                } catch (parseError) {
                    console.error("Error parsing game data:", parseError);
                    return 0;
                }
            } else {
                console.warn("No game data found in Redis for game ID:", gameId);
                return 0;
            }
        } catch (error) {
            console.error("Unexpected error in getConnectedPlayerCount:", error);
            return 0;
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const {name, value} = e.target;
    setNewSession({...newSession, [name]: value});
  };

  const handleSliderChange = (value: number[]) => {
    setNewSession({...newSession, maxPlayers: value[0]});
  };

    const handleTimeSliderChange = (value: number[]) => {
        setNewSession({...newSession, timePerQuestionInSec: value[0]});
    };

  const handleSelectChange = (value: string) => {
    setNewSession({...newSession, questionGroupId: value});
  };

  const addSession = async () => {
    if (newSession.sessionName.trim() === '') {
      alert('Session name cannot be empty.');
      return;
    }

    const newId = Math.random().toString(36).substring(2, 15);
    const now = new Date().toISOString();

    const sessionToAdd = {
      id: newId,
      sessionName: newSession.sessionName,
      maxPlayers: newSession.maxPlayers,
      questionGroupId: newSession.questionGroupId,
      timePerQuestionInSec: newSession.timePerQuestionInSec,
      createdAt: now,
      status: 'waiting',
    };

      try {
          const {error} = await supabase
              .from('game_sessions')
              .insert([sessionToAdd])
              .select();

          if (error) {
              console.error('Error adding session:', JSON.stringify(error));
              toast({
                  variant: "destructive",
                  title: "Error",
                  description: "Failed to add session."
              });
              return;
          }

          setSessions([...sessions, sessionToAdd]);
          setNewSession({
              sessionName: '',
              maxPlayers: 5,
              questionGroupId: '',
              timePerQuestionInSec: 0,
          });
          toast({
              title: "Success",
              description: "Session added successfully."
          });

          // TODO: Store the session ID in Redis
          // await redis.set(newId, JSON.stringify(sessionToAdd));

      } catch (error) {
          console.error('Unexpected error adding session:', JSON.stringify(error));
          toast({
              variant: "destructive",
              title: "Error",
              description: "Failed to add session."
          });
      }
  };

  const startEditing = (id: string) => {
    const sessionToEdit = sessions.find(session => session.id === id);
    if (sessionToEdit) {
      setNewSession({
        sessionName: sessionToEdit.sessionName,
        maxPlayers: sessionToEdit.maxPlayers,
        questionGroupId: sessionToEdit.questionGroupId,
        timePerQuestionInSec: sessionToEdit.timePerQuestionInSec,
      });
      setEditingSessionId(id);
    }
  };

  const updateSession = async () => {
    if (editingSessionId) {
      const updatedSession = {
        sessionName: newSession.sessionName,
        maxPlayers: newSession.maxPlayers,
        questionGroupId: newSession.questionGroupId,
        timePerQuestionInSec: newSession.timePerQuestionInSec,
      };
        try {
            const {error} = await supabase
                .from('game_sessions')
                .update(updatedSession)
                .eq('id', editingSessionId)
                .select();

            if (error) {
                console.error('Error updating session:', JSON.stringify(error));
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Failed to update session."
                });
                return;
            }

            const updatedSessions = sessions.map(session =>
                session.id === editingSessionId ? {...session, ...updatedSession} : session
            );
            setSessions(updatedSessions);
            setEditingSessionId(null);
            setNewSession({
                sessionName: '',
                maxPlayers: 5,
                questionGroupId: '',
                timePerQuestionInSec: 0,
            });
            toast({
                title: "Success",
                description: "Session updated successfully."
            });
        } catch (error) {
            console.error('Unexpected error updating session:', JSON.stringify(error));
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to update session."
            });
        }
    }
  };

  const confirmDeleteSession = (id: string) => {
    setDeletingSessionId(id);
    setOpen(true);
  };

  const deleteSession = async () => {
    if (deletingSessionId) {
        try {
            const {error} = await supabase.from('game_sessions').delete().eq('id', deletingSessionId);

            if (error) {
                console.error('Error deleting session:', JSON.stringify(error));
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Failed to delete session."
                });
                return;
            }

            const updatedSessions = sessions.filter(session => session.id !== deletingSessionId);
            setSessions(updatedSessions);
            toast({
                title: "Success",
                description: "Session deleted successfully."
            });
        } catch (error) {
            console.error('Unexpected error deleting session:', JSON.stringify(error));
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to delete session."
            });
        } finally {
            setOpen(false);
            setDeletingSessionId(null);
        }
    };
  };

  const restartSession = async (id: string) => {
      try {
          const {error} = await supabase
              .from('game_sessions')
              .update({status: 'waiting'})
              .eq('id', id)
              .select();

          if (error) {
              console.error('Error restarting session:', JSON.stringify(error));
              toast({
                  variant: "destructive",
                  title: "Error",
                  description: "Failed to restart session."
              });
              return;
          }

          const updatedSessions = sessions.map(session =>
              session.id === id ? {...session, status: 'waiting'} : session
          );
          setSessions(updatedSessions);
          toast({
              title: "Success",
              description: "Session restarted successfully."
          });
      } catch (error) {
          console.error('Unexpected error restarting session:', JSON.stringify(error));
          toast({
              variant: "destructive",
              title: "Error",
              description: "Failed to restart session."
              });
      }
  };

    const getGroupName = (groupId: string) => {
        return availableGroups.find(group => group.id === groupId)?.name || 'Unknown Group';
    };

  return (
    
      {/* Session Creation Form */}
      
        
          
            Create Game Session
          
          
            Configure and create a new game session.
          
        
        
          
            
              Session Name
            
            
              type="text"
              id="sessionName"
              name="sessionName"
              value={newSession.sessionName}
              onChange={handleInputChange}
              placeholder="Enter session name"
            
          
          

          
            
              Max Players ({newSession.maxPlayers})
            
            
              defaultValue={[5]}
              max={30}
              min={1}
              step={1}
              onValueChange={value => handleSliderChange(value as number[])}
            
          
          

          
            
              Question Group
            
            
              
                
                  {availableGroups.find(group => group.id === newSession.questionGroupId)?.name || "Select a group"}
                
              
              
                {availableGroups.map(group => (
                  
                    {group.name}
                  
                ))}
              
            
          
          

          
            
              Time per Question (seconds) ({newSession.timePerQuestionInSec === 0 ? '∞' : newSession.timePerQuestionInSec})
            
            
                defaultValue={[0]}
                max={60}
                min={0}
                step={1}
                onValueChange={value => handleTimeSliderChange(value as number[])}
            
          
          

          
            {editingSessionId ? 'Update Session' : 'Create Session'}
          
        
      

      {/* Session List */}
      
        
          
            Existing Sessions
          
          
            Manage existing game sessions.
          
        
        
          {sessions.length === 0 ? (
            
              No sessions created yet.
            
          ) : (
            
              {sessions.map(session => (
                
                  
                    
                      {session.sessionName}
                    
                    
                      Players: {`${0}/${session.maxPlayers}`}
                    
                    
                      Status: {session.status}
                    
                    
                      Question Group: {getGroupName(session.questionGroupId)}
                    
                    
                        Time per Question: {session.timePerQuestionInSec === 0 ? '∞' : session.timePerQuestionInSec} seconds
                    
                  
                  
                    
                      Edit
                    
                    
                      Restart
                    
                    
                      
                        
                          Are you absolutely sure?
                        
                        
                          This action cannot be undone. This will permanently delete the session and remove its data.
                        
                      
                      
                        Cancel
                        
                          Continue
                        
                      
                    
                  
                
              ))}
            
          )}
        
      
    
  );
};

