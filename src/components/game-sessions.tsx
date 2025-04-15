'use client';

import {Skeleton} from '@/components/ui/skeleton';
import {useState, useEffect} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ArrowLeft, LogOut, Edit, Trash, Check, X, Plus } from "lucide-react";

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
  const [newSession, setNewSession] = useState({
    sessionName: '',
    maxPlayers: 5,
    questionGroupId: '',
    timePerQuestionInSec: 20,
  });

  const [availableGroups, setAvailableGroups] = useState<Group[]>([]);
  const {toast} = useToast();

  useEffect(() => {
    fetchGroups();
  }, []);

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

          setNewSession({
              sessionName: '',
              maxPlayers: 5,
              questionGroupId: '',
              timePerQuestionInSec: 20,
          });
          toast({
              title: "Success",
              description: "Session added successfully."
          });

      } catch (error) {
          console.error('Unexpected error adding session:', JSON.stringify(error));
          toast({
              variant: "destructive",
              title: "Error",
              description: "Failed to add session."
          });
      }
  };


  return (
    <>
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
              name="sessionName"
              value={newSession.sessionName}
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
                <SelectValue placeholder="Select a group">
                  {availableGroups.find(group => group.id === newSession.questionGroupId)?.name || "Select a group"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {availableGroups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="timePerQuestionInSec">Time per Question (seconds) ({newSession.timePerQuestionInSec === 0 ? '∞' : newSession.timePerQuestionInSec})</Label>
            <div className="flex items-center space-x-2">
              <Slider
                  defaultValue={[20]}
                  max={300}
                  min={20}
                  step={1}
                  onValueChange={value => {
                    handleTimeSliderChange(value as number[])
                    setNewSession({...newSession, timePerQuestionInSec: value[0]})
                  }}
              />
              <Input
                  type="number"
                  id="timePerQuestionInSec"
                  name="timePerQuestionInSec"
                  value={newSession.timePerQuestionInSec.toString()}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (!isNaN(value) && value >= 20 && value <= 300) {
                      setNewSession({...newSession, timePerQuestionInSec: value});
                    }
                  }}
                  className="w-24"
              />
            </div>
          </div>
          <Button onClick={addSession}>
            Create Session
          </Button>
        </CardContent>
      </Card>
    </div> </>); };
