/**
 * WebSocket client for receiving questions from MCP server
 */

import type { QuestionsMessage, Question } from '../types';

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private onQuestionsCallback: ((sessionId: string, questions: Question[]) => void) | null = null;

  constructor(private url: string) {}

  /**
   * Connect to WebSocket server
   */
  connect(): void {
    try {
      const wsUrl = this.url.replace(/^http/, 'ws');
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[DebugWidget] WebSocket connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('[DebugWidget] Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('[DebugWidget] WebSocket disconnected');
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('[DebugWidget] WebSocket error:', error);
      };
    } catch (error) {
      console.error('[DebugWidget] Failed to connect WebSocket:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Schedule reconnection
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      return;
    }

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, 5000); // Retry after 5 seconds
  }

  /**
   * Handle incoming message
   */
  private handleMessage(message: any): void {
    if (message.type === 'questions') {
      const questionsMsg = message as QuestionsMessage;
      if (this.onQuestionsCallback) {
        this.onQuestionsCallback(questionsMsg.data.sessionId, questionsMsg.data.questions);
      }
    }
  }

  /**
   * Set callback for questions
   */
  onQuestions(callback: (sessionId: string, questions: Question[]) => void): void {
    this.onQuestionsCallback = callback;
  }
}
