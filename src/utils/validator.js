/**
 * Input Validation Utilities
 * Validates and sanitizes inputs for MCP tools
 */

import { ValidationError } from './errors.js';

/**
 * Validates that a value is a non-empty string
 * @param {any} value - Value to validate
 * @param {string} fieldName - Name of the field for error messages
 * @throws {ValidationError} If validation fails
 */
export function validateNonEmptyString(value, fieldName = 'field') {
  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a string`, fieldName);
  }
  if (value.trim().length === 0) {
    throw new ValidationError(`${fieldName} cannot be empty`, fieldName);
  }
  return value.trim();
}

/**
 * Validates that a value is one of the allowed values
 * @param {any} value - Value to validate
 * @param {Array} allowedValues - Array of allowed values
 * @param {string} fieldName - Name of the field for error messages
 * @throws {ValidationError} If validation fails
 */
export function validateEnum(value, allowedValues, fieldName = 'field') {
  if (!allowedValues.includes(value)) {
    throw new ValidationError(
      `${fieldName} must be one of: ${allowedValues.join(', ')}`,
      fieldName
    );
  }
  return value;
}

/**
 * Validates agent preset
 * @param {string} preset - Preset name
 * @returns {string} Validated preset
 * @throws {ValidationError} If validation fails
 */
export function validateAgentPreset(preset) {
  const allowedPresets = ['specialized', 'frontend', 'backend', 'fullstack'];
  return validateEnum(preset, allowedPresets, 'agentPreset');
}

/**
 * Validates LLM provider
 * @param {string} provider - Provider name
 * @returns {string} Validated provider
 * @throws {ValidationError} If validation fails
 */
export function validateProvider(provider) {
  const allowedProviders = ['openai', 'anthropic', 'gemini'];
  return validateEnum(provider, allowedProviders, 'provider');
}

/**
 * Validates process_committee tool arguments
 * @param {Object} args - Tool arguments
 * @returns {Object} Validated and sanitized arguments
 * @throws {ValidationError} If validation fails
 */
export function validateProcessCommitteeArgs(args) {
  if (!args || typeof args !== 'object') {
    throw new ValidationError('Arguments must be an object');
  }

  const validated = {
    request: validateNonEmptyString(args.request, 'request'),
    context: args.context ? validateNonEmptyString(args.context, 'context') : '',
    agentPreset: args.agentPreset 
      ? validateAgentPreset(args.agentPreset) 
      : 'specialized',
    provider: args.provider ? validateProvider(args.provider) : null,
    aggregatorProvider: args.aggregatorProvider 
      ? validateProvider(args.aggregatorProvider) 
      : null,
    model: args.model && typeof args.model === 'string' && args.model.trim().length > 0
      ? args.model.trim()
      : null,
    aggregatorModel: args.aggregatorModel && typeof args.aggregatorModel === 'string' && args.aggregatorModel.trim().length > 0
      ? args.aggregatorModel.trim()
      : null
  };

  return validated;
}

/**
 * Sanitizes string input to prevent injection
 * @param {string} input - Input string
 * @returns {string} Sanitized string
 */
export function sanitizeString(input) {
  if (typeof input !== 'string') {
    return '';
  }
  // Remove control characters except newlines and tabs
  return input.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
}

/**
 * Validates and sanitizes request string
 * @param {string} request - Request string
 * @returns {string} Validated and sanitized request
 * @throws {ValidationError} If validation fails
 */
export function validateAndSanitizeRequest(request) {
  const validated = validateNonEmptyString(request, 'request');
  return sanitizeString(validated);
}

