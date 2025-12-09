/**
 * OpenAI Agent Implementation
 * Uses OpenAI API via axios
 */

import axios from 'axios';
import { BaseAgent } from './baseAgent.js';

export class OpenAIAgent extends BaseAgent {
  constructor(apiKey, options = {}) {
    super(apiKey, options);
    this.baseURL = 'https://api.openai.com/v1';
  }

  getDefaultModel() {
    return 'gpt-4o-mini';
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

      return models;
    } catch (error) {
      // If fetching fails, return default model as fallback
      return [this.getDefaultModel()];
    }
  }

  async process(prompt, options = {}) {
    const model = options.model || this.options.model;
    const temperature = options.temperature ?? this.options.temperature;
    const maxTokens = options.maxTokens || this.options.maxTokens;
    const stream = options.stream || false;

    try {
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model,
          messages: [
            {
              role: 'user',
              content: prompt
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
        throw new Error('Invalid response from OpenAI API');
      }
      return content;
    } catch (error) {
      throw this.createProviderError(error, 'openai');
    }
  }

  async processStream(prompt, onChunk, options = {}) {
    try {
      const response = await this.process(prompt, { ...options, stream: true });
      
      // For streaming, we'd need to handle the stream properly
      // This is a simplified version - full implementation would parse SSE
      return response;
    } catch (error) {
      throw this.createProviderError(error, 'openai');
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

