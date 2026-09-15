# Port Configuration Rules

## Overview
To prevent port conflicts and broken connections between different AI coding tools, we enforce strict port assignments based on the development environment.

**AI TOOLS: Read `config/ai-port-rules.json` to know which port to use for your environment.**

## Port Assignments

| Environment | Port | Tool | Server Type |
|-------------|------|------|-------------|
| **Replit** | 5000 | Replit AI Coding Tool | Node.js Express |
| **Google AI Studio** | 3000 | Google AI Studio | Node.js Express |
| **Local Development** | 3000 | Any | Node.js Express |

## Configuration Files

### Primary Config File: `config/ai-port-rules.json`
This is the **machine-readable** configuration that both AI tools and the server use to determine the correct port.

- **Replit**: Detects `REPL_ID` environment variable → uses port 5000
- **Google AI Studio**: No `REPL_ID` → uses default port 3000
- **Local**: No `REPL_ID` → uses default port 3000

The server automatically reads this file on startup and applies the correct port.

### For Replit (Port 5000)
- `.replit` - Configured to use port 5000
- `server.js` - Reads from `config/ai-port-rules.json` and detects `REPL_ID` environment variable
- Environment variable: `PORT=5000` (optional override)

### For Google AI Studio (Port 3000)
- Configuration - Configured to use port 3000
- `server.js` - Reads from `config/ai-port-rules.json` and uses default port 3000
- Environment variable: `PORT=3000` (optional override)

## How It Works

The server automatically reads `config/ai-port-rules.json` on startup:

```javascript
// In server.js
const config = JSON.parse(fs.readFileSync('config/ai-port-rules.json', 'utf8'));
if (process.env.REPL_ID) {
  PORT = 5000; // Replit environment
} else {
  PORT = 3000; // Everything else
}
```

**AI tools should:**
1. Read `config/ai-port-rules.json`
2. Check if `REPL_ID` environment variable exists
3. Use port 5000 if `REPL_ID` exists, otherwise use 3000

## How to Switch Between Environments

### For Replit
1. Ensure `.replit` has:
   ```ini
   [[ports]]
   localPort = 5000
   externalPort = 80
   ```
2. The server will automatically use port 5000 (detects `REPL_ID`)

### For Google AI Studio
1. The server will automatically use port 3000 (no `REPL_ID`)
2. Ensure your configuration uses port 3000

## Current Setup

This project is currently configured to **auto-detect the environment** using `config/ai-port-rules.json`.

- Replit: Automatically uses port 5000
- Google AI Studio: Automatically uses port 3000
- Local: Automatically uses port 3000

## Important Notes

1. **AI TOOLS**: Always read `config/ai-port-rules.json` to know your port
2. **Never** hardcode ports in `server.js` - it reads from the config file
3. **The config file is the source of truth** - all port decisions come from here
4. **Test** the application after making changes

## Troubleshooting

If the website breaks after switching:
1. Verify `config/ai-port-rules.json` exists
2. Check that `REPL_ID` environment variable is set in Replit
3. Ensure `server.js` is reading from the config file
4. Restart the server after making changes

## Version History

- v1.1: Added machine-readable `config/ai-port-rules.json` (2024)
  - Server reads config file on startup
  - AI tools can read config to know their port
- v1.0: Initial port rules established (2024)
  - Replit: 5000
  - Google AI Studio: 3000
