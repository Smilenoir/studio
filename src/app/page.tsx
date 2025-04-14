'use client'
import {Button} from '@/components/ui/button';
import {useRouter} from 'next/navigation';

export default function Home() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2 bg-gray-900 text-white">
      <h1 className="text-3xl font-bold mb-4">QuizWhiz</h1>
      <div className="flex space-x-4">
        <Button onClick={() => router.push('/admin')}>Admin</Button>
      </div>
      
    </div>
  );
}

