/**
 * Environment Configuration Utility
 * Loads and validates API keys from .env file
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../../.env') });

/**
 * Available LLM providers
 */
export const PROVIDERS = {
  OPENAI: 'openai',
  ANTHROPIC: 'anthropic',
  GEMINI: 'gemini',
  GROQ: 'groq'
};

/**
 * Gets available API keys from environment
 * @returns {Object} Object with provider names as keys and API keys as values
 */
export function getApiKeys() {
  const keys = {
    [PROVIDERS.OPENAI]: process.env.OPENAI_API_KEY,
    [PROVIDERS.ANTHROPIC]: process.env.ANTHROPIC_API_KEY,
    [PROVIDERS.GEMINI]: process.env.GEMINI_API_KEY,
    [PROVIDERS.GROQ]: process.env.GROQ_API_KEY
  };
  
  // Normalize: convert undefined, empty strings, and whitespace-only strings to null
  for (const [provider, key] of Object.entries(keys)) {
    if (!key || typeof key !== 'string' || key.trim().length === 0) {
      keys[provider] = null;
    }
  }
  
  return keys;
}

/**
 * Gets available providers (those with API keys)
 * @returns {Array<string>} Array of available provider names
 */
export function getAvailableProviders() {
  const keys = getApiKeys();
  return Object.entries(keys)
    .filter(([_, key]) => key !== null && typeof key === 'string' && key.trim().length > 0)
    .map(([provider, _]) => provider);
}

/**
 * Validates that at least one provider is configured
 * @throws {Error} If no providers are configured
 */
export function validateProviders() {
  const available = getAvailableProviders();
  if (available.length === 0) {
    throw new Error(
      'No LLM providers configured. Please set at least one of: OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY, GROQ_API_KEY in .env file'
    );
  }
  return available;
}

/**
 * Gets the default provider
 * Priority: Uses the first available provider in order: GEMINI, ANTHROPIC, OPENAI
 * If only one provider is configured, that provider will be used regardless of priority
 * @returns {string|null} Provider name or null if none available
 */
export function getDefaultProvider() {
  const available = getAvailableProviders();
  if (available.length === 0) {
    return null;
  }
  
  // If only one provider is available, use it (user's explicit choice)
  if (available.length === 1) {
    return available[0];
  }
  
  // If multiple providers are available, prioritize: GEMINI > GROQ > ANTHROPIC > OPENAI
  const priorityOrder = [PROVIDERS.GEMINI, PROVIDERS.GROQ, PROVIDERS.ANTHROPIC, PROVIDERS.OPENAI];
  
  for (const provider of priorityOrder) {
    if (available.includes(provider)) {
      return provider;
    }
  }
  
  // Fallback to first available if none match priority order (shouldn't happen)
  return available[0];
}

/**
 * Gets API key for a specific provider
 * @param {string} provider - Provider name
 * @returns {string|null} API key or null if not configured
 */
export function getApiKey(provider) {
  const keys = getApiKeys();
  return keys[provider] || null;
}

/**
 * Checks if a provider is available
 * @param {string} provider - Provider name
 * @returns {boolean} True if provider has API key configured
 */
export function isProviderAvailable(provider) {
  const key = getApiKey(provider);
  return key !== null && key.trim().length > 0;
}

/**
 * Checks if fallback mode is needed (no API keys available)
 * @returns {boolean} True if no providers are configured
 */
export function isFallbackMode() {
  const available = getAvailableProviders();
  return available.length === 0;
}

