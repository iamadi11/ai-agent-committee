/**
 * Agent Configuration Loader
 * Loads and validates agent configurations from JSON file
 */

import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Loads agent configuration from JSON file
 * @returns {Promise<Object>} Agent configuration object
 */
export async function loadAgentConfig() {
  try {
    const configPath = join(__dirname, '../../config/agentConfigs.json');
    const configContent = await readFile(configPath, 'utf-8');
    const config = JSON.parse(configContent);
    
    // Validate configuration structure
    validateConfig(config);
    
    return config;
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error('Agent configuration file not found. Please ensure config/agentConfigs.json exists.');
    }
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in agent configuration: ${error.message}`);
    }
    throw new Error(`Failed to load agent configuration: ${error.message}`);
  }
}

/**
 * Validates the configuration structure
 * @param {Object} config - Configuration object to validate
 */
function validateConfig(config) {
  if (!config.presets || typeof config.presets !== 'object') {
    throw new Error('Configuration must have a "presets" object');
  }

  for (const [presetKey, preset] of Object.entries(config.presets)) {
    if (!preset.name || !preset.description || !preset.agents) {
      throw new Error(`Preset "${presetKey}" must have "name", "description", and "agents" properties`);
    }

    if (!Array.isArray(preset.agents) || preset.agents.length === 0) {
      throw new Error(`Preset "${presetKey}" must have a non-empty "agents" array`);
    }

    for (const [index, agent] of preset.agents.entries()) {
      const requiredFields = ['name', 'role', 'description', 'focus', 'guidelines', 'approach'];
      for (const field of requiredFields) {
        if (!agent[field]) {
          throw new Error(
            `Preset "${presetKey}", agent ${index} (${agent.name || 'unnamed'}) is missing required field: "${field}"`
          );
        }
      }

      if (!Array.isArray(agent.guidelines)) {
        throw new Error(
          `Preset "${presetKey}", agent ${index} (${agent.name}) must have "guidelines" as an array`
        );
      }
    }
  }
}

/**
 * Gets agents for a specific preset
 * @param {string} presetName - Name of the preset (e.g., "specialized", "frontend", "backend", "fullstack")
 * @returns {Promise<Array>} Array of agent definitions
 */
export async function getAgentsByPreset(presetName = 'specialized') {
  const config = await loadAgentConfig();
  
  if (!config.presets[presetName]) {
    const availablePresets = Object.keys(config.presets).join(', ');
    throw new Error(
      `Preset "${presetName}" not found. Available presets: ${availablePresets}`
    );
  }

  return config.presets[presetName].agents;
}

/**
 * Gets all available preset names
 * @returns {Promise<Array<string>>} Array of preset names
 */
export async function getAvailablePresets() {
  const config = await loadAgentConfig();
  return Object.keys(config.presets);
}

/**
 * Gets preset information
 * @param {string} presetName - Name of the preset
 * @returns {Promise<Object>} Preset information (name, description, agent count)
 */
export async function getPresetInfo(presetName = 'specialized') {
  const config = await loadAgentConfig();
  
  if (!config.presets[presetName]) {
    const availablePresets = Object.keys(config.presets).join(', ');
    throw new Error(
      `Preset "${presetName}" not found. Available presets: ${availablePresets}`
    );
  }

  const preset = config.presets[presetName];
  return {
    name: preset.name,
    description: preset.description,
    agentCount: preset.agents.length,
    agents: preset.agents.map(a => ({
      name: a.name,
      role: a.role,
      description: a.description,
      focus: a.focus
    }))
  };
}


