/**
 * Configuration management
 */

import type { DebugWidgetConfig } from '../types';

const DEFAULT_CONFIG: DebugWidgetConfig = {
  enabled: process.env.NODE_ENV !== 'production',
  mcpUrl: 'http://localhost:4000',
  projectPath: '',
  position: 'bottom-right',
  theme: 'auto',
  hideScreenshot: false,
  keyboardShortcut: 'Cmd+Shift+D',
  maxLogEntries: 1000,
  maxFileSize: 10 * 1024 * 1024, // 10MB
};

/**
 * Load configuration from window.debugWidget or defaults
 */
export function loadConfig(): DebugWidgetConfig {
  const userConfig = window.debugWidget || {};

  return {
    ...DEFAULT_CONFIG,
    ...userConfig,
  };
}

export { DEFAULT_CONFIG };
