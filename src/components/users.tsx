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
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, Trash } from "lucide-react";

interface User {
  id: string;
  nickname: string;
  password?: string;
  created_at: string;
  type: string;
}

export const Users = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [open, setOpen] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const {toast} = useToast();

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editedUser, setEditedUser] = useState<Partial<User>>({});


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

  const confirmDeleteUser = (userId: string) => {
    setDeletingUserId(userId);
    setOpen(true);
  };

  const deleteUser = async () => {
    if (deletingUserId) {
      try {
        const {error} = await supabase.from('users').delete().eq('id', deletingUserId);

        if (error) {
          console.error('Error deleting user:', JSON.stringify(error));
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to delete user."
          });
          return;
        }

        const updatedUsers = users.filter(user => user.id !== deletingUserId);
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
        setDeletingUserId(null);
      }
    }
  };

  const startEditing = (user: User) => {
    setEditingUserId(user.id);
    setEditedUser({ ...user });
  };

  const cancelEditing = () => {
    setEditingUserId(null);
    setEditedUser({});
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditedUser(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (value: string, name: string) => {
    setEditedUser(prev => ({ ...prev, [name]: value }));
  };

  const updateUser = async () => {
    if (!editedUser || !editingUserId) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({
          password: editedUser.password,
          type: editedUser.type,
        })
        .eq('id', editingUserId)
        .select();

      if (error) {
        console.error('Error updating user:', error);
        toast({
          title: "Error",
          description: "Failed to update user.",
          variant: "destructive",
        });
        return;
      }

      const updatedUsers = users.map(user =>
        user.id === editingUserId ? { ...user, ...editedUser } : user
      );
      setUsers(updatedUsers);
      setEditingUserId(null);
      setEditedUser({});
      toast({
        title: "Success",
        description: "User updated successfully."
      });

    } catch (error) {
      console.error("Unexpected error updating user:", error);
      toast({
        title: "Error",
        description: "Unexpected error updating user.",
        variant: "destructive",
      });
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
              <TableHead>Type</TableHead>
              <TableHead>Password</TableHead>
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
                  <TableCell>
                  {editingUserId === user.id ? (
                      <Select onValueChange={(value) => handleSelectChange(value, 'type')} defaultValue={user.type}>
                          <SelectTrigger id="type">
                              <SelectValue placeholder="Select a type">{editedUser.type || user.type}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="player">Player</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                      </Select>
                  ) : (
                      user.type
                  )}
                  </TableCell>
                  <TableCell>
                    {editingUserId === user.id ? (
                      <Input
                        type="text"
                        name="password"
                        value={(editedUser.password === undefined ? user.password : editedUser.password) || ''}
                        onChange={handleInputChange}
                      />
                    ) : (
                      user.password
                    )}
                  </TableCell>
                  <TableCell>{format(new Date(user.created_at), 'yyyy-MM-dd HH:mm')}</TableCell>
                  <TableCell className="text-right">
                  {editingUserId === user.id ? (
                      <>
                          <Button size="sm" onClick={updateUser}>Update</Button>
                          <Button size="sm" variant="ghost" onClick={cancelEditing}>Cancel</Button>
                      </>
                  ) : (
                      <>
                          <Button size="icon" onClick={() => startEditing(user)}>
                              <Edit className="h-4 w-4"/>
                          </Button>
                          <AlertDialog>
                              <AlertDialogTrigger asChild>
                                  <Button size="icon" variant="destructive">
                                      <Trash className="h-4 w-4"/>
                                  </Button>
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
                                          confirmDeleteUser(user.id);
                                          deleteUser();
                                      }}>Continue</AlertDialogAction>
                                  </AlertDialogFooter>
                              </AlertDialogContent>
                          </AlertDialog>
                      </>
                  )}
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
