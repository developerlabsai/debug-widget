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
import faviconUrl from '../../icons/favicon.png';

// ============================================================================
// Types
// ============================================================================

interface WidgetProps {
  config: DebugWidgetConfig;
}

type DebugMode = 'wait' | 'backlog';

interface StoredSettings {
  projectPath: string;
  debugMode: DebugMode;
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
// Colors - Design System
// ============================================================================

const colors = {
  primary: '#4F46E5',
  primaryHover: '#4338CA',
  primaryLight: '#EEF2FF',
  secondary: '#6B7280',
  secondaryHover: '#4B5563',
  success: '#10B981',
  warning: '#F59E0B',
  warningBg: '#FEF3C7',
  warningText: '#92400E',
  error: '#EF4444',
  white: '#FFFFFF',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray700: '#374151',
  gray900: '#111827',
  overlay: 'rgba(0, 0, 0, 0.5)',
  shadow: 'rgba(0, 0, 0, 0.1)',
  shadowHeavy: 'rgba(0, 0, 0, 0.2)',
};

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
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    50% {
      box-shadow: 0 4px 20px rgba(79, 70, 229, 0.4);
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
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }
  return { projectPath: '', debugMode: 'wait' };
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
}

function FloatingButton({ isOpen, onClick, isWaiting }: FloatingButtonProps) {
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
        backgroundColor: isWaiting ? colors.warning : colors.primary,
        color: colors.white,
        border: 'none',
        cursor: 'pointer',
        boxShadow: `0 4px 12px ${colors.shadow}`,
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
      }}
    >
      <img
        src={faviconUrl}
        alt="Debug"
        style={{
          width: '32px',
          height: '32px',
          transition: 'transform 0.3s ease',
        }}
      />
    </button>
  );
}

interface SessionItemProps {
  session: DebugSession;
}

function SessionItem({ session }: SessionItemProps) {
  const statusColor = {
    answered: colors.success,
    timeout: colors.error,
    pending: colors.warning,
  }[session.status];

  return (
    <div
      className="transition-colors"
      style={{
        padding: '8px 10px',
        marginBottom: '6px',
        backgroundColor: colors.white,
        borderRadius: '6px',
        borderLeft: `3px solid ${statusColor}`,
        cursor: 'default',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 600, fontSize: '11px', color: colors.gray700 }}>
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
      <div style={{ color: colors.gray700, fontSize: '12px', marginTop: '4px' }}>
        {session.comment.slice(0, 50)}{session.comment.length > 50 ? '...' : ''}
      </div>
    </div>
  );
}

interface ModalProps {
  children: preact.ComponentChildren;
  onClose?: () => void;
}

function Modal({ children, onClose }: ModalProps) {
  return (
    <div
      className="animate-fade-in"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: colors.overlay,
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
          backgroundColor: colors.white,
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '500px',
          width: '90%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: `0 20px 40px ${colors.shadowHeavy}`,
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
  const [comment, setComment] = useState('');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState('');

  const storedSettings = loadStoredSettings();
  const [projectPath, setProjectPath] = useState(config.projectPath || storedSettings.projectPath || '');
  const [debugMode, setDebugMode] = useState<DebugMode>(storedSettings.debugMode || 'wait');
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
      {/* Inject styles */}
      <style>{animationStyles}</style>

      {/* Floating Button */}
      <FloatingButton
        isOpen={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        isWaiting={isWaitingForResponse}
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
            backgroundColor: colors.white,
            borderRadius: '16px',
            boxShadow: `0 20px 40px ${colors.shadowHeavy}`,
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
              borderBottom: `1px solid ${colors.gray200}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: colors.gray50,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img src={faviconUrl} alt="" style={{ width: '24px', height: '24px' }} />
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: colors.gray900 }}>
                Debug Widget
              </h3>
            </div>
            <button
              onClick={() => setShowSettings(true)}
              className="transition-colors"
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: `1px solid ${colors.gray300}`,
                backgroundColor: colors.white,
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
                  backgroundColor: colors.warningBg,
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: colors.warningText,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span>No project path configured.</span>
                <button
                  onClick={() => setShowSettings(true)}
                  style={{
                    color: colors.primary,
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
                  color: colors.gray700,
                }}
              >
                <span>Recent Sessions</span>
                <span
                  style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    backgroundColor: colors.gray100,
                    color: colors.gray500,
                  }}
                >
                  {sessions.length}
                </span>
              </label>
              <div
                style={{
                  maxHeight: '140px',
                  overflow: 'auto',
                  backgroundColor: colors.gray100,
                  padding: '8px',
                  borderRadius: '8px',
                }}
              >
                {sessions.length === 0 ? (
                  <div
                    style={{
                      color: colors.gray400,
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
                    <SessionItem key={session.id} session={session} />
                  ))
                )}
              </div>
            </div>

            {/* Comment Input */}
            <div style={{ marginBottom: '16px' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: 600,
                  fontSize: '13px',
                  color: colors.gray700,
                }}
              >
                What's the issue?
              </label>
              <textarea
                value={comment}
                onInput={(e) => setComment((e.target as HTMLTextAreaElement).value)}
                placeholder="Describe what went wrong..."
                style={{
                  width: '100%',
                  minHeight: '80px',
                  padding: '12px',
                  borderRadius: '8px',
                  border: `1px solid ${colors.gray300}`,
                  fontSize: '14px',
                  resize: 'none',
                  outline: 'none',
                  transition: 'border-color 0.2s ease',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => {
                  (e.target as HTMLTextAreaElement).style.borderColor = colors.primary;
                }}
                onBlur={(e) => {
                  (e.target as HTMLTextAreaElement).style.borderColor = colors.gray300;
                }}
              />
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
                    backgroundColor: screenshot ? colors.success : colors.secondary,
                    color: colors.white,
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
                  backgroundColor: colors.gray100,
                  fontSize: '13px',
                  color: colors.gray700,
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
              borderTop: `1px solid ${colors.gray200}`,
              backgroundColor: colors.gray50,
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
                backgroundColor: isWaitingForResponse ? colors.warning : colors.primary,
                color: colors.white,
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
        <Modal>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: colors.primaryLight,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img src={faviconUrl} alt="" style={{ width: '24px', height: '24px' }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: colors.gray900 }}>
                Claude has questions
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: colors.gray500 }}>
                Question {currentStep + 1} of {questions.length}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div
            style={{
              height: '4px',
              backgroundColor: colors.gray200,
              borderRadius: '2px',
              marginBottom: '24px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${((currentStep + 1) / questions.length) * 100}%`,
                backgroundColor: colors.primary,
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
                  color: colors.gray900,
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
                    border: `1px solid ${colors.gray300}`,
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
                        border: `1px solid ${answers[questions[currentStep].id] === option ? colors.primary : colors.gray300}`,
                        backgroundColor: answers[questions[currentStep].id] === option ? colors.primaryLight : colors.white,
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
                      <span style={{ fontSize: '14px', color: colors.gray700 }}>{option}</span>
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
                      border: `1px solid ${colors.gray300}`,
                      backgroundColor: colors.white,
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
                      backgroundColor: colors.primary,
                      color: colors.white,
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
                      backgroundColor: colors.success,
                      color: colors.white,
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
        <Modal onClose={() => setShowSettings(false)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: colors.gray900 }}>
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
                color: colors.gray400,
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
                color: colors.gray700,
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
                border: `1px solid ${colors.gray300}`,
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: colors.gray500 }}>
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
                color: colors.gray700,
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
                  border: debugMode === 'wait' ? `2px solid ${colors.primary}` : `1px solid ${colors.gray300}`,
                  backgroundColor: debugMode === 'wait' ? colors.primaryLight : colors.white,
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: '4px', color: colors.gray900 }}>
                  Wait for Response
                </div>
                <div style={{ fontSize: '12px', color: colors.gray500 }}>Fix issues immediately</div>
              </button>
              <button
                onClick={() => setDebugMode('backlog')}
                className="transition-all"
                style={{
                  flex: 1,
                  padding: '16px',
                  borderRadius: '12px',
                  border: debugMode === 'backlog' ? `2px solid ${colors.primary}` : `1px solid ${colors.gray300}`,
                  backgroundColor: debugMode === 'backlog' ? colors.primaryLight : colors.white,
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: '4px', color: colors.gray900 }}>
                  Add to Backlog
                </div>
                <div style={{ fontSize: '12px', color: colors.gray500 }}>Queue for later review</div>
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setShowSettings(false)}
              className="transition-colors"
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: `1px solid ${colors.gray300}`,
                backgroundColor: colors.white,
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => {
                saveStoredSettings({ projectPath, debugMode });
                setShowSettings(false);
                setStatus('Settings saved');
              }}
              className="transition-colors"
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: colors.primary,
                color: colors.white,
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
    </div>
  );
}
