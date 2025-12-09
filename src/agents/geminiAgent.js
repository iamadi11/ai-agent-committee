/**
 * Gemini Agent Implementation
 * Uses Google Gemini API via axios
 */

import axios from 'axios';
import { BaseAgent } from './baseAgent.js';

export class GeminiAgent extends BaseAgent {
  constructor(apiKey, options = {}) {
    super(apiKey, options);
    // Default to v1 API for better compatibility
    // v1 API supports: gemini-pro, gemini-pro-vision
    // v1beta API supports: gemini-1.5-pro, gemini-1.5-flash, gemini-1.5-pro-latest
    this.baseURL = 'https://generativelanguage.googleapis.com/v1';
  }

  getDefaultModel() {
    // Default to gemini-pro which works with v1 API
    return 'gemini-pro';
  }

  async fetchAvailableModels() {
    try {
      // Try v1beta first for newer models
      try {
        const v1betaResponse = await axios.get(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`,
          {
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );

        const v1betaModels = v1betaResponse.data.models
          ?.filter(model => model.supportedGenerationMethods?.includes('generateContent'))
          ?.map(model => model.name.replace('models/', '')) || [];

        if (v1betaModels.length > 0) {
          return v1betaModels;
        }
      } catch (v1betaError) {
        // Fall through to v1 API
      }

      // Fall back to v1 API
      const v1Response = await axios.get(
        `https://generativelanguage.googleapis.com/v1/models?key=${this.apiKey}`,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      const v1Models = v1Response.data.models
        ?.filter(model => model.supportedGenerationMethods?.includes('generateContent'))
        ?.map(model => model.name.replace('models/', '')) || [];

      return v1Models.length > 0 ? v1Models : [this.getDefaultModel()];
    } catch (error) {
      // If fetching fails, return known models as fallback
      return [
        'gemini-1.5-pro',
        'gemini-1.5-flash',
        'gemini-pro',
        this.getDefaultModel()
      ];
    }
  }

  /**
   * Determines the correct API version and model name based on the requested model
   * @param {string} model - Model name
   * @returns {Object} Object with baseURL and model name
   */
  getApiVersionAndModel(model) {
    // Models that require v1beta API
    const v1betaModels = ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.5-pro-latest'];
    
    if (v1betaModels.includes(model)) {
      return {
        baseURL: 'https://generativelanguage.googleapis.com/v1beta',
        model: model
      };
    }
    
    // Default to v1 API for gemini-pro, gemini-pro-vision, and any other models
    return {
      baseURL: 'https://generativelanguage.googleapis.com/v1',
      model: model || 'gemini-pro'
    };
  }

  async process(prompt, options = {}) {
    let model = options.model || this.options.model;
    const temperature = options.temperature ?? this.options.temperature;
    const maxTokens = options.maxTokens || this.options.maxTokens;

    // Determine correct API version and model name
    const { baseURL, model: finalModel } = this.getApiVersionAndModel(model);

    try {
      const response = await axios.post(
        `${baseURL}/models/${finalModel}:generateContent?key=${this.apiKey}`,
        {
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens
          }
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      const content = response.data.candidates[0]?.content?.parts[0]?.text;
      if (!this.validateResponse(content)) {
        throw new Error('Invalid response from Gemini API');
      }
      return content;
    } catch (error) {
      throw this.createProviderError(error, 'gemini');
    }
  }

  async processStream(prompt, onChunk, options = {}) {
    // Gemini streaming would use streamGenerateContent endpoint
    // For now, use non-streaming
    return this.process(prompt, { ...options, stream: false });
  }
}

