/**
 * Logger utility for MCP server
 * All logs must go to stderr to avoid interfering with MCP protocol (which uses stdout)
 */

/**
 * Logs an info message to stderr
 * @param {...any} args - Arguments to log
 */
export function log(...args) {
  console.error(...args);
}

/**
 * Logs an error message to stderr
 * @param {...any} args - Arguments to log
 */
export function error(...args) {
  console.error(...args);
}

/**
 * Logs a warning message to stderr
 * @param {...any} args - Arguments to log
 */
export function warn(...args) {
  console.error(...args);
}

