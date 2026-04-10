'use server';
/**
 * @fileOverview A multi-agent trading orchestrator using Genkit.
 * 
 * This flow acts as a central reasoning loop that uses specialized tools
 * to perform Technical Analysis, Sentiment Analysis, and Risk Validation.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// --- Tool Definitions (The "Specialized Agents") ---

/**
 * Technical Analysis Tool
 */
const getTechnicalAnalysis = ai.defineTool(
  {
    name: 'getTechnicalAnalysis',
    description: 'Calculates technical indicators like RSI, MACD, and Moving Averages for a given symbol.',
    inputSchema: z.object({
      symbol: z.string().describe('The trading symbol (e.g., BTC/USDT)'),
      timeframe: z.string().describe('The timeframe (e.g., 1h, 1d)'),
    }),
    outputSchema: z.object({
      rsi: z.number(),
      macd: z.string(),
      trend: z.enum(['bullish', 'bearish', 'neutral']),
      summary: z.string(),
    }),
  },
  async (input) => {
    // In a real app, this would call a TA library or service.
    // For the prototype, we simulate expert analysis.
    const isBullish = Math.random() > 0.4;
    return {
      rsi: Math.floor(Math.random() * 40) + (isBullish ? 40 : 20),
      macd: 'Bullish Crossover detected',
      trend: isBullish ? 'bullish' : 'bearish',
      summary: `Technicals show a strong ${isBullish ? 'uptrend' : 'downtrend'} pattern with increasing volume support.`,
    };
  }
);

/**
 * Sentiment Analysis Tool
 */
const getMarketSentiment = ai.defineTool(
  {
    name: 'getMarketSentiment',
    description: 'Scans news and social media to provide a sentiment score for a symbol.',
    inputSchema: z.object({
      symbol: z.string(),
    }),
    outputSchema: z.object({
      score: z.number().describe('Sentiment score from -1 (very bearish) to 1 (very bullish)'),
      topHeadlines: z.array(z.string()),
      impact: z.string(),
    }),
  },
  async (input) => {
    const score = (Math.random() * 2) - 1;
    return {
      score,
      topHeadlines: [
        `Institutional inflows increase for ${input.symbol}`,
        `Regulatory update pending in key markets`,
      ],
      impact: score > 0 ? 'Positive news flow is driving retail interest.' : 'Negative headlines are causing short-term FUD.',
    };
  }
);

/**
 * Risk Management Tool
 */
const validateRisk = ai.defineTool(
  {
    name: 'validateRisk',
    description: 'Validates a proposed trade against portfolio risk limits.',
    inputSchema: z.object({
      symbol: z.string(),
      action: z.enum(['BUY', 'SELL']),
      amount: z.number(),
    }),
    outputSchema: z.object({
      approved: z.boolean(),
      reason: z.string(),
      suggestedStopLoss: z.number().optional(),
    }),
  },
  async (input) => {
    const approved = input.amount < 10000; // Example limit
    return {
      approved,
      reason: approved ? 'Trade within standard risk parameters.' : 'Proposed amount exceeds single-asset exposure limits.',
      suggestedStopLoss: 0.95, // 5% below entry
    };
  }
);

// --- Agent Flow ---

const TradingAgentInputSchema = z.object({
  prompt: z.string().describe('Natural language command like "Analyze BTC and suggest a trade" or "Screen for bullish stocks".'),
});

const TradingAgentOutputSchema = z.object({
  thought: z.string().describe('The agent\'s reasoning process.'),
  action: z.string().optional().describe('The final recommended action (BUY/SELL/HOLD).'),
  details: z.any().optional().describe('Structured data results from the tools.'),
  finalResponse: z.string().describe('A natural language summary for the user.'),
});

export type TradingAgentOutput = z.infer<typeof TradingAgentOutputSchema>;

export async function runTradingAgent(input: { prompt: string }): Promise<TradingAgentOutput> {
  const { text, output } = await ai.generate({
    model: 'googleai/gemini-2.0-flash',
    system: `You are the QuantEdge AI Orchestrator. Your role is to coordinate specialized analysis agents to provide high-fidelity trading signals.
    
    Roles:
    1. Technical Analyst: Use getTechnicalAnalysis to check price patterns.
    2. Sentiment Analyst: Use getMarketSentiment to gauge market mood.
    3. Risk Manager: Use validateRisk to ensure the trade is safe.

    Process:
    - If a user asks for analysis of a specific symbol, use all tools to provide a comprehensive report.
    - If a user asks for a trade, you MUST consult the Risk Manager before providing a signal.
    - Always output a structured decision.`,
    prompt: input.prompt,
    tools: [getTechnicalAnalysis, getMarketSentiment, validateRisk],
  });

  // Extract structured data if Gemini provided it, or fallback to the text
  return {
    thought: "Analyzing market data across multiple specialized domains...",
    finalResponse: text || "Analysis complete.",
    details: output,
  };
}
