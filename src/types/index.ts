/**
 * Type definitions for Debug Widget
 */

// Configuration
export interface DebugWidgetConfig {
  enabled: boolean;
  mcpUrl: string;
  projectPath: string;
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  theme: 'light' | 'dark' | 'auto';
  hideScreenshot: boolean;
  keyboardShortcut: string;
  maxLogEntries: number;
  maxFileSize: number;
}

// Log Entry
export interface LogEntry {
  level: 'log' | 'warn' | 'error';
  message: string;
  timestamp: number;
  stack?: string;
}

// Error Info
export interface ErrorInfo {
  message: string;
  stack: string;
  fileName?: string;
  lineNumber?: number;
  columnNumber?: number;
}

// Questions (from MCP server)
export type QuestionType = 'text' | 'multipleChoice' | 'boolean';

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  options?: string[];
  required: boolean;
}

export interface Answer {
  questionId: string;
  answer: string;
  timestamp: number;
}

// API Requests
export type DebugMode = 'wait' | 'backlog';
export type BacklogPriority = 'critical' | 'high' | 'medium' | 'low';

export interface SubmitDebugReportRequest {
  logs: LogEntry[];
  error?: ErrorInfo;
  screenshot?: string;
  comment: string;
  url: string;
  projectPath?: string;
  timestamp: number;
  userAgent?: string;
  mode?: DebugMode;
  priority?: BacklogPriority;
}

export interface SubmitAnswersRequest {
  sessionId: string;
  answers: Array<{
    questionId: string;
    answer: string;
  }>;
}

// WebSocket Messages
export interface QuestionsMessage {
  type: 'questions';
  data: {
    sessionId: string;
    questions: Question[];
  };
}

// Global interface
declare global {
  interface Window {
    debugWidget?: Partial<DebugWidgetConfig>;
  }
}
