'use client';

import {useState, useEffect} from 'react';
import {
  Table,
  TableBody,
  TableCaption,
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

interface User {
  id: string;
  nickname: string;
  password?: string;
  created_at: string;
}

export const Users = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [open, setOpen] = useState(false);
  const [deletingUserNickname, setDeletingUserNickname] = useState<string | null>(null);
  const {toast} = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const {data, error} = await supabase
        .from('users')
        .select('*');
      if (error) {
        console.error('Error fetching users:', JSON.stringify(error));
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch users."
        })
        return;
      }
      setUsers(data || []);
    } catch (error) {
      console.error('Unexpected error fetching users:', JSON.stringify(error));
      toast({
        variant: "destructive",
        title: "Error",
        description: "Unexpected error fetching users."
      })
    }
  };

  const confirmDeleteUser = (nickname: string) => {
    setDeletingUserNickname(nickname);
    setOpen(true);
  };

  const deleteUser = async () => {
    if (deletingUserNickname) {
      try {
        const {error} = await supabase.from('users').delete().eq('nickname', deletingUserNickname);

        if (error) {
          console.error('Error deleting user:', JSON.stringify(error));
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to delete user."
          });
          return;
        }

        const updatedUsers = users.filter(user => user.nickname !== deletingUserNickname);
        setUsers(updatedUsers);
        toast({
          title: "Success",
          description: "User deleted successfully."
        });
      } catch (error) {
        console.error('Unexpected error deleting user:', JSON.stringify(error));
        toast({
          variant: "destructive",
          title: "Error",
          description: "Unexpected error deleting user."
        });
      } finally {
        setOpen(false);
        setDeletingUserNickname(null);
      }
    }
  };


  return (
    <div className="container mx-auto max-w-4xl">
      <h2 className="text-2xl font-semibold mb-4">Users</h2>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Nickname</TableHead>
                <TableHead className="w-[200px]">Password</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center">No users at the moment.</TableCell>
              </TableRow>
            ) : (
              users.map(user => (
                <TableRow key={user.id}>
                  <TableCell>{user.nickname}</TableCell>
                    <TableCell>{user.password}</TableCell>
                  <TableCell>{format(new Date(user.created_at), 'yyyy-MM-dd HH:mm')}</TableCell>
                  <TableCell className="text-right">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive" onClick={() => confirmDeleteUser(user.nickname)}>Delete</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the user and remove their data from our servers.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => {
                            deleteUser();
                          }}>Continue</AlertDialogAction>
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

