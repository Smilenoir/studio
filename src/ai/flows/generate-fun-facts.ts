'use server';
/**
 * @fileOverview Fun fact generator flow.
 *
 * - generateFunFactsFlow - A flow that generates fun facts about quiz questions.
 * - GenerateFunFactsInput - The input type for the generateFunFactsFlow function.
 * - GenerateFunFactsOutput - The return type for the generateFunFactsFlow function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';
import {generateFunFacts, FunFact} from '@/services/fun-fact';

const GenerateFunFactsInputSchema = z.object({
  topics: z.array(z.string()).describe('List of topics related to quiz questions.'),
});
export type GenerateFunFactsInput = z.infer<typeof GenerateFunFactsInputSchema>;

const GenerateFunFactsOutputSchema = z.array(z.object({
  title: z.string().describe('The title of the fun fact.'),
  fact: z.string().describe('The content of the fun fact.'),
}));
export type GenerateFunFactsOutput = z.infer<typeof GenerateFunFactsOutputSchema>;

export async function generateFunFactsWrapper(input: GenerateFunFactsInput): Promise<GenerateFunFactsOutput> {
  return generateFunFactsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateFunFactsPrompt',
  input: {
    schema: z.object({
      topics: z.array(z.string()).describe('List of topics related to quiz questions.'),
    }),
  },
  output: {
    schema: z.array(z.object({
      title: z.string().describe('The title of the fun fact.'),
      fact: z.string().describe('The content of the fun fact.'),
    })),
  },
  prompt: `You are an AI assistant that generates fun facts about given topics.

  Topics: {{{topics}}}
  
  Generate fun facts for these topics. Return the facts in JSON format.
  `,
});

const generateFunFactsFlow = ai.defineFlow<
  typeof GenerateFunFactsInputSchema,
  typeof GenerateFunFactsOutputSchema
>(
  {
    name: 'generateFunFactsFlow',
    inputSchema: GenerateFunFactsInputSchema,
    outputSchema: GenerateFunFactsOutputSchema,
  },
  async input => {
    // const {output} = await prompt(input);
    // return output!;

    // Call the service to get fun facts
    const funFacts: FunFact[] = await generateFunFacts(input.topics[0]);
    return funFacts;
  }
);
