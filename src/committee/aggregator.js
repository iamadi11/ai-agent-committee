/**
 * Committee Aggregator
 * Evaluates all agent outputs and produces a final synthesis
 */

import { OpenAIAgent } from '../agents/openaiAgent.js';
import { AnthropicAgent } from '../agents/anthropicAgent.js';
import { GeminiAgent } from '../agents/geminiAgent.js';
import { getDefaultProvider, getApiKey, PROVIDERS } from '../utils/env.js';
import { log, error } from '../utils/logger.js';
import { ProviderError, ValidationError } from '../utils/errors.js';

/**
 * Creates an aggregator agent instance
 * @param {string} provider - Provider name (optional, uses default if not provided)
 * @param {string} model - Model name (optional, uses best available if not provided)
 * @returns {Promise<BaseAgent|null>}
 */
async function createAggregatorAgent(provider = null, model = null) {
  const targetProvider = provider || getDefaultProvider();
  if (!targetProvider) {
    return null;
  }

  const apiKey = getApiKey(targetProvider);
  if (!apiKey) {
    return null;
  }

  // Determine which model to use
  let targetModel = model;
  if (!targetModel) {
    // Fetch and select best available model
    try {
      let agent;
      switch (targetProvider) {
        case PROVIDERS.OPENAI:
          agent = new OpenAIAgent(apiKey, { temperature: 0.3 });
          break;
        case PROVIDERS.ANTHROPIC:
          agent = new AnthropicAgent(apiKey, { temperature: 0.3 });
          break;
        case PROVIDERS.GEMINI:
          agent = new GeminiAgent(apiKey, { temperature: 0.3 });
          break;
        default:
          return null;
      }
      
      targetModel = await agent.getBestAvailableModel();
      log(`[Aggregator] Selected best available model: ${targetModel}`);
    } catch (error) {
      error(`[Aggregator] Failed to fetch available models, using default: ${error.message}`);
      // Fall back to default model
      switch (targetProvider) {
        case PROVIDERS.OPENAI:
          targetModel = 'gpt-4o-mini';
          break;
        case PROVIDERS.ANTHROPIC:
          targetModel = 'claude-3-5-sonnet-20241022';
          break;
        case PROVIDERS.GEMINI:
          targetModel = 'gemini-pro';
          break;
        default:
          return null;
      }
    }
  }

  if (!targetModel) {
    return null;
  }

  switch (targetProvider) {
    case PROVIDERS.OPENAI:
      return new OpenAIAgent(apiKey, { model: targetModel, temperature: 0.3 });
    case PROVIDERS.ANTHROPIC:
      return new AnthropicAgent(apiKey, { model: targetModel, temperature: 0.3 });
    case PROVIDERS.GEMINI:
      return new GeminiAgent(apiKey, { model: targetModel, temperature: 0.3 });
    default:
      return null;
  }
}

/**
 * Generates aggregator prompt from agent outputs
 * @param {Object} agentOutputs - Object mapping agent names to their responses
 * @param {string} originalRequest - Original user request
 * @returns {string}
 */
function generateAggregatorPrompt(agentOutputs, originalRequest) {
  const agentList = Object.entries(agentOutputs)
    .map(([agentName, response]) => {
      return `=== ${agentName} ===\n${response}\n`;
    })
    .join('\n');

  return `You are an unbiased Committee Aggregator Agent. Your role is to evaluate all agent outputs and synthesize a comprehensive final result.

Original Request: ${originalRequest}

Agent Outputs:
${agentList}

Your Task:
1. Review ALL agent outputs above objectively
2. Evaluate the reasoning quality of each agent
3. Identify the best insights from each agent
4. Synthesize a comprehensive final result that combines the best ideas
5. Remain completely unbiased - evaluate based on merit only
6. Do NOT favor any specific agent

Provide your final judgment in this format:
{
  "winner": "<agent_name>",
  "synthesis": "<comprehensive merged result>",
  "recommendations": ["<action item 1>", "<action item 2>", ...],
  "finalCode": "<final code implementation if applicable>"
}

Be concise and focused. Prioritize actionable recommendations.`;
}

/**
 * Heuristic scoring fallback when LLM is unavailable
 * @param {Object} agentOutputs - Agent outputs
 * @returns {Object}
 */
function heuristicScoring(agentOutputs) {
  const scores = {};
  const outputs = Object.entries(agentOutputs);

  // Simple heuristic: length, keyword presence, structure
  for (const [agentName, response] of outputs) {
    let score = 0;
    const responseLower = response.toLowerCase();

    // Length score (moderate length is good)
    const length = response.length;
    if (length > 200 && length < 2000) score += 2;
    else if (length > 50) score += 1;

    // Structure score (has bullet points, code blocks, etc.)
    if (response.includes('-') || response.includes('*')) score += 1;
    if (response.includes('```')) score += 1;
    if (response.includes('\n\n')) score += 1;

    // Keyword presence (actionable terms)
    const actionableKeywords = ['implement', 'recommend', 'suggest', 'should', 'consider', 'use', 'create'];
    const keywordCount = actionableKeywords.filter(kw => responseLower.includes(kw)).length;
    score += Math.min(keywordCount, 3);

    scores[agentName] = score;
  }

  // Find winner
  const winner = Object.entries(scores).reduce((a, b) => scores[a[0]] > scores[b[0]] ? a : b)[0];

  // Create synthesis (combine all outputs)
  const synthesis = outputs
    .map(([name, response]) => `[${name}]: ${response.substring(0, 300)}...`)
    .join('\n\n');

  return {
    winner,
    synthesis,
    recommendations: ['Review all agent outputs', 'Implement best practices from winner'],
    finalCode: null,
    method: 'heuristic'
  };
}

/**
 * Aggregates agent outputs using LLM judge (preferred) or heuristic (fallback)
 * @param {Object} agentOutputs - Object mapping agent names to their responses
 * @param {string} originalRequest - Original user request
 * @param {string} provider - Optional provider for aggregator (uses default if not provided)
 * @param {string} model - Optional model for aggregator (uses default for provider if not provided)
 * @returns {Promise<Object>} Final synthesis with winner, synthesis, recommendations, etc.
 */
export async function aggregate(agentOutputs, originalRequest, provider = null, model = null) {
  if (!agentOutputs || typeof agentOutputs !== 'object' || Object.keys(agentOutputs).length === 0) {
    throw new ValidationError('No agent outputs provided for aggregation');
  }

  if (!originalRequest || typeof originalRequest !== 'string' || originalRequest.trim().length === 0) {
    throw new ValidationError('Original request is required and must be a non-empty string');
  }

  log('[Aggregator] Starting aggregation...');
  log(`[Aggregator] Processing ${Object.keys(agentOutputs).length} agent outputs`);

  // Check if all agent outputs are errors
  const allOutputs = Object.values(agentOutputs);
  const allAreErrors = allOutputs.every(output => 
    typeof output === 'string' && (
      output.startsWith('Error:') || 
      output.toLowerCase().includes('api error') ||
      output.toLowerCase().includes('failed')
    )
  );

  if (allAreErrors && allOutputs.length > 0) {
    log('[Aggregator] All agents failed - returning error summary');
    const errorSummary = allOutputs
      .map((err, idx) => `Agent ${idx + 1}: ${err}`)
      .join('\n');
    
    return {
      winner: null,
      synthesis: `All agents failed to process the request. Error details:\n\n${errorSummary}\n\nPlease check your API keys, quotas, and network connectivity.`,
      recommendations: [
        'Check API key configuration and quotas',
        'Verify network connectivity',
        'Review individual agent error messages above',
        'Consider using a different LLM provider if available'
      ],
      finalCode: null,
      method: 'error_fallback',
      timestamp: new Date().toISOString(),
      allAgentsFailed: true
    };
  }

  // Try LLM-based aggregation first
  const aggregatorAgent = await createAggregatorAgent(provider, model);
  
  if (aggregatorAgent) {
    const maxRetries = 2;
    let lastError = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          // Extract retry delay from error message if available
          let baseDelay = 20000; // Default 20 seconds
          if (lastError && lastError.message) {
            const delayMatch = lastError.message.match(/try again in (\d+)s/i);
            if (delayMatch) {
              baseDelay = parseInt(delayMatch[1]) * 1000;
            }
          }
          // Exponential backoff: wait longer on subsequent retries
          // attempt 1: baseDelay, attempt 2: baseDelay * 2
          const retryDelay = baseDelay * attempt;
          log(`[Aggregator] Retrying after ${retryDelay / 1000}s (attempt ${attempt + 1}/${maxRetries + 1})...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
        
        log('[Aggregator] Using LLM judge agent');
        const prompt = generateAggregatorPrompt(agentOutputs, originalRequest);
        const response = await aggregatorAgent.process(prompt);

        // Try to parse JSON response
        try {
          // Extract JSON from response if it's wrapped in text
          const jsonMatch = response.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            log('[Aggregator] Successfully parsed LLM response');
            return {
              ...parsed,
              method: 'llm',
              timestamp: new Date().toISOString()
            };
          }
        } catch (parseError) {
          log('[Aggregator] Could not parse JSON, using full response as synthesis');
        }

        // If JSON parsing failed, use response as synthesis
        return {
          winner: Object.keys(agentOutputs)[0], // Default to first agent
          synthesis: response,
          recommendations: ['Review the synthesis above', 'Implement based on agent recommendations'],
          finalCode: null,
          method: 'llm',
          timestamp: new Date().toISOString()
        };
      } catch (err) {
        lastError = err;
        const isRateLimit = err.message && (
          err.message.includes('429') || 
          err.message.toLowerCase().includes('rate limit') ||
          err.message.toLowerCase().includes('requests per min')
        );
        
        if (isRateLimit && attempt < maxRetries) {
          // Will retry on next iteration
          continue;
        } else {
          // Not a rate limit error, or we've exhausted retries
          if (isRateLimit) {
            error(`[Aggregator] LLM aggregation failed after ${maxRetries + 1} attempts: ${err.message}`);
          } else {
            error(`[Aggregator] LLM aggregation failed: ${err.message}`);
          }
          error('[Aggregator] Falling back to heuristic scoring');
          break;
        }
      }
    }
  } else {
    log('[Aggregator] No LLM provider available, using heuristic scoring');
  }

  // Fallback to heuristic scoring
  const result = heuristicScoring(agentOutputs);
  result.timestamp = new Date().toISOString();
  log('[Aggregator] Aggregation completed using heuristic method');
  return result;
}

