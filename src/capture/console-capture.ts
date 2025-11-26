/**
 * Console log capture
 */

import type { LogEntry } from '../types';

export class ConsoleCapture {
  private logs: LogEntry[] = [];
  private maxEntries: number;
  private originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
  };

  constructor(maxEntries = 1000) {
    this.maxEntries = maxEntries;
  }

  /**
   * Start capturing console logs
   */
  start(): void {
    console.log = (...args: unknown[]) => {
      this.captureLog('log', args);
      this.originalConsole.log.apply(console, args);
    };

    console.warn = (...args: unknown[]) => {
      this.captureLog('warn', args);
      this.originalConsole.warn.apply(console, args);
    };

    console.error = (...args: unknown[]) => {
      this.captureLog('error', args);
      this.originalConsole.error.apply(console, args);
    };
  }

  /**
   * Stop capturing (restore original console)
   */
  stop(): void {
    console.log = this.originalConsole.log;
    console.warn = this.originalConsole.warn;
    console.error = this.originalConsole.error;
  }

  /**
   * Capture a log entry
   */
  private captureLog(level: 'log' | 'warn' | 'error', args: unknown[]): void {
    const message = args.map(arg => {
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    }).join(' ');

    const entry: LogEntry = {
      level,
      message,
      timestamp: Date.now(),
    };

    // Add stack trace for errors
    if (level === 'error' && args[0] instanceof Error) {
      entry.stack = args[0].stack;
    }

    this.logs.push(entry);

    // Keep only last N entries (FIFO)
    if (this.logs.length > this.maxEntries) {
      this.logs.shift();
    }
  }

  /**
   * Get all captured logs
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * Clear all logs
   */
  clear(): void {
    this.logs = [];
  }
}
