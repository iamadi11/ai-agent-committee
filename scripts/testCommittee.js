#!/usr/bin/env node

/**
 * Test Committee Script
 * Demonstrates usage of the Agent Committee system
 */

import { orchestrateWorkflow } from '../src/orchestrator/agentProcessor.js';
import { validateProviders, getDefaultProvider } from '../src/utils/env.js';
import { log, error } from '../src/utils/logger.js';

async function testCommittee() {
  log('='.repeat(80));
  log('Agent Committee Test Script');
  log('='.repeat(80));
  log('');

  // Validate providers
  try {
    const providers = validateProviders();
    log(`✅ Available providers: ${providers.join(', ')}`);
    log(`✅ Default provider: ${getDefaultProvider()}`);
    log('');
  } catch (err) {
    error('❌ Configuration error:', err.message);
    error('Please set at least one API key in .env file');
    process.exit(1);
  }

  // Test request
  const testRequest = process.argv[2] || 'Create a REST API endpoint for user authentication with JWT tokens';
  const testContext = process.argv[3] || '';
  const preset = process.argv[4] || 'specialized';

  log(`Test Request: ${testRequest}`);
  if (testContext) {
    log(`Context: ${testContext}`);
  }
  log(`Preset: ${preset}`);
  log('');
  log('Starting committee processing...');
  log('');

  try {
    const startTime = Date.now();
    const result = await orchestrateWorkflow(testRequest, testContext, preset);
    const duration = Date.now() - startTime;

    log('');
    log('='.repeat(80));
    log('RESULTS');
    log('='.repeat(80));
    log('');
    log(`Processing time: ${(duration / 1000).toFixed(2)}s`);
    log(`Total agents: ${result.workflow.totalAgents}`);
    log(`Successful: ${result.workflow.successfulAgents}`);
    log(`Failed: ${result.workflow.failedAgents}`);
    log('');
    log(`Winner: ${result.finalSynthesis.winner}`);
    log(`Method: ${result.finalSynthesis.method}`);
    log('');
    log('Synthesis:');
    log('-'.repeat(80));
    log(result.finalSynthesis.synthesis);
    log('-'.repeat(80));
    log('');

    if (result.finalSynthesis.recommendations && result.finalSynthesis.recommendations.length > 0) {
      log('Recommendations:');
      result.finalSynthesis.recommendations.forEach((rec, i) => {
        log(`${i + 1}. ${rec}`);
      });
      log('');
    }

    log('Agent Responses:');
    result.agents.forEach((agent, i) => {
      log(`${i + 1}. ${agent.agent} (${agent.role}): ${agent.success ? '✅' : '❌'}`);
      if (agent.hasActualResponse && agent.actualResponse) {
        log(`   Preview: ${agent.actualResponse.substring(0, 100)}...`);
      }
    });
    log('');

    log('='.repeat(80));
    log('Test completed successfully!');
    log('='.repeat(80));
  } catch (err) {
    error('❌ Test failed:', err.message);
    if (err.stack) {
      error(err.stack);
    }
    process.exit(1);
  }
}

// Run test
testCommittee();

