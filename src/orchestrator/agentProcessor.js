/**
 * Agent Processor - Processes agents using worker threads and LLM APIs
 * Removed all Cursor CLI dependencies
 */

import { Worker } from 'worker_threads';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getAgents, getAgentGuidelines } from '../taskManager.js';
import { getDefaultProvider, getAvailableProviders, PROVIDERS, isFallbackMode, getApiKey } from '../utils/env.js';
import { aggregate } from '../committee/aggregator.js';
import { log, error as logError, warn as logWarn } from '../utils/logger.js';
import { WorkerError, TimeoutError, ConfigurationError } from '../utils/errors.js';
import { OpenAIAgent } from '../agents/openaiAgent.js';
import { AnthropicAgent } from '../agents/anthropicAgent.js';
import { GeminiAgent } from '../agents/geminiAgent.js';
import { GroqAgent } from '../agents/groqAgent.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Processes a single agent and generates its prompt
 * @param {string} agentName - Name of the agent
 * @param {string} userRequest - User's request
 * @param {string} context - Optional context from other chats
 * @param {string} presetName - Name of the preset (default: 'specialized')
 * @returns {Promise<Object>} Agent prompt configuration
 */
export async function processAgent(agentName, userRequest, context = '', presetName = 'specialized') {
  const agents = await getAgents(presetName);
  const agent = agents.find(a => a.name === agentName);
  if (!agent) {
    throw new Error(`Unknown agent: ${agentName} in preset "${presetName}"`);
  }

  // Generate agent-specific guidelines
  const guidelines = await getAgentGuidelines(agentName, userRequest, presetName, context);
  
  // Build the full prompt with context
  let agentPrompt = `\n${'='.repeat(80)}\n`;
  agentPrompt += `AGENT: ${agentName} (${agent.role})\n`;
  agentPrompt += `${'='.repeat(80)}\n\n`;
  agentPrompt += guidelines;
  
  if (context) {
    agentPrompt += `\n\n--- CONTEXT FROM OTHER CHAT WINDOWS ---\n`;
    agentPrompt += `${context}\n`;
    agentPrompt += `--- END CONTEXT ---\n\n`;
    agentPrompt += `IMPORTANT: Consider the above context when providing your analysis.\n`;
    agentPrompt += `Incorporate relevant information from other conversations.\n`;
  }

  agentPrompt += `\n\n--- AGENT OUTPUT REQUEST ---\n`;
  agentPrompt += `As ${agent.role}, analyze the task and provide:\n`;
  agentPrompt += `1. Your analysis and recommendations\n`;
  agentPrompt += `2. Code examples if applicable\n`;
  agentPrompt += `3. Best practices specific to your role\n`;
  agentPrompt += `4. Any concerns or considerations\n`;

  return {
    agent: agentName,
    role: agent.role,
    description: agent.description,
    focus: agent.focus,
    prompt: agentPrompt,
    timestamp: new Date().toISOString()
  };
}

/**
 * Processes a single agent using worker thread with timeout
 * @param {Object} agentConfig - Agent configuration
 * @param {string} prompt - Agent prompt
 * @param {string} provider - LLM provider to use
 * @param {string} model - Model to use (optional, uses default for provider)
 * @param {number} timeoutMs - Timeout in milliseconds (default: 120000 = 2 minutes)
 * @returns {Promise<Object>} Agent response
 */
async function processAgentWithWorker(agentConfig, prompt, provider, model = null, timeoutMs = 120000) {
  return new Promise((resolve, reject) => {
    const workerPath = join(__dirname, '../workers/agentWorker.js');
    let worker = null;
    let timeoutId = null;
    let isResolved = false;

    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (worker) {
        try {
          worker.terminate();
        } catch (err) {
          // Ignore termination errors
        }
        worker = null;
      }
    };

    const resolveOnce = (value) => {
      if (isResolved) return;
      isResolved = true;
      cleanup();
      resolve(value);
    };

    const rejectOnce = (error) => {
      if (isResolved) return;
      isResolved = true;
      cleanup();
      reject(error);
    };

    try {
      worker = new Worker(workerPath, {
        workerData: {
          agentConfig,
          prompt,
          provider,
          options: {
            temperature: 0.7,
            maxTokens: 2000,
            ...(model ? { model } : {})
          }
        }
      });

      // Set timeout
      timeoutId = setTimeout(() => {
        rejectOnce(new TimeoutError(
          `Worker timeout after ${timeoutMs}ms`,
          agentConfig.name,
          timeoutMs
        ));
      }, timeoutMs);

      worker.on('message', (result) => {
        if (result.success) {
          resolveOnce({
            agent: result.agent,
            response: result.response,
            timestamp: result.timestamp,
            success: true
          });
        } else {
          resolveOnce({
            agent: result.agent,
            error: result.error,
            timestamp: result.timestamp,
            success: false
          });
        }
      });

      worker.on('error', (err) => {
        rejectOnce(new WorkerError(
          `Worker error: ${err.message}`,
          agentConfig.name,
          null
        ));
      });

      worker.on('exit', (code) => {
        if (!isResolved) {
          if (code !== 0) {
            rejectOnce(new WorkerError(
              `Worker stopped with exit code ${code}`,
              agentConfig.name,
              code
            ));
          } else {
            // Worker exited normally but no message received
            rejectOnce(new WorkerError(
              'Worker exited without sending a message',
              agentConfig.name,
              code
            ));
          }
        }
      });
    } catch (err) {
      rejectOnce(new WorkerError(
        `Failed to create worker: ${err.message}`,
        agentConfig.name,
        null
      ));
    }
  });
}

/**
 * Processes all agents in parallel using worker threads
 * @param {string} userRequest - User's request
 * @param {string} context - Optional context from other chats
 * @param {string} presetName - Name of the preset (default: 'specialized')
 * @param {string} provider - LLM provider to use (optional, uses default)
 * @param {string} model - Model to use (optional, uses default for provider)
 * @returns {Promise<Array<Object>>} Array of agent responses
 */
export async function processAllAgents(userRequest, context = '', presetName = 'specialized', provider = null, model = null) {
  const agents = await getAgents(presetName);
  const availableProviders = getAvailableProviders();
  const fallbackMode = isFallbackMode();
  
  if (fallbackMode) {
    logWarn('[AgentProcessor] ⚠️  FALLBACK MODE: No API keys configured. Agents will return prompts as responses.');
    logWarn('[AgentProcessor] To use LLM providers, set at least one API key in .env file');
  }

  const targetProvider = provider || getDefaultProvider();
  
  // If no model specified, fetch and select best available model
  let targetModel = model;
  if (!targetModel && !fallbackMode && targetProvider) {
    try {
      const apiKey = getApiKey(targetProvider);
      if (apiKey) {
        let agentInstance;
        switch (targetProvider) {
          case PROVIDERS.OPENAI:
            agentInstance = new OpenAIAgent(apiKey);
            break;
          case PROVIDERS.ANTHROPIC:
            agentInstance = new AnthropicAgent(apiKey);
            break;
          case PROVIDERS.GEMINI:
            agentInstance = new GeminiAgent(apiKey);
            break;
          case PROVIDERS.GROQ:
            agentInstance = new GroqAgent(apiKey);
            break;
        }
        if (agentInstance) {
          targetModel = await agentInstance.getBestAvailableModel();
          log(`[AgentProcessor] Selected best available model: ${targetModel}`);
        }
      }
    } catch (error) {
      logWarn(`[AgentProcessor] Failed to fetch available models, using default: ${error.message}`);
      // Continue with null model, which will use default in worker
    }
  }
  
  // In fallback mode, we'll process agents without LLM calls
  if (fallbackMode) {
    log(`[AgentProcessor] Processing ${agents.length} agents in FALLBACK MODE (prompt-only responses)`);
    log(`[AgentProcessor] Using preset: ${presetName}`);
    
    // Generate prompts for all agents
    const agentPrompts = await Promise.all(
      agents.map(agent => processAgent(agent.name, userRequest, context, presetName))
    );
    
    // Return prompts as responses in fallback mode
    return agentPrompts.map(agentPrompt => ({
      ...agentPrompt,
      actualResponse: `[FALLBACK MODE] This is the generated prompt for ${agentPrompt.agent}:\n\n${agentPrompt.prompt}\n\n⚠️  Note: No LLM API key configured. Set at least one API key in .env to get actual LLM responses.`,
      hasActualResponse: true,
      success: true,
      fallbackMode: true,
      timestamp: new Date().toISOString()
    }));
  }
  
  if (!targetProvider) {
    throw new ConfigurationError('No available LLM provider');
  }
  
  log(`[AgentProcessor] Processing ${agents.length} agents for request: ${userRequest.substring(0, 50)}...`);
  log(`[AgentProcessor] Using preset: ${presetName}`);
  log(`[AgentProcessor] Using provider: ${targetProvider}`);

  // Generate prompts for all agents
  const agentPrompts = await Promise.all(
    agents.map(agent => processAgent(agent.name, userRequest, context, presetName))
  );

  // Process all agents in parallel using worker threads
  log(`[AgentProcessor] Starting parallel execution with ${agents.length} worker threads...`);
  const startTime = Date.now();

  const agentResponses = await Promise.all(
    agentPrompts.map(async (agentPrompt, index) => {
      try {
        log(`[AgentProcessor] Processing agent ${index + 1}/${agents.length}: ${agentPrompt.agent}`);
        const agentConfig = {
          name: agentPrompt.agent,
          role: agentPrompt.role,
          description: agentPrompt.description,
          focus: agentPrompt.focus
        };
        const result = await processAgentWithWorker(agentConfig, agentPrompt.prompt, targetProvider, targetModel);
        
        if (result.success) {
          log(`[AgentProcessor] Agent ${agentPrompt.agent} completed successfully`);
          return {
            ...agentPrompt,
            actualResponse: result.response,
            hasActualResponse: true,
            success: true,
            timestamp: result.timestamp
          };
        } else {
          logError(`[AgentProcessor] Agent ${agentPrompt.agent} failed: ${result.error}`);
          return {
            ...agentPrompt,
            error: result.error,
            hasActualResponse: false,
            success: false,
            timestamp: result.timestamp
          };
        }
      } catch (err) {
        const errorMessage = err instanceof WorkerError || err instanceof TimeoutError
          ? err.message
          : `Unexpected error: ${err.message}`;
        logError(`[AgentProcessor] Error processing ${agentPrompt.agent}:`, errorMessage);
      return {
          ...agentPrompt,
          error: errorMessage,
          hasActualResponse: false,
          success: false,
        timestamp: new Date().toISOString()
      };
    }
    })
  );

  const duration = Date.now() - startTime;
  const successful = agentResponses.filter(r => r.success).length;
  log(`[AgentProcessor] All ${agentResponses.length} agents processed in ${(duration / 1000).toFixed(2)}s`);
  log(`[AgentProcessor] Successful: ${successful}/${agentResponses.length}`);

  return agentResponses;
}

/**
 * Orchestrates the complete workflow: process all agents, then aggregate
 * @param {string} userRequest - User's request
 * @param {string} context - Optional context from other chats
 * @param {string} agentPreset - Name of the agent preset (default: 'specialized')
 * @param {string} provider - LLM provider to use (optional, uses default)
 * @param {string} aggregatorProvider - Provider for aggregator (optional, uses default)
 * @param {string} model - Model to use for agents (optional, uses default for provider)
 * @param {string} aggregatorModel - Model to use for aggregator (optional, uses default for aggregator provider)
 * @returns {Promise<Object>} Complete workflow result with all agent responses and final synthesis
 */
export async function orchestrateWorkflow(
  userRequest,
  context = '',
  agentPreset = 'specialized',
  provider = null,
  aggregatorProvider = null,
  model = null,
  aggregatorModel = null
) {
  log(`[Orchestrator] Starting workflow for: ${userRequest.substring(0, 50)}...`);
  log(`[Orchestrator] Context provided: ${context ? 'Yes' : 'No'}`);
  log(`[Orchestrator] Agent preset: ${agentPreset}`);
  if (model) {
    log(`[Orchestrator] Using model: ${model}`);
  }
  
  // Step 1: Process all agents in parallel
  const agentResponses = await processAllAgents(userRequest, context, agentPreset, provider, model);
  const agents = await getAgents(agentPreset);
  
  // Step 2: Collect agent outputs for aggregation
  const agentOutputs = {};
  const isFallback = agentResponses.some(r => r.fallbackMode);
  
  for (const response of agentResponses) {
    if (response.success && response.actualResponse) {
      agentOutputs[response.agent] = response.actualResponse;
    } else {
      agentOutputs[response.agent] = response.error 
        ? `Error: ${response.error}` 
        : response.prompt;
    }
  }
  
  if (isFallback) {
    logWarn('[Orchestrator] ⚠️  Running in FALLBACK MODE - using heuristic aggregation only');
  }

  // Step 3: Aggregate using Committee Aggregator
  log(`[Orchestrator] Starting aggregation with ${Object.keys(agentOutputs).length} agent outputs...`);
  let finalSynthesis;
  try {
    finalSynthesis = await aggregate(agentOutputs, userRequest, aggregatorProvider, aggregatorModel);
    log(`[Orchestrator] Aggregation completed using ${finalSynthesis.method} method`);
  } catch (err) {
    logError(`[Orchestrator] Aggregation failed: ${err.message}`);
    // Fallback synthesis
    finalSynthesis = {
      winner: agentResponses[0]?.agent || 'Unknown',
      synthesis: 'Aggregation failed. Please review individual agent outputs.',
      recommendations: ['Review all agent outputs manually'],
      finalCode: null,
      method: 'fallback',
      timestamp: new Date().toISOString()
    };
  }
  
  log(`[Orchestrator] Workflow completed. ${agentResponses.length} agents processed.`);
  
  return {
    workflow: {
      userRequest: userRequest,
      context: context || null,
      agentPreset: agentPreset,
      provider: provider || getDefaultProvider(),
      model: model || null,
      aggregatorProvider: aggregatorProvider || provider || getDefaultProvider(),
      aggregatorModel: aggregatorModel || null,
      totalAgents: agents.length,
      processedAgents: agentResponses.length,
      successfulAgents: agentResponses.filter(a => a.success).length,
      failedAgents: agentResponses.filter(a => !a.success).length,
      timestamp: new Date().toISOString()
    },
    agents: agentResponses.map(agent => ({
      agent: agent.agent,
      role: agent.role,
      description: agent.description,
      focus: agent.focus,
      prompt: agent.prompt,
      actualResponse: agent.actualResponse || null,
      hasError: !!agent.error,
      hasActualResponse: agent.hasActualResponse || false,
      success: agent.success || false,
      timestamp: agent.timestamp
    })),
    finalSynthesis: {
      winner: finalSynthesis.winner,
      synthesis: finalSynthesis.synthesis,
      recommendations: finalSynthesis.recommendations || [],
      finalCode: finalSynthesis.finalCode || null,
      method: finalSynthesis.method,
      timestamp: finalSynthesis.timestamp
    },
    summary: {
      message: `Successfully processed ${agentResponses.filter(a => a.success).length} of ${agentResponses.length} agents. ` +
                `Final synthesis generated using ${finalSynthesis.method} method.`
    }
  };
}
