/**
 * Agent Worker Thread
 * Runs agent processing in a separate thread for parallel execution
 */

import { parentPort, workerData } from 'worker_threads';
import { OpenAIAgent } from '../agents/openaiAgent.js';
import { AnthropicAgent } from '../agents/anthropicAgent.js';
import { GeminiAgent } from '../agents/geminiAgent.js';
import { getApiKey, PROVIDERS } from '../utils/env.js';
import { ProviderError, ValidationError } from '../utils/errors.js';

/**
 * Creates an agent instance based on provider
 * @param {string} provider - Provider name
 * @param {Object} options - Agent options
 * @returns {BaseAgent}
 */
function createAgent(provider, options = {}) {
  const apiKey = getApiKey(provider);
  if (!apiKey) {
    throw new Error(`API key not found for provider: ${provider}`);
  }

  switch (provider) {
    case PROVIDERS.OPENAI:
      return new OpenAIAgent(apiKey, options);
    case PROVIDERS.ANTHROPIC:
      return new AnthropicAgent(apiKey, options);
    case PROVIDERS.GEMINI:
      return new GeminiAgent(apiKey, options);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

/**
 * Processes agent request in worker thread
 */
async function processAgent() {
  try {
    const { agentConfig, prompt, provider, options } = workerData;

    // Validate worker data
    if (!agentConfig || typeof agentConfig !== 'object' || !agentConfig.name) {
      throw new ValidationError('Missing or invalid agentConfig in worker data');
    }
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      throw new ValidationError('Missing or invalid prompt in worker data');
    }
    if (!provider || typeof provider !== 'string') {
      throw new ValidationError('Missing or invalid provider in worker data');
    }

    // Create agent instance
    const agent = createAgent(provider, options);

    // Process the prompt
    const response = await agent.process(prompt, { stream: false });

    // Validate response
    if (!response || typeof response !== 'string' || response.trim().length === 0) {
      throw new ProviderError('Empty response from LLM provider', provider);
    }

    // Send success response
    parentPort.postMessage({
      success: true,
      agent: agentConfig.name,
      response: response.trim(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    // Send error response with proper error information
    const errorMessage = error instanceof ProviderError || error instanceof ValidationError
      ? error.message
      : `Unexpected error: ${error.message || 'Unknown error'}`;
    
    parentPort.postMessage({
      success: false,
      agent: workerData?.agentConfig?.name || 'Unknown',
      error: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
}

// Start processing when worker receives data
processAgent();

