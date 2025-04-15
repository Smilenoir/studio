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
import { Edit, Trash, Check, X, Plus } from "lucide-react";
import { Label } from "@/components/ui/label";

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
  const [newUser, setNewUser] = useState<Omit<User, 'id' | 'created_at'>>({
    nickname: '',
    password: '',
    type: 'player',
  });
  const [groupError, setGroupNameError] = useState<string | null>(null);

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

    const handleCreateUser = async () => {
        if (newUser.nickname.trim() === '') {
            setGroupNameError('User name cannot be empty.');
            toast({
                variant: "destructive",
                title: "Error",
                description: "User name cannot be empty."
            })
            return;
        }

        if (newUser.password.trim() === '') {
            setGroupNameError('Password cannot be empty.');
            toast({
                variant: "destructive",
                title: "Error",
                description: "Password cannot be empty."
            })
            return;
        }

        if (users.some(user => user.nickname === newUser.nickname)) {
            setGroupNameError('User name already exists.');
            toast({
                variant: "destructive",
                title: "Error",
                description: "User name already exists."
            })
            return;
        }
        try {
            const { error } = await supabase
                .from('users')
                .insert([
                    {
                        nickname: newUser.nickname,
                        password: newUser.password,
                        type: newUser.type,
                        created_at: new Date().toISOString()
                    }
                ])
                .select();

            if (error) {
                console.error('Error creating user:', error);
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Failed to create user."
                })
                return;
            }

            fetchUsers();
            setNewUser({
                nickname: '',
                password: '',
                type: 'player',
            });
            toast({
                title: "Success",
                description: "User created successfully."
            });
        } catch (error) {
            console.error('Unexpected error creating user:', error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Unexpected error creating user."
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
            description: "Failed to add user."
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
      setNewUser(prev => ({ ...prev, [name]: value }));
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
          nickname: editedUser.nickname,
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

      <div className="rounded-md border mb-4">
          <h3 className="text-lg font-semibold mb-2 p-4">Create New User</h3>
          <div className="grid grid-cols-3 gap-4 p-4">
              <div>
                  <Label htmlFor="new-nickname">Nickname</Label>
                  <Input
                      type="text"
                      id="new-nickname"
                      name="nickname"
                      value={newUser.nickname}
                      onChange={handleInputChange}
                  />
              </div>
              <div>
                  <Label htmlFor="new-password">Password</Label>
                  <Input
                      type="password"
                      id="new-password"
                      name="password"
                      value={newUser.password}
                      onChange={handleInputChange}
                  />
              </div>
              <div>
                  <Label htmlFor="new-type">Type</Label>
                  <Select onValueChange={(value) => handleSelectChange(value, 'type')}>
                      <SelectTrigger id="new-type">
                          <SelectValue placeholder="Select a type">
                              {newUser.type || "Select a type"}
                          </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="player">Player</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                  </Select>
              </div>
          </div>
          <div className="p-4">
              <Button onClick={handleCreateUser}>Create User</Button>
              {groupError && <p className="text-red-500">{groupError}</p>}
          </div>
      </div>

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
                  <TableCell>
                    {editingUserId === user.id ? (
                      <Input
                        type="text"
                        name="nickname"
                        value={editedUser.nickname === undefined ? user.nickname : editedUser.nickname}
                        onChange={handleInputChange}
                      />
                    ) : (
                      user.nickname
                    )}
                  </TableCell>
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
                          <Button size="icon" onClick={updateUser}>
                              <Check className="h-4 w-4"/>
                          </Button>
                          <Button size="icon" variant="ghost" onClick={cancelEditing}>
                              <X className="h-4 w-4"/>
                          </Button>
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
