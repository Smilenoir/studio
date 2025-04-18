'use client';

import { useState } from 'react';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {QuestionEditor} from '@/components/question-editor';
import {Dashboard} from '@/components/dashboard';
import {GroupEditor} from '@/components/group-editor';
import {GameSessions} from "@/components/game-sessions";
import {Button} from "@/components/ui/button";
import {ArrowLeft} from "lucide-react";
import {useRouter} from "next/navigation";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {Users} from "@/components/users";

interface GameSession {
  id: string;
  sessionName: string;
  // Add other properties as needed
}

export default function AdminPage() {
  const router = useRouter();
  // Placeholder data for game sessions table
  const [sessions, setSessions] = useState<GameSession[]>([
    { id: "session1", sessionName: "Session One" },
    { id: "session2", sessionName: "Session Two" },
    { id: "session3", sessionName: "Session Three" },
  ]);

  const handleTakeControl = (gameId: string) => {
    router.push(`/game/${gameId}`);
  };




  return (
    <div className="flex flex-col items-center min-h-screen py-2 bg-gray-900 text-white">
      <div className="absolute bottom-4 left-4">
        <Button
          variant="outline"
          className="h-10 w-10 p-0 bg-black border-gray-500 text-white rounded-full"
          onClick={() => router.push('/')}
        >
          <ArrowLeft
            className="h-6 w-6"
            aria-hidden="true"
          />
        </Button>
      </div>
      <h1 className="text-3xl font-bold mb-4">Admin Page</h1>
      <Tabs defaultValue="dashboard" className="w-full max-w-4xl">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="sessions">Game Sessions</TabsTrigger>
          <TabsTrigger value="questions">Question Editor</TabsTrigger>
          <TabsTrigger value="groups">Group Editor</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard" className="mt-4">
          <Dashboard />
        </TabsContent>       
         <TabsContent value="sessions" className="mt-4">
           <GameSessions />

          </TabsContent>
        <TabsContent value="questions" className="mt-4">
          <QuestionEditor />
        </TabsContent>
        <TabsContent value="groups" className="mt-4">
          <GroupEditor />
        </TabsContent>
          <TabsContent value="users" className="mt-4">
            <Users />
          </TabsContent>
      </Tabs>
    </div>
  );
}


