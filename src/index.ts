/**
 * Debug Widget - Entry Point
 * Auto-initializes when loaded
 */

import { h, render } from 'preact';
import { Widget } from './widget/Widget';
import { loadConfig } from './config';

// Initialize widget
function init() {
  const config = loadConfig();

  // Check if widget should be enabled
  if (!config.enabled) {
    console.log('[DebugWidget] Disabled (production mode or config.enabled=false)');
    return;
  }

  // Create container
  const container = document.createElement('div');
  container.id = 'debug-widget-root';
  document.body.appendChild(container);

  // Use Shadow DOM for style encapsulation
  const shadow = container.attachShadow({ mode: 'open' });

  // Render widget
  const root = document.createElement('div');
  shadow.appendChild(root);
  render(h(Widget, { config }), root);

  console.log('[DebugWidget] Initialized');
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Export for programmatic use
export { Widget } from './widget/Widget';
export { loadConfig } from './config';
export type * from './types';
