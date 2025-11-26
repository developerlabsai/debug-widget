/**
 * Screenshot capture using html-to-image
 */

import { toPng } from 'html-to-image';

/**
 * Capture screenshot of current page
 */
export async function captureScreenshot(): Promise<string> {
  const dataUrl = await toPng(document.body, {
    quality: 0.8,
    pixelRatio: 0.5, // Reduce size for faster capture
    skipFonts: true, // Skip font embedding for speed
    filter: (node: Node) => {
      // Skip the debug widget itself from the screenshot
      if (node instanceof HTMLElement) {
        return !node.classList.contains('debug-widget-container');
      }
      return true;
    },
  });

  return dataUrl;
}
