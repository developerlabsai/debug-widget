# CLAUDE.md - Debug Widget Project Constitution

This file defines the rules, patterns, and guidelines that Claude Code must follow when working on this project.

## Project Overview

**Debug Widget** - An embeddable browser widget for capturing debug data and interactive Q&A with Claude Code.

### Project Scope

This project is focused on:

- Easy embedding in any web application (script tag or npm)
- Auto-capturing console logs and JavaScript errors
- Taking page screenshots
- Sending debug data to MCP server
- Interactive Q&A UI for Claude Code clarifications
- File upload support

**Out of scope:** Mobile app debugging, backend debugging, historical browsing, advanced profiling

### Tech Stack

- **Framework**: Preact (lightweight React alternative, 3KB)
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS (inline via UnoCSS or similar)
- **Screenshot**: html2canvas
- **Build**: Vite
- **Testing**: Vitest + Playwright (E2E)
- **Distribution**: npm + CDN (unpkg)

---

## Development Workflow: SpecKit First

**ALWAYS use SpecKit before implementing any new feature.**

### Feature Development Process

```text
1. DISCUSS    →  2. SPEC      →  3. BUILD     →  4. SHIP
   (Clarify)      (SpecKit)      (Implement)     (Deploy)
```

---

## Core Principles

### 1. Zero-Config Embedding

**Make it ridiculously easy to add to any project.**

- CDN: Just add `<script>` tag
- npm: Just `import '@yourco/debug-widget'`
- Auto-initialization, no setup code needed

### 2. Lightweight Bundle

**Keep bundle size under 100KB (gzipped).**

- Use Preact (not React)
- Tree-shake unused code
- Lazy-load screenshot library
- Minimize dependencies

### 3. Zero Page Interference

**Never break the host page.**

- Use Shadow DOM or scoped CSS
- Namespace all globals
- Don't pollute window object
- Handle CSP, ad blockers gracefully

### 4. Developer Experience

**Make debugging feel effortless.**

- One-click send to Claude
- Auto-capture everything
- Clear visual feedback
- Helpful error messages

---

## Code Standards

### TypeScript

```typescript
// Use strict mode
"strict": true

// Explicit types, avoid 'any'
// Prefer interfaces over types for objects
// Component props must be typed
```

### File Organization

```text
debug-widget/
├── src/
│   ├── index.ts              # Entry point (auto-init)
│   ├── widget/               # Main widget component
│   │   ├── Widget.tsx        # Root component
│   │   ├── FloatingButton.tsx # Floating trigger button
│   │   ├── DebugPanel.tsx    # Main debug panel
│   │   └── QAModal.tsx       # Q&A modal overlay
│   ├── capture/              # Debug data capture
│   │   ├── console-capture.ts # Console log interceptor
│   │   ├── error-capture.ts   # Error event handler
│   │   └── screenshot.ts      # Screenshot capture
│   ├── api/                  # MCP server communication
│   │   ├── client.ts         # HTTP/WebSocket client
│   │   └── types.ts          # API types
│   ├── components/           # Reusable UI components
│   │   ├── Stepper.tsx       # Question stepper
│   │   ├── QuestionInput.tsx # Question input fields
│   │   └── ReviewScreen.tsx  # Answer review
│   ├── types/                # TypeScript types
│   │   └── index.ts
│   └── config/               # Configuration
│       └── index.ts
├── specs/                    # SpecKit specifications
├── tests/                    # Vitest + Playwright tests
├── demo/                     # Demo page for testing
├── package.json
├── vite.config.ts
└── CLAUDE.md
```

### Naming Conventions

- **Files**: kebab-case (`console-capture.ts`)
- **Components**: PascalCase (`DebugPanel.tsx`)
- **Functions**: camelCase (`captureScreenshot`)
- **Constants**: SCREAMING_SNAKE (`DEFAULT_MCP_URL`)

---

## UI/UX Guidelines

### Visual Design

- Floating button: 56px circle, bottom-right, fixed position
- Color scheme: Neutral (doesn't clash with host site)
- Dark mode support (detect prefers-color-scheme)
- Z-index: 999999 (always on top)

### Interactions

- Smooth animations (CSS transitions)
- Loading states for async operations
- Success/error toast notifications
- Keyboard shortcuts (e.g., Cmd+Shift+D to toggle)

---

## Component Architecture

### Shadow DOM Encapsulation

```typescript
// Use Shadow DOM to prevent CSS conflicts
const shadow = container.attachShadow({ mode: 'open' })
render(<Widget />, shadow)
```

### State Management

Use Preact hooks (no external state library):
- `useState` for local state
- `useContext` for global config
- `useEffect` for side effects

---

## Console Capture Implementation

**Intercept console methods without breaking them.**

```typescript
const original = console.log
console.log = (...args) => {
  // Capture for widget
  captureLog('log', args)
  // Call original
  original.apply(console, args)
}
```

### Capture Format

```typescript
interface LogEntry {
  level: 'log' | 'warn' | 'error'
  message: string
  timestamp: number
  stack?: string // For errors
}
```

---

## Screenshot Implementation

Use html2canvas with performance optimizations:

```typescript
import('html2canvas').then(({ default: html2canvas }) => {
  html2canvas(document.body, {
    allowTaint: true,
    useCORS: true,
    scale: 0.5 // Reduce size
  }).then(canvas => {
    const base64 = canvas.toDataURL('image/png', 0.8)
    // Send to MCP server
  })
})
```

---

## WebSocket Connection

Maintain persistent connection to MCP server:

```typescript
const ws = new WebSocket('ws://localhost:3000')

ws.onmessage = (event) => {
  const data = JSON.parse(event.data)
  if (data.type === 'questions') {
    showQAModal(data.questions)
  }
}

// Reconnect on disconnect
ws.onclose = () => {
  setTimeout(() => connect(), 1000)
}
```

---

## Q&A Modal Design

### Stepper UI

```
┌────────────────────────────────┐
│  ● ───── ○ ───── ○  Question 1/3
│
│  What were you trying to do?
│  ┌──────────────────────────┐
│  │ [Text input]             │
│  └──────────────────────────┘
│
│        [Back]    [Next →]
└────────────────────────────────┘
```

### Navigation Logic

- Back button disabled on first question
- Next button disabled if required field empty
- Review screen on last question
- Submit sends all answers at once

---

## Configuration API

Allow developers to customize:

```typescript
window.debugWidget = {
  enabled: true,
  mcpUrl: 'http://localhost:3000',
  position: 'bottom-right',
  theme: 'auto',
  hideScreenshot: false,
  keyboardShortcut: 'Cmd+Shift+D'
}
```

---

## Testing Requirements

- Unit tests for capture functions
- Component tests for UI
- E2E tests with Playwright (test in real browser)
- Bundle size monitoring (<100KB gzipped)

---

## Build & Distribution

### NPM Package

```json
{
  "name": "@yourco/debug-widget",
  "main": "dist/index.js",
  "module": "dist/index.esm.js",
  "types": "dist/index.d.ts"
}
```

### CDN Build

```html
<script src="https://unpkg.com/@yourco/debug-widget"></script>
<!-- Auto-initializes -->
```

---

## What NOT to Do

- Don't use React (use Preact for size)
- Don't add heavy dependencies
- Don't modify host page DOM outside Shadow DOM
- Don't store data in widget (send to MCP server)
- Don't add features outside spec without discussion

---

## Build Commands

```bash
# Install dependencies
npm install

# Development (with hot reload)
npm run dev

# Build for production
npm run build

# Test
npm test

# E2E tests
npm run test:e2e

# Bundle size analysis
npm run analyze

# Publish to npm
npm publish
```

---

## Demo Page

Include demo page for testing:

```html
<!-- demo/index.html -->
<!DOCTYPE html>
<html>
<head>
  <script src="../dist/debug-widget.js"></script>
</head>
<body>
  <h1>Debug Widget Demo</h1>
  <button onclick="console.log('Test')">Log</button>
  <button onclick="console.error('Error!')">Error</button>
</body>
</html>
```

---

## Bug Fixes and Problem Solving

### Use SpecKit for Significant Fixes

For non-trivial bug fixes that require design changes or architectural updates:

1. Create a feature spec with `/speckit.specify "Fix: [description]"`
2. Plan the fix with `/speckit.plan`
3. Implement following SpecKit workflow

For simple one-line fixes, SpecKit is not required.

### Knowledge Base System

This project has a **continuously growing knowledge base** at `src/lib/knowledgebase/` that stores solutions to problems discovered during development.

#### CRITICAL: Always Search KB First

**BEFORE attempting to fix any error**, check the knowledge base:

1. Read `src/lib/knowledgebase/entries.ts`
2. Search for the error message or related keywords
3. If a solution exists, apply it directly
4. If no solution exists, solve the problem and ADD it to the KB

#### When to Search the KB

Search the KB first when encountering:
- Build errors or deployment failures
- TypeScript/Vite compilation errors
- Preact rendering errors
- WebSocket connection errors
- Shadow DOM or CSS encapsulation issues
- Browser compatibility issues
- html2canvas screenshot errors
- Bundle size optimization issues
- Any error message you've seen before

#### How to Add New Solutions

After solving any non-trivial problem:

1. Add a new entry to `src/lib/knowledgebase/entries.ts`
2. Follow this format:

```typescript
{
  id: '{category}-{number}',  // e.g., 'preact-001'
  category: 'preact' | 'vite' | 'typescript' | 'websocket' | 'browser' | 'css' | 'screenshot' | 'general',
  title: 'Short descriptive title',
  problem: 'Detailed description of when this occurs',
  errorMessages: ['exact error messages that trigger this'],
  solution: 'Step-by-step solution',
  codeExample: `// Working code example`,
  relatedFiles: ['src/path/to/file.ts'],
  tags: ['searchable', 'keywords'],
  dateAdded: 'YYYY-MM-DD',
}
```

#### Session Logging

All chat sessions are logged to `logs/session_YYYY-MM-DD-{topic}.md` with:
- Issues encountered and their solutions
- Code changes made
- Decisions and rationale
- Links to related files and KB entries

---

## Recent Changes

- 2025-11-26: Initial project setup with SpecKit specifications
- 2025-11-26: Added knowledge base system and SpecKit fix workflow
