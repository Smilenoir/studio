'use client';

import {useState, useEffect} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {supabase} from '@/lib/supabaseClient';
import {useToast} from "@/hooks/use-toast"

interface Group {
  id: string;
  name: string;
}

export const GroupEditor = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupNameError, setGroupNameError] = useState<string | null>(null);
    const { toast } = useToast()

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const {data, error} = await supabase.from('groups').select('*');
      if (error) {
        console.error('Error fetching groups:', JSON.stringify(error));
          toast({
              variant: "destructive",
              title: "Error",
              description: "Failed to fetch groups."
          })
        return;
      }
      setGroups(data || []);
    } catch (error) {
      console.error('Unexpected error fetching groups:', JSON.stringify(error));
        toast({
            variant: "destructive",
            title: "Error",
            description: "Unexpected error fetching groups."
        })
    }
  };

  const handleGroupNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewGroupName(e.target.value);
    setGroupNameError(null);
  };

  const addGroup = async () => {
    if (newGroupName.trim() === '') {
      setGroupNameError('Group name cannot be empty.');
        toast({
            variant: "destructive",
            title: "Error",
            description: "Group name cannot be empty."
        })
      return;
    }

    if (groups.some(group => group.name === newGroupName)) {
      setGroupNameError('Group name already exists.');
        toast({
            variant: "destructive",
            title: "Error",
            description: "Group name already exists."
        })
      return;
    }

    const newId = Math.random().toString(36).substring(2, 15);

    try {
      const { error } = await supabase
        .from('groups')
        .insert([{ id: newId, name: newGroupName }])
        .select();

      if (error) {
        console.error('Error adding group:', JSON.stringify(error));
          toast({
              variant: "destructive",
              title: "Error",
              description: "Failed to add group."
          })
        return;
      }

      setGroups([...groups, {id: newId, name: newGroupName}]);
      setNewGroupName('');
        toast({
            title: "Success",
            description: "Group added successfully."
        })
    } catch (error) {
      console.error('Unexpected error adding group:', JSON.stringify(error));
        toast({
            variant: "destructive",
            title: "Error",
            description: "Unexpected error adding group."
        })
    }
  };

  const startEditing = (id: string) => {
    const groupToEdit = groups.find(group => group.id === id);
    if (groupToEdit) {
      setNewGroupName(groupToEdit.name);
      setEditingGroupId(id);
    }
  };

  const updateGroup = async () => {
    if (newGroupName.trim() === '') {
      setGroupNameError('Group name cannot be empty.');
        toast({
            variant: "destructive",
            title: "Error",
            description: "Group name cannot be empty."
        })
      return;
    }

    if (groups.some(group => group.name === newGroupName && group.id !== editingGroupId)) {
      setGroupNameError('Group name already exists.');
        toast({
            variant: "destructive",
            title: "Error",
            description: "Group name already exists."
        })
      return;
    }

    if (editingGroupId) {
      try {
        const {error} = await supabase
          .from('groups')
          .update({name: newGroupName})
          .eq('id', editingGroupId)
            .select();

        if (error) {
          console.error('Error updating group:', JSON.stringify(error));
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to update group."
            })
          return;
        }

        const updatedGroups = groups.map(group =>
          group.id === editingGroupId ? {id: editingGroupId, name: newGroupName} : group
        );
        setGroups(updatedGroups);
        setEditingGroupId(null);
        setNewGroupName('');
          toast({
              title: "Success",
              description: "Group updated successfully."
          })
      } catch (error) {
        console.error('Unexpected error updating group:', JSON.stringify(error));
          toast({
              variant: "destructive",
              title: "Error",
              description: "Unexpected error updating group."
          })
      }
    }
  };

  const deleteGroup = async (id: string) => {
    try {
      const {error} = await supabase.from('groups').delete().eq('id', id);

      if (error) {
        console.error('Error deleting group:', JSON.stringify(error));
          toast({
              variant: "destructive",
              title: "Error",
              description: "Failed to delete group."
          })
        return;
      }

      const updatedGroups = groups.filter(group => group.id !== id);
      setGroups(updatedGroups);
        toast({
            title: "Success",
            description: "Group deleted successfully."
        })
    } catch (error) {
      console.error('Unexpected error deleting group:', JSON.stringify(error));
        toast({
            variant: "destructive",
            title: "Error",
            description: "Unexpected error deleting group."
        })
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-4">
      {/* Group Editor Form */}
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Group Editor</CardTitle>
          <CardDescription>Create, edit, and manage question groups.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="groupName">Group Name</Label>
            <Input
              type="text"
              id="groupName"
              value={newGroupName}
              onChange={handleGroupNameChange}
              placeholder="Enter group name"
            />
            {groupNameError && <p className="text-red-500">{groupNameError}</p>}
          </div>

          <Button
            type="button"
            onClick={editingGroupId ? updateGroup : addGroup}
          >
            {editingGroupId ? 'Update Group' : 'Add Group'}
          </Button>
        </CardContent>
      </Card>

      {/* Group List */}
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Existing Groups</CardTitle>
          <CardDescription>Manage existing question groups.</CardDescription>
        </CardHeader>
        <CardContent>
          {groups.length === 0 ? (
            <div>No groups added yet.</div>
          ) : (
            <div className="grid gap-4">
              {groups.map(group => (
                <Card key={group.id}>
                  <CardHeader>
                    <CardTitle>{group.name}</CardTitle>
                    <CardDescription>ID: {group.id}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex gap-2">
                    <Button size="sm" onClick={() => startEditing(group.id)}>Edit</Button>
                    <Button size="sm" variant="destructive" onClick={() => deleteGroup(group.id)}>Delete</Button>
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
