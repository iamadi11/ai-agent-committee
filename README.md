# AI Agent Committee MCP Server

<div align="center">

**A powerful multi-agent system that orchestrates specialized AI agents to analyze your requests from multiple perspectives in parallel**

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![MCP](https://img.shields.io/badge/MCP-Protocol-orange.svg)](https://modelcontextprotocol.io/)

</div>

---

## 📊 Codebase Stats

```
┌─────────────────────────────────────────────────────────┐
│  📁 Files: 17 JS files, 3 JSON configs                 │
│  📝 Lines: ~2,931 lines of code                         │
│  🤖 Agents: 4 presets (7-5 agents each)                │
│  🔌 Providers: 3 LLM providers (OpenAI, Anthropic, Gemini) │
│  ⚡ Architecture: Modular, ESM, Worker Threads         │
└─────────────────────────────────────────────────────────┘
```

## 🎯 What It Does

Instead of getting one AI's perspective, you get **multiple specialized agents** working together:

- **Architect** → System design & patterns
- **Planner** → Task breakdown & strategy  
- **Coder** → Implementation & best practices
- **Reviewer** → Code quality & correctness
- **Refactor** → Maintainability & structure
- **Security** → Vulnerabilities & best practices
- **Performance** → Optimization & bottlenecks

All agents work **in parallel** using Node.js worker threads, then a **Committee Aggregator** synthesizes their outputs into a final result.

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- At least one LLM API key (OpenAI, Anthropic, or Gemini)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd ai-agent-committee

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Edit .env and add your API keys:
# OPENAI_API_KEY=your_key_here
# ANTHROPIC_API_KEY=your_key_here
# GEMINI_API_KEY=your_key_here
```

### Verify Setup

```bash
npm test
```

## 💻 Usage

### Method 1: Direct Usage (Command Line / Scripts)

Run the server directly and use it programmatically:

```bash
# Start the MCP server
npm start

# Or with hot-reload (development)
npm run dev
```

**Using the test script:**

```bash
# Basic usage
npm test

# Custom request
node scripts/testCommittee.js "Create a REST API for user authentication" "" "specialized"
```

**Programmatic usage:**

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

### Method 2: IDE Integration (MCP)

Works with any IDE that supports MCP (Cursor, VS Code, etc.).

#### Cursor IDE Setup

1. **Configure MCP in Cursor:**
   - Open Cursor Settings → `Features` → `Model Context Protocol`
   - Edit `~/.cursor/mcp.json`:

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

2. **Use in Cursor:**
   - Open chat/composer
   - Type `@process_committee` or use MCP tools menu
   - Provide your request:
   ```
   @process_committee request="Create a REST API for user authentication" agentPreset="specialized"
   ```

#### VS Code Setup

1. **Install MCP Extension:**
   - Install `Model Context Protocol` extension from marketplace

2. **Configure in VS Code:**
   - Edit `.vscode/settings.json` or user settings:

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

3. **Use the tool:**
   - Press `Cmd/Ctrl + Shift + P`
   - Search "MCP: Call Tool"
   - Select `process_committee`
   - Enter your request

#### Direct MCP Tool Invocation

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

## 🤖 Agent Presets

Choose the right team for your task:

| Preset | Agents | Best For |
|--------|--------|----------|
| **specialized** | 7 agents | Comprehensive analysis, complex projects |
| **frontend** | 5 agents | UI/UX, React, Vue, frontend architecture |
| **backend** | 5 agents | APIs, databases, microservices, server logic |
| **fullstack** | 5 agents | End-to-end systems, full application development |

### Specialized Agents (Default)

```
┌─────────────────────────────────────────────────────────┐
│  ArchitectAgent  → System architecture & design patterns│
│  PlannerAgent    → Implementation planning & breakdown  │
│  CoderAgent      → Code implementation & best practices │
│  ReviewerAgent   → Code quality & correctness review   │
│  RefactorAgent   → Code structure & maintainability     │
│  SecurityAgent   → Security vulnerabilities & practices│
│  PerformanceAgent→ Performance optimization & bottlenecks│
└─────────────────────────────────────────────────────────┘
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Your Request                         │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│              MCP Server (Orchestrator)                   │
│  • Input validation                                     │
│  • Agent configuration loading                          │
│  • Prompt generation                                    │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│         Worker Threads (Parallel Execution)             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │ Agent 1   │  │ Agent 2   │  │ Agent 7  │            │
│  │ → LLM API │  │ → LLM API │  │ → LLM API│            │
│  └──────────┘  └──────────┘  └──────────┘            │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│            Committee Aggregator                          │
│  • Evaluates all outputs                                │
│  • LLM-based synthesis (or heuristic fallback)          │
│  • Produces final result with winner & recommendations │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│              Formatted Response                          │
│  • All agent responses                                  │
│  • Final synthesis                                      │
│  • Recommendations & code                               │
└─────────────────────────────────────────────────────────┘
```

## ⚙️ Configuration

### Environment Variables

Create `.env` file:

```bash
# At least one API key required
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Default provider
DEFAULT_PROVIDER=openai
```

### Agent Configuration

Agents are defined in `config/agentConfigs.json`. To add a new agent:

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

## 📝 API Reference

### MCP Tool: `process_committee`

**Parameters:**
- `request` (required, string): The task or request to process
- `context` (optional, string): Additional context from previous conversations
- `agentPreset` (optional, string): `"specialized"`, `"frontend"`, `"backend"`, `"fullstack"` (default: `"specialized"`)
- `provider` (optional, string): `"openai"`, `"anthropic"`, `"gemini"` (default: first available)
- `aggregatorProvider` (optional, string): Provider for aggregator (default: same as provider)
- `model` (optional, string): Specific model to use (e.g., `"gpt-4o-mini"`)
- `aggregatorModel` (optional, string): Model for aggregator

**Response Structure:**

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

## 🔧 Features

✅ **Parallel Processing** - All agents execute simultaneously  
✅ **Multiple LLM Providers** - OpenAI, Anthropic, Gemini  
✅ **Multiple Agent Presets** - Specialized, Frontend, Backend, Fullstack  
✅ **Committee Aggregation** - LLM-based synthesis of all outputs  
✅ **MCP Integration** - Works with any MCP-compatible IDE  
✅ **Robust Error Handling** - MCP-compliant error codes  
✅ **Input Validation** - Comprehensive validation & sanitization  
✅ **Resource Management** - Timeout handling, proper cleanup  
✅ **Fallback Mode** - Works without API keys (prompt-only mode)

## 🐛 Troubleshooting

### "No LLM providers configured"
- Set at least one API key in `.env` file
- Or use Fallback Mode (no keys needed) - server runs with prompt-only responses
- Run `npm test` to verify configuration

### "Server not appearing in IDE"
- Verify MCP server path is correct (use absolute path)
- Check Node.js is in PATH: `which node`
- Ensure server starts: `npm start`
- Restart IDE after configuration changes

### "Tool not found in IDE"
- Verify server is configured in IDE settings
- Check server is running: `npm start`
- Verify tool name is `process_committee` (case-sensitive)
- Check MCP is enabled in IDE

### "Timeout Error"
- Agent processing exceeded 2-minute timeout
- Consider breaking down complex requests
- Check network connectivity and API response times

## 📁 Project Structure

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

## 🧪 Testing

```bash
# Run test script
npm test

# Custom test
node scripts/testCommittee.js "Your request" "Context" "preset"
```

## 🔒 Security

- ✅ Input sanitization and validation
- ✅ API keys stored in `.env` (never commit)
- ✅ No sensitive data in error messages
- ✅ Timeout protection prevents resource exhaustion
- ✅ Injection prevention

## 📚 Resources

- [Model Context Protocol](https://modelcontextprotocol.io/)
- [OpenAI API Docs](https://platform.openai.com/docs)
- [Anthropic API Docs](https://docs.anthropic.com/)
- [Google Gemini API Docs](https://ai.google.dev/docs)

## 📄 License

MIT

---

<div align="center">

**Built with ❤️ using Model Context Protocol**

[Report Bug](https://github.com/your-repo/issues) · [Request Feature](https://github.com/your-repo/issues)

</div>
