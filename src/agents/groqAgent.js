/**
 * Groq Agent Implementation
 * Uses Groq API via axios (OpenAI-compatible API)
 */

import axios from 'axios';
import { BaseAgent } from './baseAgent.js';

export class GroqAgent extends BaseAgent {
  constructor(apiKey, options = {}) {
    // Groq has strict limits - use much smaller max_tokens to leave more room for input
    // Default to 256 tokens for output (much smaller than 512) to be very conservative
    const groqOptions = {
      ...options,
      // Ensure maxTokens doesn't exceed Groq's limit, but default to 256 for safety
      maxTokens: Math.min(options.maxTokens || 256, 512)
    };
    super(apiKey, groqOptions);
    this.baseURL = 'https://api.groq.com/openai/v1';
    // Groq models have VERY strict limits - be extremely conservative
    // Total context: ~8192 tokens, reserve ~2000 for overhead, 256 for output
    // Use 2000 as safe limit for input to ensure we never exceed context window
    this.maxInputTokens = 2000;
  }

  /**
   * Estimates token count (conservative approximation: ~3 characters per token)
   * Using conservative estimate to avoid underestimating
   * @param {string} text - Text to estimate
   * @returns {number} Estimated token count
   */
  estimateTokens(text) {
    if (!text) return 0;
    // Conservative estimate: 1 token ≈ 3 characters (accounts for whitespace, punctuation, etc.)
    return Math.ceil(text.length / 3);
  }

  /**
   * Creates an ultra-minimal prompt for Groq
   * Strips down to absolute essentials: role name and task only
   * @param {string} prompt - Original prompt
   * @returns {string} Minimal prompt
   */
  truncatePrompt(prompt) {
    const estimatedTokens = this.estimateTokens(prompt);
    
    // Calculate max characters (very conservative)
    const maxChars = (this.maxInputTokens - 300) * 3; // Reserve 300 tokens buffer
    
    // Ultra-minimal strategy: Extract ONLY role and task
    let result = '';
    
    // Extract agent name and role - try multiple patterns
    let agentName = '';
    let role = '';
    
    // Pattern 1: AGENT: Name (Role)
    const agentMatch1 = prompt.match(/AGENT:\s*([^\n\(]+)\s*\(([^\)]+)\)/);
    if (agentMatch1) {
      agentName = agentMatch1[1].trim();
      role = agentMatch1[2].trim();
    } else {
      // Pattern 2: Look for Role: line
      const roleMatch = prompt.match(/Role:\s*([^\n]+)/);
      if (roleMatch) {
        role = roleMatch[1].trim();
      }
      // Try to get agent name from FRONTEND/BACKEND AGENT: line
      const agentNameMatch = prompt.match(/(?:FRONTEND|BACKEND|FULLSTACK)?\s*AGENT:\s*([^\n\(]+)/);
      if (agentNameMatch) {
        agentName = agentNameMatch[1].trim();
      }
    }
    
    if (role || agentName) {
      if (agentName && role) {
        result += `You are ${agentName}, a ${role}.\n\n`;
      } else if (role) {
        result += `You are a ${role}.\n\n`;
      } else if (agentName) {
        result += `You are ${agentName}.\n\n`;
      }
    }
    
    // Extract task (most critical information)
    const taskMatch = prompt.match(/Task:\s*([^\n]+(?:\n[^\n]+)*?)(?=\n\n|\n---|$)/s);
    if (taskMatch) {
      let task = taskMatch[1].trim();
      // Limit task to 400 chars to be safe
      if (task.length > 400) {
        task = task.substring(0, 397) + '...';
      }
      result += `Task: ${task}\n\n`;
    } else {
      // Fallback: try to find any mention of the actual task or user request
      const lines = prompt.split('\n');
      for (const line of lines) {
        const lowerLine = line.toLowerCase();
        if (lowerLine.includes('task:') || lowerLine.includes('request:')) {
          const taskLine = line.length > 300 ? line.substring(0, 297) + '...' : line;
          result += `${taskLine}\n\n`;
          break;
        }
      }
    }
    
    // Add minimal instructions
    result += 'Provide a concise analysis and recommendations. Keep response under 250 tokens.\n';
    
    // Hard limit check
    if (result.length > maxChars) {
      result = result.substring(0, maxChars - 50) + '\n[Truncated]';
    }
    
    // Final token verification
    const finalTokens = this.estimateTokens(result);
    if (finalTokens > this.maxInputTokens) {
      // Last resort: keep only role and task, remove everything else
      const roleLine = result.match(/You are [^\n]+/)?.[0] || '';
      const taskLine = result.match(/Task: [^\n]+/)?.[0] || '';
      const minimalPrompt = `${roleLine}\n\n${taskLine}\n\nProvide brief analysis.`;
      const minimalTokens = this.estimateTokens(minimalPrompt);
      if (minimalTokens <= this.maxInputTokens) {
        return minimalPrompt;
      }
      // Absolute last resort: hard truncate
      return result.substring(0, (this.maxInputTokens - 100) * 3);
    }
    
    return result;
  }

  getDefaultModel() {
    return 'llama-3.3-70b-versatile';
  }

  async fetchAvailableModels() {
    try {
      const response = await axios.get(
        `${this.baseURL}/models`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Extract model IDs from the response
      const models = response.data.data
        ?.map(item => item.id)
        .filter(id => id && typeof id === 'string') || [];

      // If no models found, return known Groq models as fallback
      if (models.length === 0) {
        return [
          'llama-3.3-70b-versatile',
          'llama-3.1-70b-versatile',
          'llama-3.1-8b-instant',
          'mixtral-8x7b-32768',
          'gemma2-9b-it'
        ];
      }

      return models;
    } catch (error) {
      // If fetching fails, return known models as fallback
      return [
        'llama-3.3-70b-versatile',
        'llama-3.1-70b-versatile',
        'llama-3.1-8b-instant',
        'mixtral-8x7b-32768',
        'gemma2-9b-it',
        this.getDefaultModel()
      ];
    }
  }

  async process(prompt, options = {}) {
    const model = options.model || this.options.model;
    const temperature = options.temperature ?? this.options.temperature;
    // Groq has a hard limit of 512 for max_tokens, but default to 256 for safety
    const maxTokens = Math.min(options.maxTokens || this.options.maxTokens || 256, 512);
    const stream = options.stream || false;

    // Truncate prompt if it's too long for Groq's context limits
    const truncatedPrompt = this.truncatePrompt(prompt);
    const originalTokens = this.estimateTokens(prompt);
    const truncatedTokens = this.estimateTokens(truncatedPrompt);
    
    if (originalTokens !== truncatedTokens) {
      // Log warning if truncation occurred (in production, use proper logger)
      console.warn(`[GroqAgent] Prompt truncated from ~${originalTokens} to ~${truncatedTokens} tokens`);
    }

    try {
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model,
          messages: [
            {
              role: 'user',
              content: truncatedPrompt
            }
          ],
          temperature,
          max_tokens: maxTokens,
          stream
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          ...(stream ? { responseType: 'stream' } : {})
        }
      );

      if (stream) {
        // Handle streaming response
        return this.handleStreamResponse(response.data);
      }

      const content = response.data.choices[0]?.message?.content;
      if (!this.validateResponse(content)) {
        throw new Error('Invalid response from Groq API');
      }
      return content;
    } catch (error) {
      throw this.createProviderError(error, 'groq');
    }
  }

  async processStream(prompt, onChunk, options = {}) {
    try {
      const response = await this.process(prompt, { ...options, stream: true });
      
      // For streaming, we'd need to handle the stream properly
      // This is a simplified version - full implementation would parse SSE
      return response;
    } catch (error) {
      throw this.createProviderError(error, 'groq');
    }
  }

  handleStreamResponse(stream) {
    // Simplified - full implementation would parse Server-Sent Events
    // For now, return a promise that resolves when stream completes
    return new Promise((resolve, reject) => {
      let fullContent = '';
      stream.on('data', (chunk) => {
        const lines = chunk.toString().split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              resolve(fullContent);
              return;
            }
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content;
              if (content) {
                fullContent += content;
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      });
      stream.on('end', () => resolve(fullContent));
      stream.on('error', reject);
    });
  }
}

