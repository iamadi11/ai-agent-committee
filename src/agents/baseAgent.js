/**
 * Base Agent Class
 * Abstract base class for all LLM agent implementations
 */

import { ProviderError } from '../utils/errors.js';

export class BaseAgent {
  constructor(apiKey, options = {}) {
    if (!apiKey || typeof apiKey !== 'string') {
      throw new Error('API key is required');
    }
    this.apiKey = apiKey;
    this.options = {
      model: options.model || this.getDefaultModel(),
      temperature: options.temperature ?? 0.7,
      maxTokens: options.maxTokens || 2000,
      ...options
    };
    // Cache for available models
    this._availableModelsCache = null;
    this._modelCacheTimestamp = null;
    this._modelCacheTTL = 3600000; // 1 hour cache
  }

  /**
   * Gets the default model for this provider
   * Must be implemented by subclasses
   * @returns {string}
   */
  getDefaultModel() {
    throw new Error('getDefaultModel() must be implemented by subclass');
  }

  /**
   * Fetches available models from the provider API
   * Must be implemented by subclasses
   * @returns {Promise<Array<string>>} Array of available model names
   */
  async fetchAvailableModels() {
    throw new Error('fetchAvailableModels() must be implemented by subclass');
  }

  /**
   * Selects the best model from available models
   * Prioritizes: latest models, then models with "pro" or "sonnet" in name, then defaults
   * @param {Array<string>} models - Array of available model names
   * @returns {string} Best model name
   */
  selectBestModel(models) {
    if (!models || models.length === 0) {
      return this.getDefaultModel();
    }

    // Filter to only chat/completion models (exclude embedding, moderation, etc.)
    const chatModels = models.filter(model => {
      const lower = model.toLowerCase();
      // Exclude embedding, moderation, and other non-chat models
      return !lower.includes('embedding') && 
             !lower.includes('moderation') && 
             !lower.includes('whisper') &&
             !lower.includes('dall-e') &&
             !lower.includes('tts');
    });

    if (chatModels.length === 0) {
      return models[0]; // Fallback to first model if no chat models found
    }

    // Priority order: prefer latest models, then "pro"/"sonnet" models, then others
    const sorted = chatModels.sort((a, b) => {
      const aLower = a.toLowerCase();
      const bLower = b.toLowerCase();
      
      // Prefer models with version numbers (e.g., gpt-4o, claude-3-5)
      const aHasVersion = /\d/.test(a);
      const bHasVersion = /\d/.test(b);
      if (aHasVersion && !bHasVersion) return -1;
      if (!aHasVersion && bHasVersion) return 1;
      
      // Prefer "pro", "sonnet", "opus" models
      const aIsPro = aLower.includes('pro') || aLower.includes('sonnet') || aLower.includes('opus');
      const bIsPro = bLower.includes('pro') || bLower.includes('sonnet') || bLower.includes('opus');
      if (aIsPro && !bIsPro) return -1;
      if (!aIsPro && bIsPro) return 1;
      
      // Prefer models without "mini" or "flash" (unless it's the only option)
      const aIsMini = aLower.includes('mini') || aLower.includes('flash') || aLower.includes('nano');
      const bIsMini = bLower.includes('mini') || bLower.includes('flash') || bLower.includes('nano');
      if (!aIsMini && bIsMini) return -1;
      if (aIsMini && !bIsMini) return 1;
      
      // Alphabetical as final tiebreaker
      return a.localeCompare(b);
    });

    return sorted[0];
  }

  /**
   * Gets the best available model, with caching
   * @param {boolean} forceRefresh - Force refresh of cache
   * @returns {Promise<string>} Best model name
   */
  async getBestAvailableModel(forceRefresh = false) {
    // Check cache
    if (!forceRefresh && this._availableModelsCache && this._modelCacheTimestamp) {
      const cacheAge = Date.now() - this._modelCacheTimestamp;
      if (cacheAge < this._modelCacheTTL) {
        return this.selectBestModel(this._availableModelsCache);
      }
    }

    try {
      const models = await this.fetchAvailableModels();
      this._availableModelsCache = models;
      this._modelCacheTimestamp = Date.now();
      return this.selectBestModel(models);
    } catch (error) {
      // If fetching fails, fall back to default model
      return this.getDefaultModel();
    }
  }

  /**
   * Processes a prompt and returns a response
   * Must be implemented by subclasses
   * @param {string} prompt - The prompt to send
   * @param {Object} options - Additional options (stream, etc.)
   * @returns {Promise<string>} The agent's response
   */
  async process(prompt, options = {}) {
    throw new Error('process() must be implemented by subclass');
  }

  /**
   * Processes a prompt with streaming support
   * Default implementation calls process() - subclasses can override
   * @param {string} prompt - The prompt to send
   * @param {Function} onChunk - Callback for each chunk
   * @param {Object} options - Additional options
   * @returns {Promise<string>} The complete response
   */
  async processStream(prompt, onChunk, options = {}) {
    // Default: non-streaming, subclasses can override
    return this.process(prompt, { ...options, stream: false });
  }

  /**
   * Validates the response from the API
   * @param {any} response - API response
   * @returns {boolean}
   */
  validateResponse(response) {
    return response && typeof response === 'string' && response.trim().length > 0;
  }

  /**
   * Formats error messages consistently
   * @param {Error} error - Error object
   * @returns {string}
   */
  formatError(error) {
    if (error.response) {
      return `API Error (${error.response.status}): ${error.response.data?.error?.message || error.message}`;
    }
    return error.message || 'Unknown error occurred';
  }

  /**
   * Creates a ProviderError from an API error
   * @param {Error} error - Original error
   * @param {string} providerName - Provider name
   * @returns {ProviderError}
   */
  createProviderError(error, providerName) {
    const message = this.formatError(error);
    return new ProviderError(message, providerName, error);
  }
}

