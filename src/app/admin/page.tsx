'use client';

import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {QuestionEditor} from '@/components/question-editor';

export default function AdminPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2 bg-gray-900 text-white">
      <h1 className="text-3xl font-bold mb-4">Admin Page</h1>
      <Tabs defaultValue="dashboard" className="w-full max-w-2xl">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="questions">Question Editor</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard" className="mt-4">
          <h2 className="text-2xl font-semibold mb-2">Active Sessions</h2>
          <p>No active sessions at the moment.</p>
          {/* Add active sessions display here */}
        </TabsContent>
        <TabsContent value="questions" className="mt-4">
          <QuestionEditor />
        </TabsContent>
      </Tabs>
    </div>
  );
}
