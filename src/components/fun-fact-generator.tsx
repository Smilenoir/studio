import {useEffect, useState} from 'react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card"
import {generateFunFactsWrapper} from '@/ai/flows/generate-fun-facts';

interface FunFactGeneratorProps {
  topics: string[];
}

export const FunFactGenerator: React.FC<FunFactGeneratorProps> = ({topics}) => {
  const [funFacts, setFunFacts] = useState<
    {title: string; fact: string}[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFunFacts = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await generateFunFactsWrapper({topics: topics});
        setFunFacts(result);
      } catch (e: any) {
        setError(e.message || 'Failed to generate fun facts.');
      } finally {
        setIsLoading(false);
      }
    };

    if (topics.length > 0) {
      fetchFunFacts();
    }
  }, [topics]);

  if (isLoading) {
    return <div>Loading fun facts...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">Fun Facts</h2>
      {funFacts.length > 0 ? (
        funFacts.map((fact, index) => (
          <Card key={index} className="mb-4">
            <CardHeader>
              <CardTitle>{fact.title}</CardTitle>
              <CardDescription>Interesting Fact</CardDescription>
            </CardHeader>
            <CardContent>
              <p>{fact.fact}</p>
            </CardContent>
          </Card>
        ))
      ) : (
        <div>No fun facts generated.</div>
      )}
    </div>
  );
};
