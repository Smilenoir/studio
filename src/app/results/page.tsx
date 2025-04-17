'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PlayerResult {
  nickname: string;
  score: number;
  rank: number;
}

const ResultsPage = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const [results, setResults] = useState<PlayerResult[]>([]);

  useEffect(() => {
    const fetchResults = async () => {
      if (!gameId) return;

      try {
        const { data: redisData, error: redisError } = await supabase
          .from('redis')
          .select('value')
          .eq('key', gameId)
          .maybeSingle();

        if (redisError) {
          console.error('Error fetching Redis data:', redisError);
          return;
        }

        if (redisData && redisData.value) {
          const scores = JSON.parse(redisData.value);
          const playerIds = Object.keys(scores);

          const { data: usersData, error: usersError } = await supabase
            .from('users')
            .select('id, nickname')
            .in('id', playerIds);

          if (usersError) {
            console.error('Error fetching user nicknames:', usersError);
            return;
          }

          const playerNicknames: { [key: string]: string } = {};
          if (usersData) {
            usersData.forEach((user) => {
              playerNicknames[user.id] = user.nickname;
            });
          }


          const resultsArray = Object.entries(scores).map(([userId, score]) => ({
            nickname: playerNicknames[userId] || 'Unknown Player',
            score: Number(score),
          }));

          resultsArray.sort((a, b) => b.score - a.score);

          const rankedResults = resultsArray.map((result, index) => ({
            ...result,
            rank: index + 1,
          }));

          setResults(rankedResults);
        }
      } catch (error) {
        console.error('Unexpected error fetching results:', error);
      }
    };

    fetchResults();
  }, [gameId]);

  return (
    <div className="container mx-auto py-12">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Game Results</CardTitle>
        </CardHeader>
        <CardContent>
          {results.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((result) => (
                  <TableRow key={result.nickname}>
                    <TableCell>{result.rank}</TableCell>
                    <TableCell>{result.nickname}</TableCell>
                    <TableCell className="text-right">{result.score}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center">No results found.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ResultsPage;