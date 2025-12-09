# AI Agent Committee MCP Server

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![MCP](https://img.shields.io/badge/MCP-Protocol-orange.svg)](https://modelcontextprotocol.io/)

This is a multi-agent system that runs multiple specialized AI agents in parallel to tackle your coding tasks from different angles. Instead of getting one AI's answer, you get a whole committee working together.

## What's the idea?

You know how sometimes you want multiple perspectives on a coding problem? Like asking one person about architecture, another about security, and someone else about performance? That's what this does, but with AI agents running at the same time.

Here's what each agent brings to the table:

- **Architect** - Thinks about system design and patterns
- **Planner** - Breaks down tasks and figures out strategy
- **Coder** - Focuses on implementation and best practices
- **Reviewer** - Checks code quality and correctness
- **Refactor** - Looks at maintainability and structure
- **Security** - Finds vulnerabilities and security issues
- **Performance** - Optimizes and finds bottlenecks

They all run in parallel using Node.js worker threads, and then an aggregator combines all their outputs into something coherent. It's pretty neat when you see it working.

## Getting Started

You'll need Node.js 18 or higher, and at least one LLM API key (OpenAI, Anthropic, or Gemini - pick whichever you prefer).

```bash
git clone <repository-url>
cd ai-agent-committee
npm install
```

Create a `.env` file and add your API keys:

```bash
OPENAI_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
GEMINI_API_KEY=your_key_here
```

You only need one of these, but you can use all three if you want. Run `npm test` to make sure everything is working.

## How to Use It

There are a couple ways to use this. The easiest is probably through your IDE if it supports MCP, but you can also use it from the command line or import it in your code.

### Using from Command Line

```bash
npm start
```

Or if you want hot-reload during development:

```bash
npm run dev
```

There's also a test script that lets you try it out quickly:

```bash
npm test

# Or with your own request
node scripts/testCommittee.js "Create a REST API for user authentication" "" "specialized"
```

### Using in Your Code

You can import and use it directly:

```javascript
import { processAllAgents } from './src/orchestrator/agentProcessor.js';

const result = await processAllAgents(
  "Refactor authentication code to use JWT tokens",
  "Current code uses session-based auth",
  "specialized",
  "openai"
);

console.log(result);
```

### Using in Your IDE (MCP)

This works with any IDE that supports MCP (like Cursor or VS Code with the right extension).

**For Cursor:**

1. Go to Cursor Settings → `Features` → `Model Context Protocol`
2. Edit `~/.cursor/mcp.json` and add:

```json
{
  "mcpServers": {
    "ai-agent-committee": {
      "command": "node",
      "args": ["/absolute/path/to/ai-agent-committee/src/server/index.js"],
      "env": {
        "OPENAI_API_KEY": "your-key-here",
        "ANTHROPIC_API_KEY": "your-key-here",
        "GEMINI_API_KEY": "your-key-here"
      }
    }
  }
}
```

3. Then in Cursor's chat, type `@process_committee` or use the MCP tools menu. Something like:
   ```
   @process_committee request="Create a REST API for user authentication" agentPreset="specialized"
   ```

**For VS Code:**

1. Install the `Model Context Protocol` extension
2. Edit `.vscode/settings.json` (or your user settings):

```json
{
  "mcp.servers": {
    "ai-agent-committee": {
      "command": "node",
      "args": ["${workspaceFolder}/src/server/index.js"],
      "env": {
        "OPENAI_API_KEY": "${env:OPENAI_API_KEY}",
        "ANTHROPIC_API_KEY": "${env:ANTHROPIC_API_KEY}",
        "GEMINI_API_KEY": "${env:GEMINI_API_KEY}"
      }
    }
  }
}
```

3. Press `Cmd/Ctrl + Shift + P`, search for "MCP: Call Tool", select `process_committee`, and enter your request.

**Direct MCP protocol calls:**

If you're calling it directly via the MCP protocol, here's the format:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "process_committee",
    "arguments": {
      "request": "Refactor this authentication code to use JWT tokens",
      "context": "Current code uses session-based auth",
      "agentPreset": "specialized",
      "provider": "openai"
    }
  }
}
```

## Agent Presets

There are different presets you can use depending on what you're working on. Each one has a different mix of agents tuned for specific tasks.

| Preset | Agents | When to Use |
|--------|--------|-------------|
| **specialized** | 7 agents | Complex projects, when you need comprehensive analysis |
| **frontend** | 5 agents | UI/UX work, React/Vue projects, frontend architecture |
| **backend** | 5 agents | APIs, databases, microservices, server-side stuff |
| **fullstack** | 5 agents | Full applications, end-to-end development |

The default is `specialized`, which includes all 7 agents:
- **ArchitectAgent** - System architecture & design patterns
- **PlannerAgent** - Implementation planning & breakdown
- **CoderAgent** - Code implementation & best practices
- **ReviewerAgent** - Code quality & correctness review
- **RefactorAgent** - Code structure & maintainability
- **SecurityAgent** - Security vulnerabilities & best practices
- **PerformanceAgent** - Performance optimization & bottlenecks

## How It Works

Here's the basic flow:

1. You send a request
2. The MCP server validates it, loads agent configs, and generates prompts
3. All agents run in parallel using Node.js worker threads (they all hit the LLM API at the same time)
4. The committee aggregator takes all the outputs and synthesizes them into a final result
5. You get back all the individual agent responses plus a synthesized final answer

The parallel execution is what makes this fast - instead of waiting for 7 agents to run one after another, they all go at once. The aggregator then picks the best ideas from each and combines them.

## Configuration

### Environment Variables

Create a `.env` file with at least one API key (you only need one, but you can add all three):

```bash
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: pick a default provider
DEFAULT_PROVIDER=openai
```

### Adding Custom Agents

If you want to add your own agents, edit `config/agentConfigs.json`. The structure looks like this:

```json
{
  "presets": {
    "specialized": {
      "agents": [
        {
          "name": "YourNewAgent",
          "role": "Your Agent Role",
          "description": "What your agent does",
          "focus": "Key focus areas",
          "guidelines": ["Guideline 1", "Guideline 2"],
          "approach": "How the agent approaches tasks"
        }
      ]
    }
  }
}
```

## API Reference

The MCP tool is called `process_committee`. Here's what you can pass to it:

**Parameters:**
- `request` (required) - The task you want the agents to work on
- `context` (optional) - Any additional context from previous conversations
- `agentPreset` (optional) - `"specialized"`, `"frontend"`, `"backend"`, or `"fullstack"`. Defaults to `"specialized"`
- `provider` (optional) - `"openai"`, `"anthropic"`, or `"gemini"`. Defaults to the first available one
- `aggregatorProvider` (optional) - Which provider to use for the aggregator. Defaults to the same as `provider`
- `model` (optional) - Specific model like `"gpt-4o-mini"` if you want to override defaults
- `aggregatorModel` (optional) - Model for the aggregator

**What you get back:**

```json
{
  "workflow": {
    "userRequest": "...",
    "agentPreset": "specialized",
    "totalAgents": 7,
    "successfulAgents": 7,
    "failedAgents": 0
  },
  "agents": [
    {
      "agent": "ArchitectAgent",
      "role": "System Architect",
      "actualResponse": "...",
      "success": true
    }
  ],
  "finalSynthesis": {
    "winner": "SecurityAgent",
    "synthesis": "Based on all agent outputs...",
    "recommendations": ["...", "..."],
    "finalCode": "// Complete implementation...",
    "method": "llm"
  }
}
```

## Features

- All agents run in parallel (much faster than sequential)
- Supports OpenAI, Anthropic, and Gemini APIs
- Different agent presets for different types of work
- Aggregator combines all agent outputs into something coherent
- Works as an MCP server, so you can use it in Cursor, VS Code, etc.
- Error handling that follows MCP standards
- Input validation to catch issues early
- Timeouts and cleanup to prevent resource leaks
- Can run in a fallback mode without API keys (though responses will be limited)

## Troubleshooting

**"No LLM providers configured"**

Make sure you've set at least one API key in your `.env` file. If you want to test without keys, there's a fallback mode that works (though responses are limited). Run `npm test` to check your setup.

**"Server not appearing in IDE"**

- Make sure the MCP server path in your IDE config is an absolute path
- Check that Node.js is available: `which node`
- Try starting the server manually: `npm start`
- Restart your IDE after changing the MCP config

**"Tool not found in IDE"**

- Double-check the server is configured correctly in IDE settings
- Make sure the server actually starts: `npm start`
- The tool name is `process_committee` (case-sensitive)
- Verify MCP is enabled in your IDE

**"Timeout Error"**

Agents have a 2-minute timeout. If you're hitting this, try breaking your request into smaller chunks. Also check your network connection and API response times.

## Project Structure

```
ai-agent-committee/
├── src/
│   ├── agents/          # LLM provider implementations
│   ├── committee/       # Committee aggregator
│   ├── config/          # Configuration loaders
│   ├── orchestrator/    # Workflow orchestration
│   ├── prompts/         # Prompt generation
│   ├── server/          # MCP server
│   ├── utils/           # Utilities (errors, validation, etc.)
│   └── workers/         # Worker thread implementation
├── config/
│   └── agentConfigs.json  # Agent definitions
├── scripts/
│   └── testCommittee.js   # Test script
└── package.json
```

## Testing

Run the test script:

```bash
npm test
```

Or test with your own request:

```bash
node scripts/testCommittee.js "Your request" "Context" "preset"
```

## Security Notes

- All inputs are validated and sanitized
- API keys go in `.env` (never commit this file)
- Error messages don't leak sensitive info
- Timeouts prevent resource exhaustion
- Injection attempts are blocked

## Resources

- [Model Context Protocol](https://modelcontextprotocol.io/)
- [OpenAI API Docs](https://platform.openai.com/docs)
- [Anthropic API Docs](https://docs.anthropic.com/)
- [Google Gemini API Docs](https://ai.google.dev/docs)

## License

MIT
