/**
 * Task Manager for Cursor
 * Provides structured guidelines and instructions for code generation
 * Supports multiple agent presets via JSON configuration
 */

import { getAgentsByPreset, getPresetInfo } from './config/agentConfigLoader.js';
import { getPromptGenerator } from './prompts/promptGenerators.js';

// Cache for loaded agents to avoid repeated file reads
let agentsCache = null;
let currentPreset = 'specialized';

/**
 * Gets agents for the specified preset (with caching)
 * @param {string} presetName - Name of the preset (default: 'specialized')
 * @returns {Promise<Array>} Array of agent definitions
 */
export async function getAgents(presetName = 'specialized') {
  if (agentsCache && currentPreset === presetName) {
    return agentsCache;
  }
  
  agentsCache = await getAgentsByPreset(presetName);
  currentPreset = presetName;
  return agentsCache;
}

/**
 * Legacy export for backward compatibility
 * @deprecated Use getAgents() instead
 */
export const AGENTS = [
  {
    name: 'ArchitectAgent',
    role: 'System Architect',
    description: 'Designs system architecture, defines components, and establishes technical foundations',
    focus: 'Architecture, design patterns, system structure, scalability'
  },
  {
    name: 'PlannerAgent',
    role: 'Project Planner',
    description: 'Creates implementation plans, breaks down tasks, and defines execution strategy',
    focus: 'Planning, task breakdown, execution strategy, milestones'
  },
  {
    name: 'CoderAgent',
    role: 'Code Generator',
    description: 'Writes code implementations, follows best practices, and ensures functionality',
    focus: 'Code implementation, best practices, functionality, clean code'
  },
  {
    name: 'ReviewerAgent',
    role: 'Code Reviewer',
    description: 'Reviews code for quality, correctness, and adherence to standards',
    focus: 'Code quality, correctness, standards, review feedback'
  },
  {
    name: 'RefactorAgent',
    role: 'Code Refactorer',
    description: 'Improves code structure, readability, and maintainability without changing functionality',
    focus: 'Refactoring, code structure, readability, maintainability'
  },
  {
    name: 'SecurityAgent',
    role: 'Security Specialist',
    description: 'Identifies security vulnerabilities, suggests security best practices, and ensures secure implementations',
    focus: 'Security, vulnerabilities, best practices, secure coding'
  },
  {
    name: 'PerformanceAgent',
    role: 'Performance Optimizer',
    description: 'Analyzes performance bottlenecks, suggests optimizations, and ensures efficient code',
    focus: 'Performance, optimization, efficiency, bottlenecks'
  }
];

/**
 * Task categories and their guidelines
 */
export const TASK_GUIDELINES = {
  architecture: {
    name: 'Architecture Guidelines',
    description: 'Guidelines for system architecture and design',
    guidelines: [
      'Design with separation of concerns in mind',
      'Use appropriate design patterns (Repository, Service Layer, Factory, Strategy, etc.)',
      'Ensure components are loosely coupled and highly cohesive',
      'Follow SOLID principles',
      'Plan for scalability and maintainability',
      'Document architectural decisions'
    ]
  },
  codeQuality: {
    name: 'Code Quality Guidelines',
    description: 'Guidelines for writing high-quality code',
    guidelines: [
      'Follow consistent naming conventions',
      'Write self-documenting code with clear variable and function names',
      'Keep functions small and focused (single responsibility)',
      'Avoid deep nesting (max 3-4 levels)',
      'Use meaningful comments only when code cannot be self-explanatory',
      'Remove dead code and unused imports',
      'Follow the DRY (Don\'t Repeat Yourself) principle'
    ]
  },
  typeSafety: {
    name: 'Type Safety Guidelines',
    description: 'Guidelines for TypeScript type safety',
    guidelines: [
      'Use strict TypeScript configuration',
      'Define proper types and interfaces for all data structures',
      'Avoid using `any` type - use `unknown` if type is truly unknown',
      'Use type guards for runtime type checking',
      'Leverage TypeScript\'s type inference where appropriate',
      'Define return types for all functions',
      'Use generic types for reusable components'
    ]
  },
  errorHandling: {
    name: 'Error Handling Guidelines',
    description: 'Guidelines for proper error handling',
    guidelines: [
      'Use try-catch blocks for async operations',
      'Create custom error classes for different error types',
      'Provide meaningful error messages',
      'Log errors appropriately (don\'t expose sensitive information)',
      'Handle edge cases and validate inputs',
      'Use Result/Either patterns for functional error handling where appropriate',
      'Never swallow errors silently'
    ]
  },
  performance: {
    name: 'Performance Guidelines',
    description: 'Guidelines for optimizing performance',
    guidelines: [
      'Optimize database queries (use indexes, avoid N+1 queries)',
      'Implement proper caching strategies',
      'Use lazy loading and code splitting',
      'Minimize bundle size',
      'Optimize images and assets',
      'Use memoization for expensive computations',
      'Profile and measure before optimizing',
      'Consider using Web Workers for CPU-intensive tasks'
    ]
  },
  security: {
    name: 'Security Guidelines',
    description: 'Guidelines for secure code',
    guidelines: [
      'Validate and sanitize all user inputs',
      'Use parameterized queries to prevent SQL injection',
      'Implement proper authentication and authorization',
      'Store sensitive data securely (encrypt at rest and in transit)',
      'Follow OWASP Top 10 security practices',
      'Keep dependencies updated and scan for vulnerabilities',
      'Use environment variables for secrets (never commit them)',
      'Implement rate limiting and CSRF protection'
    ]
  },
  testing: {
    name: 'Testing Guidelines',
    description: 'Guidelines for writing tests',
    guidelines: [
      'Write unit tests for business logic',
      'Write integration tests for API endpoints',
      'Aim for high code coverage (80%+)',
      'Use descriptive test names',
      'Follow AAA pattern (Arrange, Act, Assert)',
      'Mock external dependencies',
      'Test edge cases and error scenarios',
      'Keep tests maintainable and readable'
    ]
  },
  refactoring: {
    name: 'Refactoring Guidelines',
    description: 'Guidelines for code refactoring',
    guidelines: [
      'Refactor incrementally - small, safe changes',
      'Maintain existing functionality while improving code',
      'Run tests after each refactoring step',
      'Extract methods/functions to reduce complexity',
      'Remove code duplication',
      'Improve naming and structure',
      'Document the reasoning behind refactoring decisions',
      'Prefer composition over inheritance'
    ]
  }
};

/**
 * Generates agent workflow instructions for Cursor
 * Guides Cursor to open agent windows, then a final judge window
 * @param {string} userRequest - User's request/task
 * @returns {Promise<Object>} Structured workflow instructions
 */
export async function generateTaskGuidelines(userRequest) {
  if (!userRequest || typeof userRequest !== 'string') {
    throw new Error('Invalid request: must be a non-empty string');
  }

  // Determine which guidelines are relevant based on keywords
  const requestLower = userRequest.toLowerCase();
  const relevantGuidelines = [];

  if (requestLower.includes('architect') || requestLower.includes('design') || requestLower.includes('structure')) {
    relevantGuidelines.push(TASK_GUIDELINES.architecture);
  }
  
  if (requestLower.includes('refactor') || requestLower.includes('improve') || requestLower.includes('clean')) {
    relevantGuidelines.push(TASK_GUIDELINES.refactoring);
    relevantGuidelines.push(TASK_GUIDELINES.codeQuality);
  }
  
  if (requestLower.includes('type') || requestLower.includes('typescript') || requestLower.includes('type safety')) {
    relevantGuidelines.push(TASK_GUIDELINES.typeSafety);
  }
  
  if (requestLower.includes('error') || requestLower.includes('exception') || requestLower.includes('handle')) {
    relevantGuidelines.push(TASK_GUIDELINES.errorHandling);
  }
  
  if (requestLower.includes('performance') || requestLower.includes('optimize') || requestLower.includes('speed') || requestLower.includes('fast')) {
    relevantGuidelines.push(TASK_GUIDELINES.performance);
  }
  
  if (requestLower.includes('security') || requestLower.includes('secure') || requestLower.includes('vulnerability') || requestLower.includes('auth')) {
    relevantGuidelines.push(TASK_GUIDELINES.security);
  }
  
  if (requestLower.includes('test') || requestLower.includes('testing') || requestLower.includes('spec')) {
    relevantGuidelines.push(TASK_GUIDELINES.testing);
  }

  // If no specific guidelines matched, include all relevant ones
  if (relevantGuidelines.length === 0) {
    relevantGuidelines.push(
      TASK_GUIDELINES.codeQuality,
      TASK_GUIDELINES.typeSafety,
      TASK_GUIDELINES.errorHandling
    );
  }

  // Remove duplicates
  const uniqueGuidelines = Array.from(
    new Map(relevantGuidelines.map(g => [g.name, g])).values()
  );

  // Get agents for the preset (default to specialized for backward compatibility)
  const agents = await getAgents('specialized');
  
  // Build agent workflow instructions
  let workflowInstructions = `\n${'='.repeat(80)}\n`;
  workflowInstructions += `AGENT COMMITTEE WORKFLOW - PROCESS IN ${agents.length} AGENT WINDOWS + FINAL JUDGE\n`;
  workflowInstructions += `${'='.repeat(80)}\n\n`;
  workflowInstructions += `User Request: ${userRequest}\n\n`;
  workflowInstructions += `INSTRUCTIONS: Open ${agents.length} separate agent windows, then 1 final judge window.\n`;
  workflowInstructions += `Process each agent window sequentially, then synthesize in the final judge window.\n\n`;

  // Step 1: Individual Agent Windows
  workflowInstructions += `${'='.repeat(80)}\n`;
  workflowInstructions += `STEP 1: OPEN AND PROCESS ${agents.length} AGENT WINDOWS\n`;
  workflowInstructions += `${'='.repeat(80)}\n\n`;
  workflowInstructions += `For each agent below, open a separate chat window and process the request from that agent's perspective.\n\n`;

  agents.forEach((agent, index) => {
    workflowInstructions += `${'-'.repeat(80)}\n`;
    workflowInstructions += `AGENT WINDOW ${index + 1}/${agents.length}: ${agent.name} (${agent.role})\n`;
    workflowInstructions += `${'-'.repeat(80)}\n\n`;
    workflowInstructions += `Role: ${agent.role}\n`;
    workflowInstructions += `Description: ${agent.description}\n`;
    workflowInstructions += `Focus Areas: ${agent.focus}\n\n`;
    workflowInstructions += `Task: ${userRequest}\n\n`;
    workflowInstructions += `Guidelines for ${agent.name}:\n`;
    
    // Add relevant guidelines for this agent
    if (agent.name === 'ArchitectAgent') {
      workflowInstructions += `- ${TASK_GUIDELINES.architecture.guidelines.join('\n- ')}\n`;
    }
    if (agent.name === 'CoderAgent' || agent.name === 'RefactorAgent') {
      workflowInstructions += `- ${TASK_GUIDELINES.codeQuality.guidelines.join('\n- ')}\n`;
      workflowInstructions += `- ${TASK_GUIDELINES.typeSafety.guidelines.join('\n- ')}\n`;
    }
    if (agent.name === 'ReviewerAgent') {
      workflowInstructions += `- ${TASK_GUIDELINES.codeQuality.guidelines.join('\n- ')}\n`;
      workflowInstructions += `- ${TASK_GUIDELINES.testing.guidelines.join('\n- ')}\n`;
    }
    if (agent.name === 'SecurityAgent') {
      workflowInstructions += `- ${TASK_GUIDELINES.security.guidelines.join('\n- ')}\n`;
    }
    if (agent.name === 'PerformanceAgent') {
      workflowInstructions += `- ${TASK_GUIDELINES.performance.guidelines.join('\n- ')}\n`;
    }
    if (agent.name === 'RefactorAgent') {
      workflowInstructions += `- ${TASK_GUIDELINES.refactoring.guidelines.join('\n- ')}\n`;
    }
    
    // Add all relevant guidelines
    uniqueGuidelines.forEach(g => {
      workflowInstructions += `- ${g.guidelines.join('\n- ')}\n`;
    });
    
    workflowInstructions += `\nACTION: In this agent window, analyze the task "${userRequest}" from the perspective of ${agent.role}.\n`;
    workflowInstructions += `Provide your analysis, recommendations, and any code suggestions.\n\n`;
  });

  // Step 2: Final Judge Window
  workflowInstructions += `\n${'='.repeat(80)}\n`;
  workflowInstructions += `STEP 2: OPEN FINAL JUDGE WINDOW (UNBIASED SYNTHESIS)\n`;
  workflowInstructions += `${'='.repeat(80)}\n\n`;
  workflowInstructions += `After all 7 agent windows have been processed, open a final judge window.\n\n`;
  workflowInstructions += `FINAL JUDGE ROLE:\n`;
  workflowInstructions += `- You are an UNBIASED, NEUTRAL evaluator\n`;
  workflowInstructions += `- Your role is to synthesize all agent outputs\n`;
  workflowInstructions += `- Evaluate the reasoning quality of each agent objectively\n`;
  workflowInstructions += `- Consider all perspectives equally and fairly\n`;
  workflowInstructions += `- Do NOT favor any specific agent\n`;
  workflowInstructions += `- Base your judgment solely on merit and quality\n\n`;
  workflowInstructions += `FINAL JUDGE TASK:\n`;
  workflowInstructions += `1. Review all outputs from the 7 agent windows above\n`;
  workflowInstructions += `2. Identify the best reasoning and recommendations\n`;
  workflowInstructions += `3. Synthesize the best insights from ALL agents\n`;
  workflowInstructions += `4. Generate a comprehensive final result that:\n`;
  workflowInstructions += `   - Combines the best ideas from all agents\n`;
  workflowInstructions += `   - Provides a clear, actionable plan\n`;
  workflowInstructions += `   - Includes code examples if applicable\n`;
  workflowInstructions += `   - Addresses all aspects of the original request\n\n`;
  workflowInstructions += `FINAL JUDGE OUTPUT FORMAT:\n`;
  workflowInstructions += `{\n`;
  workflowInstructions += `  "winner": "<agent_name>",\n`;
  workflowInstructions += `  "synthesis": "<comprehensive merged result>",\n`;
  workflowInstructions += `  "recommendations": ["<action item 1>", "<action item 2>", ...],\n`;
  workflowInstructions += `  "finalCode": "<final code implementation if applicable>"\n`;
  workflowInstructions += `}\n\n`;
  workflowInstructions += `CRITICAL: Remain completely unbiased. Evaluate based on quality, not agent identity.\n\n`;
  workflowInstructions += `${'='.repeat(80)}\n`;
  workflowInstructions += `END WORKFLOW INSTRUCTIONS\n`;
  workflowInstructions += `${'='.repeat(80)}\n`;

  return {
    task: userRequest,
    timestamp: new Date().toISOString(),
    workflow: {
      totalAgents: agents.length,
      agents: agents.map(a => ({
        name: a.name,
        role: a.role,
        description: a.description
      })),
      finalJudge: {
        role: 'Final Judge (Unbiased)',
        description: 'Synthesizes all agent outputs and generates final result'
      }
    },
    guidelines: uniqueGuidelines.map(g => ({
      category: g.name,
      description: g.description,
      guidelines: g.guidelines
    })),
    instructions: workflowInstructions
  };
}

/**
 * Gets guidelines for a specific agent
 * @param {string} agentName - Name of the agent
 * @param {string} userRequest - User's request
 * @param {string} presetName - Name of the preset (default: 'specialized')
 * @param {string} context - Optional context from other chats
 * @returns {Promise<string>} Agent-specific guidelines and instructions
 */
export async function getAgentGuidelines(agentName, userRequest, presetName = 'specialized', context = '') {
  const agents = await getAgents(presetName);
  const agent = agents.find(a => a.name === agentName);
  
  if (!agent) {
    throw new Error(`Unknown agent: ${agentName} in preset "${presetName}"`);
  }

  // Get the appropriate prompt generator based on preset
  const promptGenerator = getPromptGenerator(presetName);
  return promptGenerator(agent, userRequest, context);
}

