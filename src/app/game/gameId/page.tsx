'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient'; // Assuming you have your Supabase client initialized here

interface UserSession {
  nickname: string | null;
  id: string | null;
  type: string | null;
}

const GamePage = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [sessionData, setSessionData] = useState<UserSession | null>(null);

  useEffect(() => {
    const loadSession = async () => {
      // Replace this with your actual session loading logic
      // For example, fetching from localStorage or a context
      const userSession = JSON.parse(localStorage.getItem('userSession') || '{}');
      setSessionData(userSession);

      if (userSession && userSession.id) {
        // Fetch user data from Supabase to get the 'type'
        const { data, error } = await supabase
          .from('users')
          .select('type')
          .eq('id', userSession.id)
          .single();

        if (error) {
          console.error('Error fetching user data:', error);
          // Handle error appropriately, e.g., redirect or show an error message
        }

        if (data && data.type === 'admin') {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      }
    };

    loadSession();
  }, []);

  const title = isAdmin ? 'Admin Game Page' : 'Player Game Page';

  return (
    <div>
      <h1>{title}</h1>
      {/* Rest of your game page content here */}
    </div>
  );
};

export default GamePage;