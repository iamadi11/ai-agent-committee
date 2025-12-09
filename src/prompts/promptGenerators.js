/**
 * Prompt Generators
 * Role-specific prompt generation strategies for different agent types
 */

/**
 * Generates prompt for specialized agents (current implementation)
 * @param {Object} agent - Agent definition
 * @param {string} userRequest - User's request
 * @param {string} context - Optional context
 * @returns {string} Generated prompt
 */
export function generateSpecializedPrompt(agent, userRequest, context = '') {
  let prompt = `\n${'='.repeat(80)}\n`;
  prompt += `AGENT: ${agent.name} (${agent.role})\n`;
  prompt += `${'='.repeat(80)}\n\n`;
  prompt += `Role: ${agent.role}\n`;
  prompt += `Description: ${agent.description}\n`;
  prompt += `Focus Areas: ${agent.focus}\n\n`;
  prompt += `Task: ${userRequest}\n\n`;
  
  if (context) {
    prompt += `--- CONTEXT FROM OTHER CHAT WINDOWS ---\n`;
    prompt += `${context}\n`;
    prompt += `--- END CONTEXT ---\n\n`;
    prompt += `IMPORTANT: Consider the above context when providing your analysis.\n`;
    prompt += `Incorporate relevant information from other conversations.\n\n`;
  }

  prompt += `Guidelines for ${agent.name}:\n\n`;
  agent.guidelines.forEach((guideline, idx) => {
    prompt += `${idx + 1}. ${guideline}\n`;
  });

  prompt += `\n\n--- AGENT OUTPUT REQUEST ---\n`;
  prompt += `As ${agent.role}, analyze the task and provide:\n`;
  prompt += `1. Your analysis and recommendations\n`;
  prompt += `2. Code examples if applicable\n`;
  prompt += `3. Best practices specific to your role\n`;
  prompt += `4. Any concerns or considerations\n`;
  prompt += `\nApproach: ${agent.approach}\n`;
  
  prompt += `\n\n--- RESPONSE TIME GUIDELINES ---\n`;
  prompt += `IMPORTANT: Generate your response within 30-40 seconds.\n`;
  prompt += `- Be concise and focused - prioritize quality over length\n`;
  prompt += `- Provide essential insights and recommendations first\n`;
  prompt += `- Use bullet points and clear structure for quick reading\n`;
  prompt += `- Include code examples only if directly relevant and brief\n`;
  prompt += `- Avoid lengthy explanations - get to the point quickly\n`;
  prompt += `- Aim for 200-400 words maximum unless the task requires extensive detail\n`;
  prompt += `- Focus on actionable recommendations rather than background theory\n`;

  return prompt;
}

/**
 * Generates prompt for frontend agents
 * @param {Object} agent - Agent definition
 * @param {string} userRequest - User's request
 * @param {string} context - Optional context
 * @returns {string} Generated prompt
 */
export function generateFrontendPrompt(agent, userRequest, context = '') {
  let prompt = `\n${'='.repeat(80)}\n`;
  prompt += `FRONTEND AGENT: ${agent.name} (${agent.role})\n`;
  prompt += `${'='.repeat(80)}\n\n`;
  prompt += `Role: ${agent.role}\n`;
  prompt += `Description: ${agent.description}\n`;
  prompt += `Focus Areas: ${agent.focus}\n\n`;
  prompt += `Task: ${userRequest}\n\n`;
  
  if (context) {
    prompt += `--- CONTEXT FROM OTHER CHAT WINDOWS ---\n`;
    prompt += `${context}\n`;
    prompt += `--- END CONTEXT ---\n\n`;
  }

  prompt += `FRONTEND DEVELOPMENT GUIDELINES:\n\n`;
  agent.guidelines.forEach((guideline, idx) => {
    prompt += `${idx + 1}. ${guideline}\n`;
  });

  prompt += `\n\n--- FRONTEND-SPECIFIC CONSIDERATIONS ---\n`;
  prompt += `- Focus on user experience and interface design\n`;
  prompt += `- Consider accessibility (a11y) requirements\n`;
  prompt += `- Optimize for performance and loading times\n`;
  prompt += `- Ensure responsive design for all screen sizes\n`;
  prompt += `- Use modern frontend frameworks and best practices\n`;
  prompt += `- Consider browser compatibility\n\n`;

  prompt += `--- AGENT OUTPUT REQUEST ---\n`;
  prompt += `As a ${agent.role}, analyze the task from a frontend perspective and provide:\n`;
  prompt += `1. Frontend-specific analysis and recommendations\n`;
  prompt += `2. UI/UX considerations and design suggestions\n`;
  prompt += `3. Component structure and implementation approach\n`;
  prompt += `4. Frontend code examples if applicable\n`;
  prompt += `5. Performance and accessibility considerations\n`;
  prompt += `\nApproach: ${agent.approach}\n`;
  
  prompt += `\n\n--- RESPONSE TIME GUIDELINES ---\n`;
  prompt += `IMPORTANT: Generate your response within 30-40 seconds.\n`;
  prompt += `- Be concise and focused - prioritize quality over length\n`;
  prompt += `- Provide essential insights and recommendations first\n`;
  prompt += `- Use bullet points and clear structure for quick reading\n`;
  prompt += `- Include code examples only if directly relevant and brief\n`;
  prompt += `- Avoid lengthy explanations - get to the point quickly\n`;
  prompt += `- Aim for 200-400 words maximum unless the task requires extensive detail\n`;
  prompt += `- Focus on actionable recommendations rather than background theory\n`;

  return prompt;
}

/**
 * Generates prompt for backend agents
 * @param {Object} agent - Agent definition
 * @param {string} userRequest - User's request
 * @param {string} context - Optional context
 * @returns {string} Generated prompt
 */
export function generateBackendPrompt(agent, userRequest, context = '') {
  let prompt = `\n${'='.repeat(80)}\n`;
  prompt += `BACKEND AGENT: ${agent.name} (${agent.role})\n`;
  prompt += `${'='.repeat(80)}\n\n`;
  prompt += `Role: ${agent.role}\n`;
  prompt += `Description: ${agent.description}\n`;
  prompt += `Focus Areas: ${agent.focus}\n\n`;
  prompt += `Task: ${userRequest}\n\n`;
  
  if (context) {
    prompt += `--- CONTEXT FROM OTHER CHAT WINDOWS ---\n`;
    prompt += `${context}\n`;
    prompt += `--- END CONTEXT ---\n\n`;
  }

  prompt += `BACKEND DEVELOPMENT GUIDELINES:\n\n`;
  agent.guidelines.forEach((guideline, idx) => {
    prompt += `${idx + 1}. ${guideline}\n`;
  });

  prompt += `\n\n--- BACKEND-SPECIFIC CONSIDERATIONS ---\n`;
  prompt += `- Focus on API design and server-side logic\n`;
  prompt += `- Consider database design and query optimization\n`;
  prompt += `- Ensure security and data protection\n`;
  prompt += `- Plan for scalability and performance\n`;
  prompt += `- Implement proper error handling and logging\n`;
  prompt += `- Consider microservices architecture if applicable\n\n`;

  prompt += `--- AGENT OUTPUT REQUEST ---\n`;
  prompt += `As a ${agent.role}, analyze the task from a backend perspective and provide:\n`;
  prompt += `1. Backend-specific analysis and recommendations\n`;
  prompt += `2. API design and endpoint structure\n`;
  prompt += `3. Database schema and data modeling considerations\n`;
  prompt += `4. Backend code examples if applicable\n`;
  prompt += `5. Security and performance considerations\n`;
  prompt += `\nApproach: ${agent.approach}\n`;
  
  prompt += `\n\n--- RESPONSE TIME GUIDELINES ---\n`;
  prompt += `IMPORTANT: Generate your response within 30-40 seconds.\n`;
  prompt += `- Be concise and focused - prioritize quality over length\n`;
  prompt += `- Provide essential insights and recommendations first\n`;
  prompt += `- Use bullet points and clear structure for quick reading\n`;
  prompt += `- Include code examples only if directly relevant and brief\n`;
  prompt += `- Avoid lengthy explanations - get to the point quickly\n`;
  prompt += `- Aim for 200-400 words maximum unless the task requires extensive detail\n`;
  prompt += `- Focus on actionable recommendations rather than background theory\n`;

  return prompt;
}

/**
 * Generates prompt for fullstack agents
 * @param {Object} agent - Agent definition
 * @param {string} userRequest - User's request
 * @param {string} context - Optional context
 * @returns {string} Generated prompt
 */
export function generateFullstackPrompt(agent, userRequest, context = '') {
  let prompt = `\n${'='.repeat(80)}\n`;
  prompt += `FULLSTACK AGENT: ${agent.name} (${agent.role})\n`;
  prompt += `${'='.repeat(80)}\n\n`;
  prompt += `Role: ${agent.role}\n`;
  prompt += `Description: ${agent.description}\n`;
  prompt += `Focus Areas: ${agent.focus}\n\n`;
  prompt += `Task: ${userRequest}\n\n`;
  
  if (context) {
    prompt += `--- CONTEXT FROM OTHER CHAT WINDOWS ---\n`;
    prompt += `${context}\n`;
    prompt += `--- END CONTEXT ---\n\n`;
  }

  prompt += `FULLSTACK DEVELOPMENT GUIDELINES:\n\n`;
  agent.guidelines.forEach((guideline, idx) => {
    prompt += `${idx + 1}. ${guideline}\n`;
  });

  prompt += `\n\n--- FULLSTACK-SPECIFIC CONSIDERATIONS ---\n`;
  prompt += `- Consider both frontend and backend aspects\n`;
  prompt += `- Plan for seamless integration between layers\n`;
  prompt += `- Design API contracts and data flow\n`;
  prompt += `- Ensure consistency across the stack\n`;
  prompt += `- Consider end-to-end user experience\n`;
  prompt += `- Plan for deployment and DevOps\n\n`;

  prompt += `--- AGENT OUTPUT REQUEST ---\n`;
  prompt += `As a ${agent.role}, analyze the task from a fullstack perspective and provide:\n`;
  prompt += `1. Complete analysis covering both frontend and backend\n`;
  prompt += `2. Integration points and API design\n`;
  prompt += `3. End-to-end implementation approach\n`;
  prompt += `4. Code examples for both layers if applicable\n`;
  prompt += `5. Considerations for the complete system\n`;
  prompt += `\nApproach: ${agent.approach}\n`;
  
  prompt += `\n\n--- RESPONSE TIME GUIDELINES ---\n`;
  prompt += `IMPORTANT: Generate your response within 30-40 seconds.\n`;
  prompt += `- Be concise and focused - prioritize quality over length\n`;
  prompt += `- Provide essential insights and recommendations first\n`;
  prompt += `- Use bullet points and clear structure for quick reading\n`;
  prompt += `- Include code examples only if directly relevant and brief\n`;
  prompt += `- Avoid lengthy explanations - get to the point quickly\n`;
  prompt += `- Aim for 200-400 words maximum unless the task requires extensive detail\n`;
  prompt += `- Focus on actionable recommendations rather than background theory\n`;

  return prompt;
}

/**
 * Gets the appropriate prompt generator based on preset type
 * @param {string} presetName - Name of the preset
 * @returns {Function} Prompt generator function
 */
export function getPromptGenerator(presetName) {
  switch (presetName) {
    case 'frontend':
      return generateFrontendPrompt;
    case 'backend':
      return generateBackendPrompt;
    case 'fullstack':
      return generateFullstackPrompt;
    case 'specialized':
    default:
      return generateSpecializedPrompt;
  }
}


