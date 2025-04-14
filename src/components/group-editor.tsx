'use client';

import {useState, useEffect} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';

interface Group {
  id: string;
  name: string;
}

const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15);
};

export const GroupEditor = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupNameError, setGroupNameError] = useState<string | null>(null);

  useEffect(() => {
    console.log('Groups updated:', groups);
  }, [groups]);

  const handleGroupNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewGroupName(e.target.value);
    setGroupNameError(null);
  };

  const addGroup = () => {
    if (newGroupName.trim() === '') {
      setGroupNameError('Group name cannot be empty.');
      return;
    }

    if (groups.some(group => group.name === newGroupName)) {
      setGroupNameError('Group name already exists.');
      return;
    }

    const newId = generateId();
    const groupToAdd: Group = {id: newId, name: newGroupName};
    setGroups([...groups, groupToAdd]);
    setNewGroupName('');
  };

  const startEditing = (id: string) => {
    const groupToEdit = groups.find(group => group.id === id);
    if (groupToEdit) {
      setNewGroupName(groupToEdit.name);
      setEditingGroupId(id);
    }
  };

  const updateGroup = () => {
    if (newGroupName.trim() === '') {
      setGroupNameError('Group name cannot be empty.');
      return;
    }

    if (groups.some(group => group.name === newGroupName && group.id !== editingGroupId)) {
      setGroupNameError('Group name already exists.');
      return;
    }

    if (editingGroupId) {
      const updatedGroups = groups.map(group =>
        group.id === editingGroupId ? {id: editingGroupId, name: newGroupName} : group
      );
      setGroups(updatedGroups);
      setEditingGroupId(null);
      setNewGroupName('');
    }
  };

  const deleteGroup = (id: string) => {
    const updatedGroups = groups.filter(group => group.id !== id);
    setGroups(updatedGroups);
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
