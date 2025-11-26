# Debug Widget

An embeddable browser widget for capturing debug data and interactive Q&A with Claude Code.

## Overview

Drop this lightweight widget into any web application to instantly send debug information (console logs, errors, screenshots) directly to Claude Code for analysis. The widget also supports interactive Q&A sessions where Claude can ask clarifying questions right in your browser.

## Features

- **Zero-Config Embedding**: Add with a single script tag or npm import
- **Auto-Capture**: Automatically intercepts console logs and errors
- **Screenshot Tool**: Capture page screenshots with one click
- **Interactive Q&A**: Answer Claude's questions directly in browser
- **Lightweight**: Under 100KB gzipped bundle size
- **No Page Interference**: Shadow DOM ensures zero conflicts with your app

## Quick Start

### CDN (No Build Required)

```html
<!DOCTYPE html>
<html>
<head>
  <!-- Add this script tag -->
  <script src="https://unpkg.com/@yourco/debug-widget"></script>
</head>
<body>
  <!-- Your app content -->
</body>
</html>
```

The widget automatically initializes and appears in the bottom-right corner.

### npm Installation

```bash
npm install @yourco/debug-widget
```

```typescript
// In your entry file (e.g., main.ts)
import '@yourco/debug-widget'

// That's it! Widget auto-initializes
```

### Conditional Loading (Dev Only)

```typescript
// Only load in development
if (import.meta.env.DEV) {
  import('@yourco/debug-widget')
}

// Or with environment variable
if (process.env.NODE_ENV === 'development') {
  import('@yourco/debug-widget')
}
```

## Usage

### Basic Workflow

1. Widget appears as floating button in bottom-right corner
2. Click to open debug panel
3. Add optional comment describing the issue
4. Click "Capture Screenshot" (optional)
5. Click "Send to Claude"
6. Debug data is sent to MCP server
7. Claude Code receives and analyzes the data

### Interactive Q&A

When Claude needs clarification:

1. Q&A modal automatically appears
2. Answer questions one at a time
3. Use "Back" button to edit previous answers
4. Review all answers on final screen
5. Click "Submit" to send answers to Claude
6. Claude continues debugging with full context

## Configuration

### Global Configuration

```typescript
// Set before widget loads
window.debugWidget = {
  enabled: true,                    // Enable/disable widget
  mcpUrl: 'http://localhost:3000',  // MCP server URL
  position: 'bottom-right',         // Widget position
  theme: 'auto',                    // 'light' | 'dark' | 'auto'
  hideScreenshot: false,            // Hide screenshot feature
  keyboardShortcut: 'Cmd+Shift+D',  // Keyboard shortcut to toggle
  maxLogEntries: 1000,              // Max console logs to keep
  maxFileSize: 10 * 1024 * 1024,    // Max file upload size (10MB)
}
```

### Programmatic Control

```typescript
// Access widget API (if exposed)
window.debugWidget.open()          // Open debug panel
window.debugWidget.close()         // Close debug panel
window.debugWidget.toggle()        // Toggle debug panel
window.debugWidget.capture()       // Capture screenshot
window.debugWidget.send()          // Send debug report
```

## Requirements

### MCP Server

This widget requires the Debug MCP Server to be running:

```bash
# Install and run MCP server
npm install -g @yourco/debug-mcp-server
debug-mcp-server

# Or use npx
npx @yourco/debug-mcp-server
```

See [@yourco/debug-mcp-server](https://github.com/yourco/debug-mcp-server) for details.

### Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

Requires modern browser with:
- ES6 support
- WebSocket API
- Canvas API (for screenshots)

## Development

### Setup

```bash
# Clone the repository
git clone https://github.com/yourco/debug-widget.git
cd debug-widget

# Install dependencies
npm install

# Run development server with demo page
npm run dev

# Open http://localhost:5173/demo
```

### Project Structure

```
debug-widget/
├── src/
│   ├── index.ts              # Entry point
│   ├── widget/               # Main widget components
│   ├── capture/              # Console/error capture
│   ├── api/                  # MCP server communication
│   └── components/           # Reusable UI components
├── demo/                     # Demo page for testing
├── specs/                    # SpecKit specifications
└── tests/                    # Vitest + Playwright tests
```

### Testing

```bash
# Run unit tests
npm test

# Run E2E tests (Playwright)
npm run test:e2e

# Run with coverage
npm run test:coverage
```

### Building

```bash
# Build for production
npm run build

# Outputs:
# - dist/debug-widget.js (UMD bundle for CDN)
# - dist/debug-widget.es.js (ES module)
# - dist/debug-widget.d.ts (TypeScript types)

# Check bundle size
npm run analyze
```

## Architecture

```
┌─────────────────────────────────┐
│  Debug Widget (Browser)         │
│  ┌─────────────────────────┐    │
│  │ Auto-Capture            │    │
│  │  - Console logs         │    │
│  │  - JavaScript errors    │    │
│  └─────────────────────────┘    │
│  ┌─────────────────────────┐    │
│  │ UI Components           │    │
│  │  - Floating button      │    │
│  │  - Debug panel          │    │
│  │  - Q&A modal            │    │
│  └─────────────────────────┘    │
│  ┌─────────────────────────┐    │
│  │ Screenshot Tool         │    │
│  │  (html2canvas)          │    │
│  └─────────────────────────┘    │
└──────────┬──────────────────────┘
           │
           ↓ HTTP/WebSocket
┌──────────────────────────────────┐
│  Debug MCP Server (localhost)    │
└──────────┬───────────────────────┘
           │
           ↓ MCP Protocol
┌──────────────────────────────────┐
│  Claude Code (VS Code)           │
└──────────────────────────────────┘
```

## Advanced Usage

### Custom Styling

Widget uses Shadow DOM, so it won't affect your styles. To customize widget appearance, use configuration:

```typescript
window.debugWidget = {
  theme: 'dark',
  position: 'bottom-left',
}
```

### File Uploads

Drag and drop files into the debug panel to attach them to your report:

```typescript
// Supported file types
- .log, .txt (log files)
- .json (config files)
- .har (network traces)
- .png, .jpg (additional screenshots)
```

### Programmatic Debug Reports

Send debug data programmatically:

```typescript
// Custom error reporting
window.debugWidget.sendReport({
  logs: [/* custom log entries */],
  error: { message: '...', stack: '...' },
  comment: 'Custom error report',
  metadata: { userId: '123', feature: 'checkout' }
})
```

## Troubleshooting

### Widget not appearing

1. Check browser console for errors
2. Verify script is loaded: `console.log(window.debugWidget)`
3. Check `enabled` configuration
4. Try different position: `window.debugWidget = { position: 'bottom-left' }`

### Can't send to Claude

1. Verify MCP server is running: `curl http://localhost:3000/api/health`
2. Check browser console for network errors
3. Verify `mcpUrl` configuration
4. Check CORS settings (localhost should be allowed)

### Screenshot not working

1. Check for CSP (Content Security Policy) restrictions
2. Ensure page is not cross-origin (same-origin policy)
3. Try on different page
4. Check browser console for html2canvas errors

### Q&A modal not appearing

1. Verify WebSocket connection: Check browser console
2. Ensure MCP server WebSocket is running
3. Try reconnecting: Close and reopen widget
4. Check firewall settings (should allow localhost WebSocket)

## Performance

- **Bundle size**: <100KB gzipped
- **Initialization time**: <500ms
- **Memory usage**: ~5MB (for log buffer)
- **Screenshot time**: 1-3 seconds (depends on page complexity)

## Security

- Localhost only (sends data to localhost:3000 only)
- Shadow DOM isolation (no access to host page data)
- No external network requests
- No data persistence in browser (sent immediately to MCP server)
- Development tool only (disable in production)

## Contributing

See [CLAUDE.md](./CLAUDE.md) for development guidelines and project constitution.

## License

MIT

## Support

For issues and feature requests, please open an issue on GitHub.
