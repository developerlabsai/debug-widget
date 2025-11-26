/**
 * API client for MCP server communication
 */

import type { SubmitDebugReportRequest, SubmitAnswersRequest } from '../types';

export class APIClient {
  constructor(private baseUrl: string) {}

  /**
   * Submit debug report to MCP server
   * Returns sessionId if mode is 'wait', backlogItemId if mode is 'backlog'
   */
  async submitDebugReport(data: SubmitDebugReportRequest): Promise<{ reportId: string; timestamp: number; sessionId?: string; backlogItemId?: string }> {
    const response = await fetch(`${this.baseUrl}/api/debug`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to submit debug report: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Submit answers to Q&A session
   */
  async submitAnswers(data: SubmitAnswersRequest): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/questions/answer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to submit answers: ${response.statusText}`);
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}
