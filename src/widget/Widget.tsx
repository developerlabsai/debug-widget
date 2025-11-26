/**
 * Main Widget Component
 * Refactored with CSS animations and cleaner organization
 */

import { useState, useEffect, useRef } from 'preact/hooks';
import type { Question, DebugWidgetConfig } from '../types';
import { ConsoleCapture } from '../capture/console-capture';
import { ErrorCapture } from '../capture/error-capture';
import { captureScreenshot } from '../capture/screenshot';
import { APIClient } from '../api/client';
import { WebSocketClient } from '../api/websocket';
import faviconDark from '../../icons/favicon.png';
import faviconLight from '../../icons/favicon-light.png';

// ============================================================================
// Types
// ============================================================================

interface WidgetProps {
  config: DebugWidgetConfig;
}

type DebugMode = 'wait' | 'backlog';
type ThemeMode = 'light' | 'dark' | 'auto';

interface StoredSettings {
  projectPath: string;
  debugMode: DebugMode;
  theme: ThemeMode;
}

interface DebugSession {
  id: string;
  timestamp: number;
  comment: string;
  status: 'pending' | 'answered' | 'timeout';
  reportId?: string;
  sessionId?: string;
}

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = 'debug-widget-settings';
const SESSION_STORAGE_KEY = 'debug-widget-sessions';

// ============================================================================
// Colors - Design System (Neutral Gray-Based)
// ============================================================================

// Light theme colors
const lightColors = {
  // Core palette
  primary: '#3b82f6',        // blue-500
  primaryHover: '#2563eb',
  primaryLight: '#eff6ff',   // blue-50
  primaryDark: '#1d4ed8',
  accent: '#10b981',         // emerald-500
  accentGreen: '#10b981',
  secondary: '#555555',
  secondaryHover: '#333333',
  success: '#10b981',
  warning: '#f59e0b',
  warningBg: '#fef3c7',
  warningText: '#92400e',
  error: '#ef4444',
  // Semantic colors (neutral gray-based)
  background: '#ffffff',
  backgroundSecondary: '#f5f5f5',
  backgroundTertiary: '#e5e5e5',
  text: '#111111',
  textSecondary: '#555555',
  textMuted: '#777777',
  textPlaceholder: '#999999',
  border: '#e0e0e0',
  borderLight: '#f0f0f0',
  inputBg: '#ffffff',
  cardBg: '#ffffff',
  overlay: 'rgba(0, 0, 0, 0.6)',
  shadow: 'rgba(0, 0, 0, 0.1)',
  shadowHeavy: 'rgba(0, 0, 0, 0.2)',
  // Legacy aliases
  white: '#ffffff',
  gray50: '#fafafa',
  gray100: '#f5f5f5',
  gray200: '#e5e5e5',
  gray300: '#d4d4d4',
  gray400: '#a3a3a3',
  gray500: '#737373',
  gray700: '#404040',
  gray900: '#171717',
  // Favicon
  favicon: faviconLight,
};

// Dark theme colors (Neutral Gray-Based)
const darkColors = {
  // Core palette
  primary: '#60a5fa',        // blue-400
  primaryHover: '#3b82f6',
  primaryLight: '#1e3a5f',
  primaryDark: '#93c5fd',
  accent: '#34d399',         // emerald-400
  accentGreen: '#34d399',
  secondary: '#a1a1a1',
  secondaryHover: '#d1d1d1',
  success: '#34d399',
  warning: '#fbbf24',
  warningBg: '#422006',
  warningText: '#fcd34d',
  error: '#f87171',
  // Semantic colors (neutral gray-based)
  background: '#121212',
  backgroundSecondary: '#1e1e1e',
  backgroundTertiary: '#2a2a2a',
  text: '#ffffff',
  textSecondary: '#d1d1d1',
  textMuted: '#a1a1a1',
  textPlaceholder: '#6e6e6e',
  border: '#2a2a2a',
  borderLight: '#3a3a3a',
  inputBg: '#1e1e1e',
  cardBg: '#1e1e1e',
  overlay: 'rgba(0, 0, 0, 0.8)',
  shadow: 'rgba(0, 0, 0, 0.4)',
  shadowHeavy: 'rgba(0, 0, 0, 0.6)',
  // Legacy aliases
  white: '#ffffff',
  gray50: '#2a2a2a',
  gray100: '#1e1e1e',
  gray200: '#3a3a3a',
  gray300: '#444444',
  gray400: '#6e6e6e',
  gray500: '#a1a1a1',
  gray700: '#d1d1d1',
  gray900: '#ffffff',
  // Favicon
  favicon: faviconDark,
};

type ThemeColors = typeof lightColors;

function getThemeColors(isDark: boolean): ThemeColors {
  return isDark ? darkColors : lightColors;
}

// ============================================================================
// CSS Variables Generator
// ============================================================================

function generateCSSVariables(isDark: boolean): string {
  if (isDark) {
    return `
      :host {
        --color-bg: #121212;
        --color-surface: #1e1e1e;
        --color-text-primary: #ffffff;
        --color-text-secondary: #d1d1d1;
        --color-border: #2a2a2a;
        --color-primary: #60a5fa;
        --color-primary-hover: #3b82f6;
        --color-accent: #34d399;
      }
    `;
  }
  return `
    :host {
      --color-bg: #ffffff;
      --color-surface: #f5f5f5;
      --color-text-primary: #111111;
      --color-text-secondary: #555555;
      --color-border: #e0e0e0;
      --color-primary: #3b82f6;
      --color-primary-hover: #2563eb;
      --color-accent: #10b981;
    }
  `;
}

// ============================================================================
// CSS Animations (injected into Shadow DOM)
// ============================================================================

const animationStyles = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes fadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(16px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes scaleIn {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes pulse {
    0%, 100% {
      box-shadow: 0 4px 6px rgba(99, 102, 241, 0.2);
    }
    50% {
      box-shadow: 0 4px 20px rgba(99, 102, 241, 0.5);
    }
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
  .animate-slide-up { animation: slideUp 0.3s ease-out forwards; }
  .animate-scale-in { animation: scaleIn 0.2s ease-out forwards; }
  .animate-pulse { animation: pulse 2s ease-in-out infinite; }
  .animate-spin { animation: spin 1s linear infinite; }

  /* Transitions */
  .transition-all {
    transition: all 0.2s ease;
  }

  .transition-colors {
    transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
  }

  .transition-transform {
    transition: transform 0.2s ease;
  }

  .hover-scale:hover {
    transform: scale(1.05);
  }

  .hover-lift:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  }
`;

// ============================================================================
// Storage Helpers
// ============================================================================

function loadStoredSettings(): StoredSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { projectPath: '', debugMode: 'wait', theme: 'auto', ...parsed };
    }
  } catch {
    // Ignore parse errors
  }
  return { projectPath: '', debugMode: 'wait', theme: 'auto' };
}

function useSystemTheme(): boolean {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return isDark;
}

function saveStoredSettings(settings: StoredSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage errors
  }
}

function loadSessions(): DebugSession[] {
  try {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }
  return [];
}

function saveSessions(sessions: DebugSession[]): void {
  try {
    const trimmed = sessions.slice(-50);
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // Ignore storage errors
  }
}

// ============================================================================
// Sub-Components
// ============================================================================

interface FloatingButtonProps {
  isOpen: boolean;
  onClick: () => void;
  isWaiting?: boolean;
  theme: ThemeColors;
}

function FloatingButton({ isOpen, onClick, isWaiting, theme }: FloatingButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`transition-all hover-lift ${isWaiting ? 'animate-pulse' : ''}`}
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        width: '56px',
        height: '56px',
        borderRadius: '50%',
        backgroundColor: isWaiting ? theme.warning : '#2D2D2D',
        color: theme.white,
        border: 'none',
        cursor: 'pointer',
        boxShadow: `0 4px 12px ${theme.shadow}`,
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
        overflow: 'hidden',
        padding: 0,
      }}
    >
      <img
        src={theme.favicon}
        alt="Debug"
        style={{
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          objectFit: 'cover',
          transition: 'transform 0.3s ease',
        }}
      />
    </button>
  );
}

interface SessionItemProps {
  session: DebugSession;
  theme: ThemeColors;
}

function SessionItem({ session, theme }: SessionItemProps) {
  const statusColor = {
    answered: theme.success,
    timeout: theme.error,
    pending: theme.warning,
  }[session.status];

  return (
    <div
      className="transition-colors"
      style={{
        padding: '8px 10px',
        marginBottom: '6px',
        backgroundColor: theme.cardBg,
        borderRadius: '6px',
        borderLeft: `3px solid ${statusColor}`,
        cursor: 'default',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 600, fontSize: '11px', color: theme.textSecondary }}>
          {new Date(session.timestamp).toLocaleTimeString()}
        </span>
        <span
          style={{
            fontSize: '10px',
            padding: '2px 6px',
            borderRadius: '9999px',
            backgroundColor: `${statusColor}20`,
            color: statusColor,
            fontWeight: 500,
          }}
        >
          {session.status}
        </span>
      </div>
      <div style={{ color: theme.text, fontSize: '12px', marginTop: '4px' }}>
        {session.comment.slice(0, 50)}{session.comment.length > 50 ? '...' : ''}
      </div>
    </div>
  );
}

interface ModalProps {
  children: preact.ComponentChildren;
  onClose?: () => void;
  theme: ThemeColors;
}

function Modal({ children, onClose, theme }: ModalProps) {
  return (
    <div
      className="animate-fade-in"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: theme.overlay,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999999,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) {
          onClose();
        }
      }}
    >
      <div
        className="animate-scale-in"
        style={{
          backgroundColor: theme.cardBg,
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '500px',
          width: '90%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: `0 20px 40px ${theme.shadowHeavy}`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ============================================================================
// Main Widget Component
// ============================================================================

export function Widget({ config }: WidgetProps) {
  // Inject animation styles on mount
  const styleInjected = useRef(false);

  useEffect(() => {
    if (!styleInjected.current) {
      const style = document.createElement('style');
      style.textContent = animationStyles;
      // Find the shadow root and inject styles
      const shadowHost = document.getElementById('debug-widget-root');
      if (shadowHost?.shadowRoot) {
        shadowHost.shadowRoot.appendChild(style);
      }
      styleInjected.current = true;
    }
  }, []);

  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [comment, setComment] = useState('');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState('');

  const storedSettings = loadStoredSettings();
  const [projectPath, setProjectPath] = useState(config.projectPath || storedSettings.projectPath || '');
  const [debugMode, setDebugMode] = useState<DebugMode>(storedSettings.debugMode || 'wait');
  const [themeMode, setThemeMode] = useState<ThemeMode>(storedSettings.theme || 'auto');
  const systemIsDark = useSystemTheme();
  const isDark = themeMode === 'auto' ? systemIsDark : themeMode === 'dark';
  const theme = getThemeColors(isDark);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [sessions, setSessions] = useState<DebugSession[]>(loadSessions());

  const [questions, setQuestions] = useState<Question[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState(0);

  const consoleCapture = new ConsoleCapture(config.maxLogEntries);
  const errorCapture = new ErrorCapture();
  const apiClient = new APIClient(config.mcpUrl);
  const wsClient = new WebSocketClient(config.mcpUrl);

  useEffect(() => {
    consoleCapture.start();
    errorCapture.start();
    wsClient.connect();

    wsClient.onQuestions((sid, qs) => {
      console.log('Received questions from server:', qs.length);
      setSessionId(sid);
      setQuestions(qs);
      setAnswers({});
      setCurrentStep(0);
      setIsWaitingForResponse(false);
      setStatus('Questions received');
    });

    return () => {
      consoleCapture.stop();
      errorCapture.stop();
      wsClient.disconnect();
    };
  }, []);

  const handleCaptureScreenshot = async () => {
    setIsCapturing(true);
    try {
      const ss = await captureScreenshot();
      setScreenshot(ss);
      setStatus('Screenshot captured');
    } catch (error) {
      console.error('Screenshot error:', error);
      setStatus('Screenshot failed');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleSend = async () => {
    setIsSending(true);
    setStatus('Sending...');

    try {
      const currentLogs = consoleCapture.getLogs();
      const error = errorCapture.getError();
      const timestamp = Date.now();

      const response = await apiClient.submitDebugReport({
        logs: currentLogs,
        error: error || undefined,
        screenshot: screenshot || undefined,
        comment,
        url: window.location.href,
        projectPath: projectPath || undefined,
        timestamp,
        userAgent: navigator.userAgent,
        mode: debugMode,
        priority: 'medium', // Default priority, can be made configurable
      });

      const newSession: DebugSession = {
        id: `session-${timestamp}`,
        timestamp,
        comment: comment || 'No comment',
        status: 'pending',
        reportId: response?.reportId,
        sessionId: response?.sessionId,
      };
      const updatedSessions = [...sessions, newSession];
      setSessions(updatedSessions);
      saveSessions(updatedSessions);

      setComment('');
      setScreenshot(null);

      if (debugMode === 'wait') {
        setIsWaitingForResponse(true);
        setStatus('Waiting for response...');
      } else {
        setStatus('Added to backlog');
      }
    } catch (error) {
      console.error('Send error:', error);
      setStatus(`Error: ${error}`);
      setIsWaitingForResponse(false);
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmitAnswers = async () => {
    if (!sessionId) return;

    try {
      await apiClient.submitAnswers({
        sessionId,
        answers: Object.entries(answers).map(([questionId, answer]) => ({
          questionId,
          answer,
        })),
      });

      const updatedSessions = sessions.map(s =>
        s.sessionId === sessionId ? { ...s, status: 'answered' as const } : s
      );
      setSessions(updatedSessions);
      saveSessions(updatedSessions);

      setQuestions([]);
      setSessionId(null);
      setIsWaitingForResponse(false);
      setStatus('Answers submitted');
    } catch (error) {
      setStatus('Failed to submit answers');
    }
  };

  if (!config.enabled) {
    return null;
  }

  return (
    <div style={{ all: 'initial', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Inject styles with CSS variables */}
      <style>{generateCSSVariables(isDark) + animationStyles}</style>

      {/* Floating Button */}
      <FloatingButton
        isOpen={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        isWaiting={isWaitingForResponse}
        theme={theme}
      />

      {/* Debug Panel */}
      {isOpen && (
        <div
          className="animate-slide-up"
          style={{
            position: 'fixed',
            bottom: '90px',
            right: '20px',
            width: '380px',
            maxHeight: '70vh',
            backgroundColor: theme.background,
            borderRadius: '16px',
            boxShadow: `0 20px 40px ${theme.shadowHeavy}`,
            zIndex: 999999,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px 20px',
              borderBottom: `1px solid ${theme.border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: theme.backgroundSecondary,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img src={theme.favicon} alt="" style={{ width: '24px', height: '24px' }} />
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: theme.text }}>
                Debug Widget
              </h3>
            </div>
            <button
              onClick={() => setShowSettings(true)}
              className="transition-colors"
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: `1px solid ${theme.border}`,
                backgroundColor: theme.cardBg,
                color: theme.text,
                cursor: 'pointer',
                fontSize: '14px',
              }}
              title="Settings"
            >
              Settings
            </button>
          </div>

          {/* Content */}
          <div style={{ padding: '16px 20px', overflow: 'auto', flex: 1 }}>
            {/* Warning: No project path */}
            {!projectPath && (
              <div
                style={{
                  padding: '10px 14px',
                  marginBottom: '16px',
                  backgroundColor: theme.warningBg,
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: theme.warningText,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span>No project path configured.</span>
                <button
                  onClick={() => setShowSettings(true)}
                  style={{
                    color: theme.primary,
                    textDecoration: 'underline',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    fontWeight: 500,
                  }}
                >
                  Set up now
                </button>
              </div>
            )}

            {/* Session History */}
            <div style={{ marginBottom: '16px' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '8px',
                  fontWeight: 600,
                  fontSize: '13px',
                  color: theme.textSecondary,
                }}
              >
                <span>Recent Sessions</span>
                <span
                  style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    backgroundColor: theme.backgroundTertiary,
                    color: theme.textMuted,
                  }}
                >
                  {sessions.length}
                </span>
              </label>
              <div
                style={{
                  maxHeight: '140px',
                  overflow: 'auto',
                  backgroundColor: theme.backgroundTertiary,
                  padding: '8px',
                  borderRadius: '8px',
                }}
              >
                {sessions.length === 0 ? (
                  <div
                    style={{
                      color: theme.textPlaceholder,
                      fontStyle: 'italic',
                      fontSize: '12px',
                      textAlign: 'center',
                      padding: '16px',
                    }}
                  >
                    No debug requests sent yet
                  </div>
                ) : (
                  sessions.slice(-5).reverse().map((session) => (
                    <SessionItem key={session.id} session={session} theme={theme} />
                  ))
                )}
              </div>
            </div>

            {/* Comment Input - Expandable */}
            <div style={{ marginBottom: '16px' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: 600,
                  fontSize: '13px',
                  color: theme.textSecondary,
                }}
              >
                What's the issue?
              </label>
              <button
                onClick={() => setShowTextInput(true)}
                className="transition-all"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: '10px',
                  border: `2px dashed ${comment ? theme.primary : theme.border}`,
                  backgroundColor: comment ? theme.primaryLight : theme.backgroundSecondary,
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <span
                  style={{
                    color: comment ? theme.text : theme.textPlaceholder,
                    fontSize: '14px',
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {comment || 'Tap to describe the issue...'}
                </span>
                <span
                  style={{
                    backgroundColor: theme.primary,
                    color: '#FFFFFF',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  {comment ? 'Edit' : 'Expand'}
                </span>
              </button>
            </div>

            {/* Screenshot Button */}
            {!config.hideScreenshot && (
              <div style={{ marginBottom: '16px' }}>
                <button
                  onClick={handleCaptureScreenshot}
                  disabled={isCapturing}
                  className="transition-colors"
                  style={{
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: screenshot ? theme.success : theme.secondary,
                    color: '#FFFFFF',
                    cursor: isCapturing ? 'wait' : 'pointer',
                    fontSize: '13px',
                    fontWeight: 500,
                    opacity: isCapturing ? 0.7 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  {isCapturing ? (
                    <>
                      <span className="animate-spin" style={{ display: 'inline-block' }}>⟳</span>
                      Capturing...
                    </>
                  ) : screenshot ? (
                    '✓ Screenshot ready'
                  ) : (
                    'Capture Screenshot'
                  )}
                </button>
              </div>
            )}

            {/* Status */}
            {status && (
              <div
                className="animate-fade-in"
                style={{
                  marginBottom: '16px',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  backgroundColor: theme.backgroundTertiary,
                  fontSize: '13px',
                  color: theme.textSecondary,
                }}
              >
                {status}
              </div>
            )}
          </div>

          {/* Footer - Send Button */}
          <div
            style={{
              padding: '16px 20px',
              borderTop: `1px solid ${theme.border}`,
              backgroundColor: theme.backgroundSecondary,
            }}
          >
            <button
              onClick={handleSend}
              disabled={isSending || isWaitingForResponse}
              className="transition-all"
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: isWaitingForResponse ? theme.warning : theme.primary,
                color: '#FFFFFF',
                fontWeight: 600,
                cursor: isSending || isWaitingForResponse ? 'not-allowed' : 'pointer',
                fontSize: '15px',
                opacity: isSending ? 0.7 : 1,
              }}
            >
              {isSending ? (
                'Sending...'
              ) : isWaitingForResponse ? (
                'Waiting for response...'
              ) : debugMode === 'wait' ? (
                'Send to Claude'
              ) : (
                'Add to Backlog'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Q&A Modal */}
      {questions.length > 0 && (
        <Modal theme={theme}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: theme.primaryLight,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img src={theme.favicon} alt="" style={{ width: '24px', height: '24px' }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: theme.text }}>
                Claude has questions
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: theme.textMuted }}>
                Question {currentStep + 1} of {questions.length}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div
            style={{
              height: '4px',
              backgroundColor: theme.border,
              borderRadius: '2px',
              marginBottom: '24px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${((currentStep + 1) / questions.length) * 100}%`,
                backgroundColor: theme.primary,
                borderRadius: '2px',
                transition: 'width 0.3s ease',
              }}
            />
          </div>

          {currentStep < questions.length && (
            <div>
              <p
                style={{
                  fontWeight: 500,
                  marginBottom: '16px',
                  fontSize: '15px',
                  color: theme.text,
                  lineHeight: 1.5,
                }}
              >
                {questions[currentStep].text}
              </p>

              {questions[currentStep].type === 'text' && (
                <input
                  type="text"
                  value={answers[questions[currentStep].id] || ''}
                  onInput={(e) =>
                    setAnswers({ ...answers, [questions[currentStep].id]: (e.target as HTMLInputElement).value })
                  }
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: `1px solid ${theme.border}`,
                    backgroundColor: theme.inputBg,
                    color: theme.text,
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  placeholder="Type your answer..."
                />
              )}

              {questions[currentStep].type === 'multipleChoice' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {questions[currentStep].options?.map((option) => (
                    <label
                      key={option}
                      className="transition-colors"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px',
                        borderRadius: '8px',
                        border: `1px solid ${answers[questions[currentStep].id] === option ? theme.primary : theme.border}`,
                        backgroundColor: answers[questions[currentStep].id] === option ? theme.primaryLight : theme.cardBg,
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="radio"
                        name={questions[currentStep].id}
                        value={option}
                        checked={answers[questions[currentStep].id] === option}
                        onChange={() => setAnswers({ ...answers, [questions[currentStep].id]: option })}
                        style={{ marginRight: '12px' }}
                      />
                      <span style={{ fontSize: '14px', color: theme.text }}>{option}</span>
                    </label>
                  ))}
                </div>
              )}

              <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                {currentStep > 0 && (
                  <button
                    onClick={() => setCurrentStep(currentStep - 1)}
                    className="transition-colors"
                    style={{
                      padding: '12px 20px',
                      borderRadius: '8px',
                      border: `1px solid ${theme.border}`,
                      backgroundColor: theme.cardBg,
                      color: theme.text,
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 500,
                    }}
                  >
                    Back
                  </button>
                )}

                {currentStep < questions.length - 1 ? (
                  <button
                    onClick={() => setCurrentStep(currentStep + 1)}
                    className="transition-colors"
                    style={{
                      padding: '12px 20px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: theme.primary,
                      color: '#FFFFFF',
                      cursor: 'pointer',
                      flex: 1,
                      fontSize: '14px',
                      fontWeight: 500,
                    }}
                  >
                    Next
                  </button>
                ) : (
                  <button
                    onClick={handleSubmitAnswers}
                    className="transition-colors"
                    style={{
                      padding: '12px 20px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: theme.success,
                      color: '#FFFFFF',
                      cursor: 'pointer',
                      flex: 1,
                      fontSize: '14px',
                      fontWeight: 500,
                    }}
                  >
                    Submit Answers
                  </button>
                )}
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <Modal onClose={() => setShowSettings(false)} theme={theme}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: theme.text }}>
              Settings
            </h3>
            <button
              onClick={() => setShowSettings(false)}
              style={{
                border: 'none',
                background: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                padding: '4px',
                color: theme.textPlaceholder,
              }}
            >
              ×
            </button>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: 600,
                fontSize: '13px',
                color: theme.textSecondary,
              }}
            >
              Project Path
            </label>
            <input
              type="text"
              value={projectPath}
              onInput={(e) => setProjectPath((e.target as HTMLInputElement).value)}
              placeholder="/Users/yourname/Projects/your-project"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: `1px solid ${theme.border}`,
                backgroundColor: theme.inputBg,
                color: theme.text,
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: theme.textMuted }}>
              Full filesystem path to your project for Claude Code access.
            </p>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '12px',
                fontWeight: 600,
                fontSize: '13px',
                color: theme.textSecondary,
              }}
            >
              Debug Mode
            </label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setDebugMode('wait')}
                className="transition-all"
                style={{
                  flex: 1,
                  padding: '16px',
                  borderRadius: '12px',
                  border: debugMode === 'wait' ? `2px solid ${theme.primary}` : `1px solid ${theme.border}`,
                  backgroundColor: debugMode === 'wait' ? theme.primaryLight : theme.cardBg,
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: '4px', color: theme.text }}>
                  Wait for Response
                </div>
                <div style={{ fontSize: '12px', color: theme.textMuted }}>Fix issues immediately</div>
              </button>
              <button
                onClick={() => setDebugMode('backlog')}
                className="transition-all"
                style={{
                  flex: 1,
                  padding: '16px',
                  borderRadius: '12px',
                  border: debugMode === 'backlog' ? `2px solid ${theme.primary}` : `1px solid ${theme.border}`,
                  backgroundColor: debugMode === 'backlog' ? theme.primaryLight : theme.cardBg,
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: '4px', color: theme.text }}>
                  Add to Backlog
                </div>
                <div style={{ fontSize: '12px', color: theme.textMuted }}>Queue for later review</div>
              </button>
            </div>
          </div>

          {/* Theme Selection */}
          <div style={{ marginBottom: '24px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '12px',
                fontWeight: 600,
                fontSize: '13px',
                color: theme.textSecondary,
              }}
            >
              Theme
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['light', 'dark', 'auto'] as ThemeMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setThemeMode(mode)}
                  className="transition-all"
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    border: themeMode === mode ? `2px solid ${theme.primary}` : `1px solid ${theme.border}`,
                    backgroundColor: themeMode === mode ? theme.primaryLight : theme.cardBg,
                    cursor: 'pointer',
                    textAlign: 'center',
                    fontWeight: 500,
                    fontSize: '13px',
                    color: themeMode === mode ? theme.primary : theme.textSecondary,
                    textTransform: 'capitalize',
                  }}
                >
                  {mode === 'auto' ? '🌓 Auto' : mode === 'dark' ? '🌙 Dark' : '☀️ Light'}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setShowSettings(false)}
              className="transition-colors"
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: `1px solid ${theme.border}`,
                backgroundColor: theme.cardBg,
                color: theme.text,
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => {
                saveStoredSettings({ projectPath, debugMode, theme: themeMode });
                setShowSettings(false);
                setStatus('Settings saved');
              }}
              className="transition-colors"
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: theme.primary,
                color: '#FFFFFF',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '14px',
              }}
            >
              Save Settings
            </button>
          </div>
        </Modal>
      )}

      {/* Fullscreen Text Input Modal */}
      {showTextInput && (
        <div
          className="animate-fade-in"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: theme.background,
            zIndex: 99999999,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px 20px',
              borderBottom: `1px solid ${theme.border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: theme.primary,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img src={theme.favicon} alt="" style={{ width: '28px', height: '28px' }} />
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#FFFFFF' }}>
                Describe the Issue
              </h3>
            </div>
            <button
              onClick={() => setShowTextInput(false)}
              style={{
                border: 'none',
                background: 'rgba(255,255,255,0.2)',
                fontSize: '14px',
                cursor: 'pointer',
                padding: '8px 16px',
                borderRadius: '8px',
                color: '#FFFFFF',
                fontWeight: 500,
              }}
            >
              Minimize
            </button>
          </div>

          {/* Textarea */}
          <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', backgroundColor: theme.background }}>
            <textarea
              value={comment}
              onInput={(e) => setComment((e.target as HTMLTextAreaElement).value)}
              placeholder="Describe in detail what went wrong, what you expected to happen, and any steps to reproduce the issue..."
              autoFocus
              style={{
                flex: 1,
                width: '100%',
                padding: '20px',
                borderRadius: '12px',
                border: `2px solid ${theme.border}`,
                backgroundColor: theme.inputBg,
                color: theme.text,
                fontSize: '16px',
                lineHeight: 1.6,
                resize: 'none',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
              onFocus={(e) => {
                (e.target as HTMLTextAreaElement).style.borderColor = theme.primary;
              }}
              onBlur={(e) => {
                (e.target as HTMLTextAreaElement).style.borderColor = theme.border;
              }}
            />
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '16px 20px',
              borderTop: `1px solid ${theme.border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: theme.backgroundSecondary,
            }}
          >
            <span style={{ fontSize: '13px', color: theme.textMuted }}>
              {comment.length} characters
            </span>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  setComment('');
                }}
                className="transition-colors"
                style={{
                  padding: '12px 20px',
                  borderRadius: '8px',
                  border: `1px solid ${theme.border}`,
                  backgroundColor: theme.cardBg,
                  color: theme.text,
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                }}
              >
                Clear
              </button>
              <button
                onClick={() => setShowTextInput(false)}
                className="transition-colors"
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: theme.primary,
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '14px',
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
