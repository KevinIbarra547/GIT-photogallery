# Port Configuration Rules

## Overview
To prevent port conflicts and broken connections between different AI coding tools, we enforce strict port assignments based on the development environment.

## Port Assignments

| Environment | Port | Tool | Server Type |
|-------------|------|------|-------------|
| **Replit** | 5000 | Replit AI Coding Tool | Node.js Express |
| **Google AI Studio** | 3000 | Google AI Studio | Node.js Express |
| **Local Development** | 3000 | Any | Node.js Express |

## Configuration Files

### For Replit (Port 5000)
- `.replit` - Configured to use port 5000
- `server.js` - Reads from `process.env.PORT` (Replit sets this to 5000)
- Environment variable: `PORT=5000`

### Auto-Detection in `server.js`
`server.js` automatically detects whether it is running on **Replit** (via `process.env.REPL_ID`) or **Google AI Studio / Local**:
```javascript
const isReplit = Boolean(process.env.REPL_ID || process.env.REPLIT_ENVIRONMENT);
const PORT = isReplit ? (process.env.PORT ? parseInt(process.env.PORT, 10) : 5000) : 3000;
```
*Note for Google AI Studio*: In Cloud Run containers, `process.env.PORT` is set internally to `8080`, but the platform proxy routes external web traffic strictly through port `3000`. The auto-detector ensures AI Studio uses port `3000` while Replit seamlessly uses port `5000`.*

## How to Switch Between Environments

### Switching to Replit (Port 5000)
1. Ensure `.replit` has:
   ```
   [[ports]]
   localPort = 5000
   externalPort = 80
   ```
2. Set environment variable in Replit Secrets:
   - Key: `PORT`
   - Value: `5000`
3. Update `server.js` if needed:
   ```javascript
   const PORT = process.env.PORT || 5000;
   ```

### Switching to Google AI Studio (Port 3000)
1. Ensure configuration has:
   ```
   [[ports]]
   localPort = 3000
   externalPort = 80
   ```
2. Set environment variable:
   - Key: `PORT`
   - Value: `3000`
3. Update `server.js` if needed:
   ```javascript
   const PORT = process.env.PORT || 3000;
   ```

## Current Setup

This project is currently configured for **Replit on port 5000**.

To switch to Google AI Studio:
1. Update `.replit` to use port 3000
2. Add `PORT=3000` to your environment variables
3. The `server.js` will automatically use port 3000

## Important Notes

1. **Never** hardcode ports in `server.js` - always use `process.env.PORT`
2. **Always** check which tool you're using before pushing changes
3. **Document** any port changes in this file
4. **Test** the application after switching ports

## Troubleshooting

If the website breaks after switching:
1. Verify the port in `.replit` matches your environment
2. Check that `PORT` environment variable is set correctly
3. Ensure `server.js` is using `process.env.PORT`
4. Restart the server after making changes

## Version History

- v1.0: Initial port rules established (2024)
  - Replit: 5000
  - Google AI Studio: 3000
