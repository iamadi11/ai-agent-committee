/**
 * Anthropic Agent Implementation
 * Uses Anthropic API via axios
 */

import axios from 'axios';
import { BaseAgent } from './baseAgent.js';

export class AnthropicAgent extends BaseAgent {
  constructor(apiKey, options = {}) {
    super(apiKey, options);
    this.baseURL = 'https://api.anthropic.com/v1';
  }

  getDefaultModel() {
    return 'claude-3-5-sonnet-20241022';
  }

  async fetchAvailableModels() {
    try {
      // Anthropic doesn't have a public models endpoint, so we return known models
      // and test which ones are available by attempting to use them
      const knownModels = [
        'claude-3-5-sonnet-20241022',
        'claude-3-5-sonnet-20240620',
        'claude-3-opus-20240229',
        'claude-3-sonnet-20240229',
        'claude-3-haiku-20240307'
      ];

      // For Anthropic, we'll return the known models
      // In a production system, you might want to test each one
      return knownModels;
    } catch (error) {
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
        `${this.baseURL}/messages`,
        {
          model,
          max_tokens: maxTokens,
          temperature,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          stream
        },
        {
          headers: {
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json'
          },
          ...(stream ? { responseType: 'stream' } : {})
        }
      );

      if (stream) {
        return this.handleStreamResponse(response.data);
      }

      const content = response.data.content[0]?.text;
      if (!this.validateResponse(content)) {
        throw new Error('Invalid response from Anthropic API');
      }
      return content;
    } catch (error) {
      throw this.createProviderError(error, 'anthropic');
    }
  }

  async processStream(prompt, onChunk, options = {}) {
    try {
      const response = await this.process(prompt, { ...options, stream: true });
      return response;
    } catch (error) {
      throw this.createProviderError(error, 'anthropic');
    }
  }

  handleStreamResponse(stream) {
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
              if (parsed.type === 'content_block_delta') {
                const text = parsed.delta?.text;
                if (text) {
                  fullContent += text;
                }
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

