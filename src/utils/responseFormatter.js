/**
 * Response Formatter
 * Formats responses for MCP protocol compliance
 */

/**
 * Formats agent committee results for MCP response
 * @param {Object} result - Workflow result object
 * @param {string} userRequest - Original user request
 * @param {string} context - Optional context
 * @param {string} agentPreset - Agent preset used
 * @returns {string} Formatted response text
 */
export function formatCommitteeResponse(result, userRequest, context, agentPreset) {
  let responseText = `\n${'='.repeat(80)}\n`;
  responseText += `AGENT COMMITTEE RESULTS\n`;
  responseText += `${'='.repeat(80)}\n\n`;
  responseText += `Original Request: ${userRequest}\n`;
  if (context) {
    responseText += `Context: ${context}\n`;
  }
  responseText += `Agent Preset: ${agentPreset}\n`;
  responseText += `Provider: ${result.workflow.provider}\n`;
  responseText += `\n`;

  // Agent responses
  responseText += `\n${'='.repeat(80)}\n`;
  responseText += `AGENT RESPONSES (${result.agents.length} agents)\n`;
  responseText += `${'='.repeat(80)}\n\n`;

  result.agents.forEach((agent, index) => {
    responseText += `\n${'─'.repeat(80)}\n`;
    responseText += `AGENT ${index + 1}/${result.agents.length}: ${agent.agent} (${agent.role})\n`;
    responseText += `${'─'.repeat(80)}\n`;

    if (agent.hasActualResponse && agent.actualResponse) {
      responseText += `✅ Response:\n\n`;
      responseText += `${agent.actualResponse}\n`;
    } else if (agent.hasError) {
      responseText += `❌ Error: ${agent.error || 'Unknown error'}\n`;
    } else {
      responseText += `⚠️  No response generated\n`;
    }
    responseText += `\n`;
  });

  // Final synthesis
  responseText += `\n${'='.repeat(80)}\n`;
  responseText += `FINAL SYNTHESIS (Committee Aggregator)\n`;
  responseText += `${'='.repeat(80)}\n\n`;
  responseText += `Method: ${result.finalSynthesis.method}\n`;
  responseText += `Winner: ${result.finalSynthesis.winner}\n\n`;
  responseText += `Synthesis:\n${result.finalSynthesis.synthesis}\n\n`;

  if (result.finalSynthesis.recommendations && result.finalSynthesis.recommendations.length > 0) {
    responseText += `Recommendations:\n`;
    result.finalSynthesis.recommendations.forEach((rec, i) => {
      responseText += `${i + 1}. ${rec}\n`;
    });
    responseText += `\n`;
  }

  if (result.finalSynthesis.finalCode) {
    responseText += `Final Code:\n\`\`\`\n${result.finalSynthesis.finalCode}\n\`\`\`\n\n`;
  }

  // Summary
  responseText += `\n${'='.repeat(80)}\n`;
  responseText += `SUMMARY\n`;
  responseText += `${'='.repeat(80)}\n`;
  responseText += `${result.summary.message}\n`;

  // Structured JSON
  responseText += `\n\n${'='.repeat(80)}\n`;
  responseText += `STRUCTURED DATA (JSON)\n`;
  responseText += `${'='.repeat(80)}\n\n`;
  responseText += `\`\`\`json\n`;
  responseText += JSON.stringify(result, null, 2);
  responseText += `\n\`\`\`\n`;

  return responseText;
}

/**
 * Creates MCP-compliant error response
 * @param {Error} error - Error object
 * @returns {Object} MCP error response
 */
export function formatErrorResponse(error) {
  // If it's already an MCPError, use its toMCPError method
  if (error.toMCPError && typeof error.toMCPError === 'function') {
    const mcpError = error.toMCPError();
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}\n\nCode: ${mcpError.code}\n${mcpError.data ? JSON.stringify(mcpError.data, null, 2) : ''}`
        }
      ],
      isError: true
    };
  }

  // Generic error
  return {
    content: [
      {
        type: 'text',
        text: `Error: ${error.message || 'An unexpected error occurred'}\n\nPlease check the console logs for more details.`
      }
    ],
    isError: true
  };
}

/**
 * Creates MCP-compliant success response
 * @param {string} text - Response text
 * @returns {Object} MCP success response
 */
export function formatSuccessResponse(text) {
  return {
    content: [
      {
        type: 'text',
        text: text
      }
    ]
  };
}

