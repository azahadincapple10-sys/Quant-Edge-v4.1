'use server';
/**
 * @fileOverview An AI agent that helps optimize algorithmic trading strategies.
 *
 * - optimizeStrategy - A function that takes a trading strategy and an optimization goal
 *   and suggests optimal parameters or modifications.
 * - AiStrategyOptimizerInput - The input type for the optimizeStrategy function.
 * - AiStrategyOptimizerOutput - The return type for the optimizeStrategy function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AiStrategyOptimizerInputSchema = z.object({
  strategyCode: z.string().describe('The Python-like code for the trading strategy to optimize.'),
  optimizationGoal:
    z.string().describe(
      "The user's optimization goal for the strategy (e.g., 'maximize profit', 'minimize drawdown', 'increase win rate')."
    ),
});
export type AiStrategyOptimizerInput = z.infer<typeof AiStrategyOptimizerInputSchema>;

const AiStrategyOptimizerOutputSchema = z.object({
  suggestedParameters:
    z.record(z.string(), z.any()).describe('Key-value pairs of suggested optimal parameters for the strategy.'),
  modifications:
    z.string().describe('Suggested code modifications or structural changes to the strategy to achieve the goal.'),
  explanation: z.string().describe('A detailed explanation of the suggested parameters and modifications.'),
});
export type AiStrategyOptimizerOutput = z.infer<typeof AiStrategyOptimizerOutputSchema>;

export async function optimizeStrategy(
  input: AiStrategyOptimizerInput
): Promise<AiStrategyOptimizerOutput> {
  return aiStrategyOptimizerFlow(input);
}

const optimizeStrategyPrompt = ai.definePrompt({
  name: 'optimizeStrategyPrompt',
  input: {schema: AiStrategyOptimizerInputSchema},
  output: {schema: AiStrategyOptimizerOutputSchema},
  prompt: `You are an expert quantitative analyst specializing in algorithmic trading strategy optimization.
Your task is to analyze a given trading strategy and an optimization goal, then suggest optimal parameters and potential code modifications to improve its performance.

### Trading Strategy Code:
\`\`\`python
{{{strategyCode}}}
\`\`\`

### Optimization Goal:
{{{optimizationGoal}}}


Based on the strategy code and the optimization goal, provide:
1.  **suggestedParameters**: A JSON object of key-value pairs for optimal parameters (e.g., 'slow_sma_period': 200, 'fast_sma_period': 50). Only include parameters that are directly optimizable or commonly tuned in such strategies. If the strategy uses hyperparameters, focus on optimizing those.
2.  **modifications**: A clear, concise string describing any recommended code modifications or structural changes to the strategy itself. This could include adding new indicators, changing logic, or implementing different risk management rules. If no code modifications are strictly necessary, state that.
3.  **explanation**: A detailed explanation of why these parameters and modifications were suggested, and how they are expected to help achieve the specified optimization goal. Reference specific parts of the strategy or common trading principles.

Ensure your suggestions are practical and align with typical algorithmic trading practices.`,
});

const aiStrategyOptimizerFlow = ai.defineFlow(
  {
    name: 'aiStrategyOptimizerFlow',
    inputSchema: AiStrategyOptimizerInputSchema,
    outputSchema: AiStrategyOptimizerOutputSchema,
  },
  async input => {
    const {output} = await optimizeStrategyPrompt(input);
    return output!;
  }
);
