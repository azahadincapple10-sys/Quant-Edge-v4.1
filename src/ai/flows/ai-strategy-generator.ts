'use server';
/**
 * @fileOverview This file implements a Genkit flow for generating algorithmic trading strategy code.
 *
 * - generateStrategy - A function that generates trading strategy code from a natural language description.
 * - AiStrategyGeneratorInput - The input type for the generateStrategy function.
 * - AiStrategyGeneratorOutput - The return type for the generateStrategy function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AiStrategyGeneratorInputSchema = z.object({
  strategyDescription: z
    .string()
    .describe(
      'A natural language description of the algorithmic trading strategy to generate. Include details like entry/exit conditions, indicators, risk management, and any specific Jesse framework features to use.'
    ),
  programmingLanguage: z
    .enum(['python', 'typescript'])
    .default('python')
    .describe(
      'The desired programming language for the strategy code. Jesse strategies are typically Python-based.'
    ),
  existingCode: z
    .string()
    .optional()
    .describe('Optional: Existing strategy code to modify or use as a starting point.'),
});
export type AiStrategyGeneratorInput = z.infer<typeof AiStrategyGeneratorInputSchema>;

const AiStrategyGeneratorOutputSchema = z.object({
  generatedCode: z
    .string()
    .describe(
      'The generated algorithmic trading strategy code based on the description, formatted as a complete, runnable code block.'
    ),
  explanation: z
    .string()
    .optional()
    .describe(
      'A brief explanation of the generated code, highlighting key decisions and how it addresses the strategy description.'
    ),
});
export type AiStrategyGeneratorOutput = z.infer<typeof AiStrategyGeneratorOutputSchema>;

export async function generateStrategy(
  input: AiStrategyGeneratorInput
): Promise<AiStrategyGeneratorOutput> {
  return aiStrategyGeneratorFlow(input);
}

const aiStrategyGeneratorPrompt = ai.definePrompt({
  name: 'aiStrategyGeneratorPrompt',
  input: { schema: AiStrategyGeneratorInputSchema },
  output: { schema: AiStrategyGeneratorOutputSchema },
  prompt: `You are an expert algorithmic trading strategist specializing in the Jesse framework. Your task is to generate clean, runnable strategy code based on a natural language description.

Consider the following details about the Jesse framework:
- Strategies are typically Python classes inheriting from \`Strategy\`.
- Indicators are accessed via \`ta.indicator(self.candles, period)\`.
- Order placement uses \`self.buy\`, \`self.sell\`, \`self.take_profit\`, \`self.stop_loss\`.
- Quantity calculation can use \`utils.size_to_qty(capital_percentage, entry_price)\`.
- Hyperparameters are defined in a \`hyperparameters()\` method and accessed via \`self.hp['param_name']\`.

Here's an example of a Jesse strategy:
\`\`\`python
class GoldenCross(Strategy):
    def should_long(self):
        short_ema = ta.ema(self.candles, 8)
        long_ema = ta.ema(self.candles, 21)
        return short_ema > long_ema

    def go_long(self):
        entry_price = self.price - 10
        qty = utils.size_to_qty(self.balance*0.05, entry_price)
        self.buy = qty, entry_price
        self.take_profit = qty, entry_price*1.2
        self.stop_loss = qty, entry_price*0.9

    def hyperparameters(self):
        return [
            {'name': 'slow_sma_period', 'type': int, 'min': 150, 'max': 210, 'default': 200},
            {'name': 'fast_sma_period', 'type': int, 'min': 20, 'max': 100, 'default': 50},
        ]
\`\`\`

Your goal is to output a JSON object with two fields: \`generatedCode\` (the strategy code) and \`explanation\` (a brief description).

## Strategy Description:
{{{strategyDescription}}}

{{#if existingCode}}
## Existing Code to Consider/Modify:
\`\`\`{{{programmingLanguage}}}
{{{existingCode}}}
\`\`\`
{{/if}}

Generate the strategy code in the requested \`programmingLanguage\` (defaulting to Python) within the \`generatedCode\` field, and provide a concise \`explanation\`.`,
});

const aiStrategyGeneratorFlow = ai.defineFlow(
  {
    name: 'aiStrategyGeneratorFlow',
    inputSchema: AiStrategyGeneratorInputSchema,
    outputSchema: AiStrategyGeneratorOutputSchema,
  },
  async (input) => {
    const { output } = await aiStrategyGeneratorPrompt(input);
    return output!;
  }
);
