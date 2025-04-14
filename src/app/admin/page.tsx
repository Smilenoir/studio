'use client';

import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {QuestionEditor} from '@/components/question-editor';
import {Dashboard} from '@/components/dashboard';
import {GroupEditor} from '@/components/group-editor';

export default function AdminPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2 bg-gray-900 text-white">
      <h1 className="text-3xl font-bold mb-4">Admin Page</h1>
      <Tabs defaultValue="dashboard" className="w-full max-w-4xl">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="questions">Question Editor</TabsTrigger>
          <TabsTrigger value="groups">Group Editor</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard" className="mt-4">
          <Dashboard />
        </TabsContent>
        <TabsContent value="questions" className="mt-4">
          <QuestionEditor />
        </TabsContent>
        <TabsContent value="groups" className="mt-4">
          <GroupEditor />
        </TabsContent>
      </Tabs>
    </div>
  );
}
