/**
 * Error event capture
 */

import type { ErrorInfo } from '../types';

export class ErrorCapture {
  private capturedError: ErrorInfo | null = null;

  /**
   * Start capturing error events
   */
  start(): void {
    window.addEventListener('error', this.handleError);
    window.addEventListener('unhandledrejection', this.handleRejection);
  }

  /**
   * Stop capturing
   */
  stop(): void {
    window.removeEventListener('error', this.handleError);
    window.removeEventListener('unhandledrejection', this.handleRejection);
  }

  /**
   * Handle error event
   */
  private handleError = (event: ErrorEvent): void => {
    this.capturedError = {
      message: event.message,
      stack: event.error?.stack || '',
      fileName: event.filename,
      lineNumber: event.lineno,
      columnNumber: event.colno,
    };
  };

  /**
   * Handle unhandled rejection
   */
  private handleRejection = (event: PromiseRejectionEvent): void => {
    const reason = event.reason;

    this.capturedError = {
      message: `Unhandled Promise Rejection: ${reason?.message || reason}`,
      stack: reason?.stack || '',
    };
  };

  /**
   * Get captured error
   */
  getError(): ErrorInfo | null {
    return this.capturedError;
  }

  /**
   * Clear captured error
   */
  clear(): void {
    this.capturedError = null;
  }
}
