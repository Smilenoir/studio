'use client';

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
              description: "Failed to fetch game sessions."
          })
        return;
      }
      setActiveSessions(data || []);
    } catch (error) {
      console.error('Unexpected error fetching game sessions:', JSON.stringify(error));
        toast({
            variant: "destructive",
            title: "Error",
            description: "Unexpected error fetching game sessions."
        })
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
              <TableHead>Created At</TableHead>
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
                  <TableCell>{session.maxPlayers !== undefined ? `0/${session.maxPlayers}` : `0/${session.maxPlayers}`}</TableCell>
                  <TableCell>{session.status}</TableCell>
                  <TableCell>{getGroupName(session.questionGroupId)}</TableCell>
                  <TableCell>{session.createdAt}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};


