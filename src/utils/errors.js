/**
 * Custom Error Classes
 * Provides structured error handling with error codes
 */

/**
 * Base MCP Error class
 */
export class MCPError extends Error {
  constructor(message, code = 'INTERNAL_ERROR', statusCode = 500) {
    super(message);
    this.name = 'MCPError';
    this.code = code;
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Converts error to MCP-compliant error response
   */
  toMCPError() {
    return {
      code: this.code,
      message: this.message,
      data: {
        statusCode: this.statusCode
      }
    };
  }
}

/**
 * Validation Error - for input validation failures
 */
export class ValidationError extends MCPError {
  constructor(message, field = null) {
    super(message, 'INVALID_REQUEST', 400);
    this.name = 'ValidationError';
    this.field = field;
  }

  toMCPError() {
    return {
      ...super.toMCPError(),
      data: {
        ...super.toMCPError().data,
        field: this.field
      }
    };
  }
}

/**
 * Provider Error - for LLM provider API errors
 */
export class ProviderError extends MCPError {
  constructor(message, provider = null, originalError = null) {
    super(message, 'PROVIDER_ERROR', 502);
    this.name = 'ProviderError';
    this.provider = provider;
    this.originalError = originalError;
  }

  toMCPError() {
    return {
      ...super.toMCPError(),
      data: {
        ...super.toMCPError().data,
        provider: this.provider,
        originalError: this.originalError?.message
      }
    };
  }
}

/**
 * Worker Error - for worker thread errors
 */
export class WorkerError extends MCPError {
  constructor(message, agentName = null, exitCode = null) {
    super(message, 'WORKER_ERROR', 500);
    this.name = 'WorkerError';
    this.agentName = agentName;
    this.exitCode = exitCode;
  }

  toMCPError() {
    return {
      ...super.toMCPError(),
      data: {
        ...super.toMCPError().data,
        agentName: this.agentName,
        exitCode: this.exitCode
      }
    };
  }
}

/**
 * Configuration Error - for configuration issues
 */
export class ConfigurationError extends MCPError {
  constructor(message) {
    super(message, 'CONFIGURATION_ERROR', 500);
    this.name = 'ConfigurationError';
  }
}

/**
 * Timeout Error - for operation timeouts
 */
export class TimeoutError extends MCPError {
  constructor(message, operation = null, timeoutMs = null) {
    super(message, 'TIMEOUT_ERROR', 504);
    this.name = 'TimeoutError';
    this.operation = operation;
    this.timeoutMs = timeoutMs;
  }

  toMCPError() {
    return {
      ...super.toMCPError(),
      data: {
        ...super.toMCPError().data,
        operation: this.operation,
        timeoutMs: this.timeoutMs
      }
    };
  }
}

