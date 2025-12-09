#!/usr/bin/env node

/**
 * MCP Agent Committee Server
 * 
 * Provides multi-agent LLM processing via MCP protocol.
 * Works with any IDE that supports MCP (Cursor, VS Code, etc.)
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { orchestrateWorkflow } from '../orchestrator/agentProcessor.js';
import { validateProviders, getDefaultProvider, isFallbackMode } from '../utils/env.js';
import { log, error as logError, warn as logWarn } from '../utils/logger.js';
import { validateProcessCommitteeArgs } from '../utils/validator.js';
import { formatCommitteeResponse, formatErrorResponse, formatSuccessResponse } from '../utils/responseFormatter.js';
import { ValidationError, ConfigurationError, MCPError } from '../utils/errors.js';

/**
 * Main MCP tool - processes committee of agents
 */
const processCommitteeTool = {
  name: 'process_committee',
  description: 'Processes a request using a committee of AI agents in parallel. Each agent analyzes the request independently, then a Committee Aggregator synthesizes all outputs into a final result.',
  inputSchema: {
    type: 'object',
    properties: {
      request: {
        type: 'string',
        description: 'The task or request to process (e.g., "Refactor authentication code", "Create REST API", "Improve type safety")'
      },
      context: {
        type: 'string',
        description: 'Optional context from other chats or previous conversations'
      },
      agentPreset: {
        type: 'string',
        description: 'Agent preset: "specialized" (7 specialized agents), "frontend", "backend", or "fullstack" (default: "specialized")',
        default: 'specialized',
        enum: ['specialized', 'frontend', 'backend', 'fullstack']
      },
      provider: {
        type: 'string',
        description: 'LLM provider to use: "openai", "anthropic", or "gemini" (default: first available)',
        enum: ['openai', 'anthropic', 'gemini']
      },
      aggregatorProvider: {
        type: 'string',
        description: 'LLM provider for aggregator: "openai", "anthropic", or "gemini" (default: same as provider)',
        enum: ['openai', 'anthropic', 'gemini']
      },
      model: {
        type: 'string',
        description: 'Model to use for agents (e.g., "gpt-4o-mini", "claude-3-5-sonnet-20241022", "gemini-1.5-flash"). If not provided, uses default model for the selected provider.'
      },
      aggregatorModel: {
        type: 'string',
        description: 'Model to use for aggregator (e.g., "gpt-4o-mini", "claude-3-5-sonnet-20241022", "gemini-1.5-flash"). If not provided, uses default model for the aggregator provider.'
      }
    },
    required: ['request']
  }
};

/**
 * Main server initialization
 */
async function main() {
  // Check if fallback mode is needed
  const fallbackMode = isFallbackMode();
  
  if (fallbackMode) {
    logWarn('[Server] ⚠️  WARNING: No LLM API keys configured. Server will run in FALLBACK MODE.');
    logWarn('[Server] Agents will return prompts as responses. Set API keys in .env for full functionality.');
  } else {
    // Validate providers if not in fallback mode
    try {
      validateProviders();
    } catch (err) {
      const configError = new ConfigurationError(
        err.message || 'No LLM providers configured. Please set at least one API key in .env file'
      );
      logError('[Server] Configuration error:', configError.message);
      logError('[Server] Please set at least one API key in .env file');
      process.exit(1);
    }
  }

  // Create MCP server
  const server = new Server(
    {
      name: 'ai-agent-committee',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Handle tool listing
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [processCommitteeTool],
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === 'process_committee') {
      try {
        // Validate and sanitize input
        const validatedArgs = validateProcessCommitteeArgs(args);
        const { request: userRequest, context, agentPreset, provider, aggregatorProvider, model, aggregatorModel } = validatedArgs;

        log(`[Server] Processing committee request: ${userRequest.substring(0, 50)}...`);
        log(`[Server] Preset: ${agentPreset}, Provider: ${provider || getDefaultProvider()}`);
        if (model) {
          log(`[Server] Using model: ${model}`);
        }
        if (aggregatorModel) {
          log(`[Server] Using aggregator model: ${aggregatorModel}`);
        }

        // Orchestrate workflow
        const result = await orchestrateWorkflow(
          userRequest,
          context,
          agentPreset,
          provider,
          aggregatorProvider,
          model,
          aggregatorModel
        );

        // Format response using formatter utility
        const responseText = formatCommitteeResponse(
          result,
          userRequest,
          context,
          agentPreset
        );

        return formatSuccessResponse(responseText);
      } catch (err) {
        logError('[Server] Error processing committee:', err);
        
        // Use proper error formatting
        if (err instanceof ValidationError || err instanceof ConfigurationError || err instanceof MCPError) {
          return formatErrorResponse(err);
        }
        
        // Wrap unknown errors in MCPError
        const mcpError = new MCPError(
          err.message || 'An unexpected error occurred',
          'INTERNAL_ERROR',
          500
        );
        return formatErrorResponse(mcpError);
      }
    }

    // Unknown tool - return proper MCP error
    const error = new MCPError(
      `Unknown tool: ${name}`,
      'INVALID_REQUEST',
      400
    );
    return formatErrorResponse(error);
  });

  // Connect to stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  log('AI Agent Committee MCP Server running on stdio');
  
  if (fallbackMode) {
    logWarn(`⚠️  FALLBACK MODE: No API keys configured`);
  } else {
    try {
      log(`Available providers: ${validateProviders().join(', ')}`);
    } catch (err) {
      logWarn(`⚠️  FALLBACK MODE: ${err.message}`);
    }
  }
}

// Start the server
main().catch((error) => {
  logError('Fatal error starting MCP server:', error);
  process.exit(1);
});

