# Feature Specification: Interactive Debug Widget

**Feature Branch**: `001-interactive-debug-widget`
**Created**: 2025-11-26
**Status**: Draft
**Input**: Build an embeddable browser widget for capturing debug data and interactive Q&A with Claude Code

## User Scenarios & Testing

### User Story 1 - Embed Widget in Any Web Application (Priority: P1)

A developer wants to add debugging capabilities to their web application with minimal setup (single import or script tag).

**Why this priority**: Ease of adoption is critical. If installation is complex, developers won't use it. This delivers the MVP - a working widget that can be embedded.

**Independent Test**: Can be fully tested by adding the widget to a test HTML page via script tag or npm import and verifying it appears. Delivers value by providing the foundation for all other features.

**Acceptance Scenarios**:

1. **Given** developer adds `<script src="https://cdn.../debug-widget.js"></script>`, **When** page loads, **Then** floating debug button appears in bottom-right corner
2. **Given** developer installs via `npm install @yourco/debug-widget`, **When** they import it, **Then** widget initializes automatically
3. **Given** widget is embedded, **When** page loads, **Then** widget does not interfere with existing page styles or scripts
4. **Given** developer sets `debugWidget.enabled = false`, **When** configuration is applied, **Then** widget is hidden
5. **Given** environment is production, **When** widget detects `NODE_ENV=production`, **Then** widget does not load (unless explicitly enabled)

---

### User Story 2 - Capture and Send Debug Data (Priority: P1)

A developer encounters an error and wants to capture console logs, error stack, screenshot, and comments, then send to Claude Code with one click.

**Why this priority**: This is the core functionality - replacing the manual process of copying logs, taking screenshots, and organizing data. Essential for MVP.

**Independent Test**: Can be fully tested by triggering an error, opening widget, adding comment, and clicking "Send to Claude". Debug data appears in MCP server. Delivers immediate time savings.

**Acceptance Scenarios**:

1. **Given** widget is open, **When** user clicks "Send to Claude", **Then** current console logs are captured
2. **Given** JavaScript error occurred, **When** user sends report, **Then** error stack trace is included
3. **Given** user adds comment in text field, **When** user sends report, **Then** comment is included in payload
4. **Given** user clicks "Capture Screenshot", **When** screenshot is taken, **Then** preview appears in widget
5. **Given** debug data is ready, **When** user clicks "Send", **Then** data is POSTed to `http://localhost:3000/api/debug`
6. **Given** send is successful, **When** server responds, **Then** user sees confirmation message
7. **Given** send fails (server not running), **When** error occurs, **Then** user sees helpful error message

---

### User Story 3 - Auto-Capture Console Logs (Priority: P1)

A developer wants the widget to automatically capture all console logs (info, warn, error) without manual intervention.

**Why this priority**: Manual log capture would miss important context. Auto-capture ensures comprehensive debug data and is expected behavior for debugging tools.

**Independent Test**: Can be fully tested by running console.log/warn/error commands, opening widget, and verifying logs appear. Delivers value by ensuring no debug info is lost.

**Acceptance Scenarios**:

1. **Given** widget is loaded, **When** `console.log("message")` is called, **Then** message is captured with timestamp
2. **Given** widget captures logs, **When** `console.error("error")` is called, **Then** error is captured with "error" level
3. **Given** widget captures logs, **When** `console.warn("warning")` is called, **Then** warning is captured with "warn" level
4. **Given** logs exceed buffer limit (e.g., 1000 lines), **When** new logs arrive, **Then** oldest logs are discarded (FIFO)
5. **Given** user clears console in DevTools, **When** widget is checked, **Then** widget still has captured logs (independent buffer)

---

### User Story 4 - Interactive Q&A Interface (Priority: P2)

Claude Code needs more context and sends questions to the browser. User sees a modal with questions, answers them one at a time, reviews, and submits.

**Why this priority**: Significantly enhances the debugging workflow but requires MCP server Q&A feature first. Not essential for basic functionality but high value-add.

**Independent Test**: Can be fully tested by MCP server sending questions via WebSocket, user answering through stepper UI, and submitting. Delivers value by streamlining clarifications.

**Acceptance Scenarios**:

1. **Given** MCP server sends questions via WebSocket, **When** widget receives them, **Then** Q&A modal appears overlaying the page
2. **Given** Q&A modal is open, **When** displayed, **Then** shows "Question 1 of N" with progress indicator
3. **Given** question type is "text", **When** displayed, **Then** user sees text input field
4. **Given** question type is "multipleChoice", **When** displayed, **Then** user sees radio buttons with options
5. **Given** question type is "boolean", **When** displayed, **Then** user sees Yes/No buttons
6. **Given** user enters answer, **When** user clicks "Next", **Then** next question appears
7. **Given** user is on question 2+, **When** user clicks "Back", **Then** previous question appears with saved answer
8. **Given** user answered all questions, **When** final question is complete, **Then** review screen appears showing all answers
9. **Given** review screen is displayed, **When** user clicks answer edit icon, **Then** user navigates back to that question
10. **Given** user reviewed answers, **When** user clicks "Submit", **Then** answers are POSTed to `http://localhost:3000/api/questions/answer`
11. **Given** answers are submitted, **When** server confirms, **Then** Q&A modal closes and shows success message

---

### User Story 5 - File Upload Support (Priority: P3)

A developer wants to attach additional files (logs, config files, network traces) to the debug report.

**Why this priority**: Nice to have but not critical. Most debug scenarios are covered by console logs and screenshots. Can be added later.

**Independent Test**: Can be fully tested by dragging file into widget and verifying it's included in debug report. Delivers value for complex debugging scenarios.

**Acceptance Scenarios**:

1. **Given** widget is open, **When** user drags file into upload area, **Then** file is added to report
2. **Given** file is added, **When** user sends report, **Then** file is base64-encoded and included in payload
3. **Given** multiple files are added, **When** user sends report, **Then** all files are included
4. **Given** file size exceeds limit (e.g., 10MB), **When** user tries to add it, **Then** user sees error message

---

### User Story 6 - Customizable Widget Appearance (Priority: P3)

A developer wants to configure widget position, colors, or hide certain features to match their app's design.

**Why this priority**: Useful for production debugging or custom workflows but not essential for internal tools. Can be deferred.

**Independent Test**: Can be fully tested by setting configuration options and verifying widget appearance changes. Delivers value for specialized use cases.

**Acceptance Scenarios**:

1. **Given** developer sets `position: 'bottom-left'`, **When** widget loads, **Then** button appears in bottom-left corner
2. **Given** developer sets `theme: 'dark'`, **When** widget opens, **Then** dark theme is applied
3. **Given** developer sets `hideScreenshot: true`, **When** widget opens, **Then** screenshot feature is hidden

---

### Edge Cases

- What happens when localhost:3000 (MCP server) is not running?
- How does widget handle very long console logs (>100,000 lines)?
- What happens when user closes browser tab during Q&A flow?
- How does widget handle screenshot capture on mobile devices?
- What happens when WebSocket connection to MCP server disconnects mid-session?
- How does widget handle multiple error events firing simultaneously?
- What happens when user has ad blockers or strict CSP policies?

## Requirements

### Functional Requirements

- **FR-001**: Widget MUST be embeddable via CDN script tag (no build step required)
- **FR-002**: Widget MUST be installable via npm and importable as ES module
- **FR-003**: Widget MUST display floating button in configurable corner (default: bottom-right)
- **FR-004**: Widget MUST automatically intercept and capture all console.log, console.warn, console.error calls
- **FR-005**: Widget MUST capture JavaScript error events (window.onerror, unhandledrejection)
- **FR-006**: Widget MUST store captured logs in memory buffer with configurable limit (default: 1000 entries)
- **FR-007**: Widget MUST provide UI to add user comments/annotations
- **FR-008**: Widget MUST capture page screenshot using html2canvas or similar library
- **FR-009**: Widget MUST send debug data to MCP server via HTTP POST to configurable endpoint (default: http://localhost:3000/api/debug)
- **FR-010**: Widget MUST establish WebSocket connection to MCP server for receiving questions
- **FR-011**: Widget MUST display Q&A modal when questions are received via WebSocket
- **FR-012**: Widget MUST support stepper UI for navigating questions (Next/Back buttons)
- **FR-013**: Widget MUST support question types: text (input field), multipleChoice (radio buttons), boolean (Yes/No)
- **FR-014**: Widget MUST allow editing previous answers via Back button
- **FR-015**: Widget MUST display review screen showing all answers before submission
- **FR-016**: Widget MUST send answers to MCP server via HTTP POST to `/api/questions/answer`
- **FR-017**: Widget MUST show loading states during send/screenshot operations
- **FR-018**: Widget MUST show success/error messages after operations
- **FR-019**: Widget MUST not interfere with host page styles (scoped CSS or shadow DOM)
- **FR-020**: Widget MUST not load in production environment unless explicitly enabled
- **FR-021**: Widget MUST gracefully handle MCP server being offline (show user-friendly error)
- **FR-022**: Widget MUST support file uploads via drag-and-drop or file picker
- **FR-023**: Widget MUST validate file sizes before upload (configurable limit, default: 10MB)

### Key Entities

- **Debug Report**: Captured data including console logs array, error stack trace, screenshot (base64), user comment, timestamp, page URL
- **Console Log Entry**: Individual log with message, level (info/warn/error), timestamp, stack trace (if error)
- **Question Session**: Active Q&A with questions array, current question index, answers map, session ID
- **Question**: Individual question with ID, text, type (text/multipleChoice/boolean), options array (for multipleChoice), required flag
- **Answer**: User response with question ID, answer value, timestamp

## Success Criteria

### Measurable Outcomes

- **SC-001**: Developers can embed widget in under 2 minutes (add script tag or npm install + import)
- **SC-002**: Widget captures 100% of console logs without missing any
- **SC-003**: Screenshot capture completes in under 3 seconds for typical web pages
- **SC-004**: Widget bundle size is under 100KB (gzipped) for fast loading
- **SC-005**: Q&A flow from question received to answer submitted takes under 2 minutes
- **SC-006**: Widget works in Chrome, Firefox, Safari, Edge (latest versions)
- **SC-007**: Widget initialization time is under 500ms (no noticeable page slowdown)
- **SC-008**: Widget has no visual conflicts with host page in 95% of websites

## Assumptions

- Widget is used in development/staging environments (localhost or internal domains)
- Modern browsers with ES6, WebSocket, and Canvas support
- MCP server runs on localhost:3000 (or configurable port)
- Developers have permission to modify their web application code to add widget
- Screenshot library (html2canvas) can access page DOM (same-origin policy)
- Users are developers familiar with browser DevTools
- Network connection to localhost is reliable

## Out of Scope

- Mobile app debugging (React Native, iOS, Android)
- Node.js/backend debugging (server-side errors)
- Real-time collaboration (multiple users debugging same session)
- Historical debug report browsing (widget only captures current session)
- Advanced profiling (memory, CPU, network waterfall)
- Integration with error tracking services (Sentry, Rollbar)
- Custom question types beyond text/multipleChoice/boolean
- Internationalization (English only initially)
