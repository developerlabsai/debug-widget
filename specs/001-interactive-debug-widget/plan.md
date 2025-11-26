# Implementation Plan: Interactive Debug Widget

**Branch**: `001-interactive-debug-widget` | **Date**: 2025-11-26 | **Spec**: [spec.md](./spec.md)

## Summary

Build an embeddable browser widget (Preact-based) that automatically captures console logs and errors, allows users to take screenshots and add comments, then sends all debug data to the MCP server. The widget also displays an interactive Q&A modal when Claude Code needs clarification, with stepper navigation and answer review.

**Primary Goals:**
- Zero-config embedding (script tag or npm import)
- Auto-capture console logs and errors
- One-click screenshot + comment + send to Claude
- Interactive Q&A modal with stepper UI
- Lightweight bundle (<100KB gzipped)

## Technical Context

**Language/Version**: TypeScript 5.x, ES2022
**Primary Dependencies**:
- preact (3KB React alternative)
- html2canvas (screenshot capture)
- Vite (build tool)

**Build Target**: Browser (ES2020+, modern browsers)
**Testing**: Vitest (unit tests) + demo page
**Bundle Goal**: <100KB gzipped
**Distribution**: npm + CDN (unpkg)

**Constraints**:
- No page interference (Shadow DOM)
- Localhost MCP server only
- Development tool only (disable in production)
- Auto-initialization

**Scale/Scope**: ~2000 LOC estimated

## Project Structure

```
debug-widget/
├── src/
│   ├── index.ts              # Entry point (auto-init)
│   ├── widget/               # Main widget
│   │   ├── Widget.tsx        # Root component
│   │   ├── FloatingButton.tsx
│   │   └── DebugPanel.tsx
│   ├── qa/                   # Q&A modal
│   │   ├── QAModal.tsx
│   │   ├── QuestionStep.tsx
│   │   └── ReviewStep.tsx
│   ├── capture/              # Auto-capture
│   │   ├── console-capture.ts
│   │   ├── error-capture.ts
│   │   └── screenshot.ts
│   ├── api/                  # MCP communication
│   │   ├── client.ts
│   │   └── websocket.ts
│   ├── types/
│   │   └── index.ts
│   └── config/
│       └── index.ts
├── demo/
│   └── index.html            # Test page
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## Implementation Phases

### Phase 1: Project Setup & Console Capture (P1)

**Tasks**:
1. Initialize Vite + Preact + TypeScript
2. Configure build for UMD + ES modules
3. Implement console.log/warn/error interception
4. Implement error event capture (window.onerror)
5. Store logs in memory buffer (max 1000 entries)

**Deliverable**: Console capture works, logs stored in memory

---

### Phase 2: Widget UI Core (P1)

**Tasks**:
1. Create FloatingButton component (bottom-right)
2. Create DebugPanel component (slide-in panel)
3. Display captured logs in panel
4. Add comment textarea
5. Implement Shadow DOM encapsulation
6. Add basic styles (Tailwind-like inline)

**Deliverable**: Clickable widget showing logs and comment field

---

### Phase 3: Screenshot & Send (P1)

**Tasks**:
1. Integrate html2canvas (lazy load)
2. Implement screenshot capture button
3. Show screenshot preview in panel
4. Implement "Send to Claude" button
5. POST debug data to MCP server
6. Show success/error feedback

**Deliverable**: Full capture-and-send workflow works

---

### Phase 4: WebSocket & Q&A Modal (P2)

**Tasks**:
1. Establish WebSocket connection to MCP server
2. Listen for incoming questions
3. Create QAModal component (overlay)
4. Implement QuestionStep component (stepper UI)
5. Support text, multipleChoice, boolean question types
6. Implement ReviewStep (show all answers)
7. POST answers back to MCP server

**Deliverable**: Interactive Q&A flow from Claude works

---

### Phase 5: Polish & Distribution (P3)

**Tasks**:
1. Add configuration API (window.debugWidget)
2. Optimize bundle size
3. Add keyboard shortcut (Cmd+Shift+D)
4. Create demo page
5. Build UMD + ES bundles
6. Test in multiple browsers

**Deliverable**: Production-ready widget, published to npm

---

## Component Architecture

### Widget Hierarchy

```
<Widget> (Shadow DOM root)
  ├─ <FloatingButton onClick={toggle} />
  └─ <DebugPanel isOpen={open}>
       ├─ <LogsList logs={capturedLogs} />
       ├─ <CommentInput />
       ├─ <ScreenshotPreview />
       └─ <SendButton onClick={sendReport} />

<QAModal isOpen={hasQuestions}>
  ├─ <Stepper currentStep={step} />
  ├─ <QuestionStep question={current} onNext={...} onBack={...} />
  └─ <ReviewStep answers={all} onSubmit={...} />
```

### State Management

Use Preact hooks (no external state library):

```typescript
// Widget state
const [isOpen, setIsOpen] = useState(false);
const [logs, setLogs] = useState<LogEntry[]>([]);
const [comment, setComment] = useState('');
const [screenshot, setScreenshot] = useState<string | null>(null);

// Q&A state
const [questions, setQuestions] = useState<Question[]>([]);
const [answers, setAnswers] = useState<Answer[]>([]);
const [currentStep, setCurrentStep] = useState(0);
```

## API Integration

### HTTP Endpoints

**POST /api/debug** (submit report):
```typescript
fetch('http://localhost:3000/api/debug', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    logs: capturedLogs,
    error: capturedError,
    screenshot: screenshotBase64,
    comment: userComment,
    url: window.location.href,
    timestamp: Date.now(),
  }),
});
```

**POST /api/questions/answer** (submit answers):
```typescript
fetch('http://localhost:3000/api/questions/answer', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionId,
    answers: allAnswers,
  }),
});
```

### WebSocket

```typescript
const ws = new WebSocket('ws://localhost:3000');

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.type === 'questions') {
    setQuestions(msg.data.questions);
    setSessionId(msg.data.sessionId);
    // Open Q&A modal
  }
};
```

## Console Capture Implementation

```typescript
// Intercept console methods
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

console.log = (...args) => {
  captureLog('log', args);
  originalLog.apply(console, args);
};

console.warn = (...args) => {
  captureLog('warn', args);
  originalWarn.apply(console, args);
};

console.error = (...args) => {
  captureLog('error', args);
  originalError.apply(console, args);
};

// Capture unhandled errors
window.addEventListener('error', (event) => {
  captureError({
    message: event.message,
    stack: event.error?.stack,
    fileName: event.filename,
    lineNumber: event.lineno,
    columnNumber: event.colno,
  });
});

window.addEventListener('unhandledrejection', (event) => {
  captureError({
    message: `Unhandled Promise Rejection: ${event.reason}`,
    stack: event.reason?.stack,
  });
});
```

## Shadow DOM Encapsulation

```typescript
const container = document.createElement('div');
container.id = 'debug-widget-root';
document.body.appendChild(container);

const shadow = container.attachShadow({ mode: 'open' });

// Inject styles
const style = document.createElement('style');
style.textContent = widgetStyles;
shadow.appendChild(style);

// Render Preact app
const root = document.createElement('div');
shadow.appendChild(root);
render(<Widget />, root);
```

## Configuration API

```typescript
interface DebugWidgetConfig {
  enabled?: boolean;
  mcpUrl?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  theme?: 'light' | 'dark' | 'auto';
  hideScreenshot?: boolean;
  keyboardShortcut?: string;
  maxLogEntries?: number;
}

// User can configure before loading
window.debugWidget = {
  enabled: true,
  mcpUrl: 'http://localhost:3000',
  position: 'bottom-right',
};
```

## Build Configuration

### Vite Config

```typescript
export default defineConfig({
  plugins: [preact()],
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'DebugWidget',
      formats: ['es', 'umd'],
      fileName: (format) => `debug-widget.${format}.js`,
    },
    rollupOptions: {
      external: [],  // Bundle everything
      output: {
        globals: {},
      },
    },
  },
});
```

## Dependencies

```json
{
  "dependencies": {
    "preact": "^10.19.0",
    "html2canvas": "^1.4.1"
  },
  "devDependencies": {
    "@preact/preset-vite": "^2.8.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "vitest": "^1.0.0"
  }
}
```

## Success Criteria

From spec.md:

- ✅ **SC-001**: Developers can embed widget in under 2 minutes
- ✅ **SC-002**: Widget captures 100% of console logs
- ✅ **SC-003**: Screenshot capture completes in under 3 seconds
- ✅ **SC-004**: Widget bundle size is under 100KB (gzipped)
- ✅ **SC-005**: Q&A flow completes in under 2 minutes
- ✅ **SC-006**: Works in Chrome, Firefox, Safari, Edge
- ✅ **SC-007**: Widget initialization time is under 500ms
- ✅ **SC-008**: No visual conflicts with host page in 95% of websites

## Next Steps

1. Initialize Vite + Preact project
2. Implement console capture
3. Build widget UI
4. Integrate with MCP server
5. Test end-to-end workflow
