/**
 * Knowledge Base Entries
 *
 * This file contains solutions to common problems encountered during development.
 * ALWAYS search this file before attempting to fix an error.
 * ALWAYS add new solutions when you solve a non-trivial problem.
 */

export type KnowledgeBaseCategory =
  | 'preact'
  | 'vite'
  | 'typescript'
  | 'websocket'
  | 'browser'
  | 'css'
  | 'screenshot'
  | 'general';

export interface KnowledgeBaseEntry {
  id: string;
  category: KnowledgeBaseCategory;
  title: string;
  problem: string;
  errorMessages: string[];
  solution: string;
  codeExample?: string;
  relatedFiles: string[];
  tags: string[];
  dateAdded: string;
}

export const knowledgeBaseEntries: KnowledgeBaseEntry[] = [
  {
    id: 'preact-001',
    category: 'preact',
    title: 'Preact Setup and Vite Configuration',
    problem: 'Setting up Preact with Vite and ensuring proper JSX transformation',
    errorMessages: [
      'React is not defined',
      'Cannot find module \'preact\'',
      'JSX element type does not have any construct'
    ],
    solution: `
1. Install Preact and Vite plugin: npm install preact @preact/preset-vite
2. Configure vite.config.ts to use Preact preset
3. Update tsconfig.json to use Preact JSX factory
4. Import from 'preact' not 'react'
    `,
    codeExample: `
// vite.config.ts
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig({
  plugins: [preact()],
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'DebugWidget',
      fileName: 'debug-widget'
    }
  }
});

// tsconfig.json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "preact"
  }
}

// Component file
import { h } from 'preact';
export function Widget() {
  return <div>Hello</div>;
}
    `,
    relatedFiles: ['vite.config.ts', 'tsconfig.json', 'src/widget/Widget.tsx'],
    tags: ['preact', 'vite', 'setup', 'jsx'],
    dateAdded: '2025-11-26',
  },

  {
    id: 'css-001',
    category: 'css',
    title: 'Shadow DOM CSS Encapsulation',
    problem: 'Styles from host page bleeding into widget or vice versa',
    errorMessages: [
      'Style conflicts with host page',
      'CSS not applying in Shadow DOM'
    ],
    solution: `
1. Attach Shadow DOM to container element
2. Render Preact app inside Shadow DOM
3. Inject styles into Shadow DOM (not document head)
4. Use :host selector for widget root styles
    `,
    codeExample: `
// src/index.ts
const container = document.createElement('div');
container.id = 'debug-widget-root';
document.body.appendChild(container);

const shadow = container.attachShadow({ mode: 'open' });

// Inject styles into Shadow DOM
const style = document.createElement('style');
style.textContent = \`
  :host {
    all: initial;
    position: fixed;
    z-index: 999999;
  }
  /* Your widget styles */
\`;
shadow.appendChild(style);

// Render into Shadow DOM
const root = document.createElement('div');
shadow.appendChild(root);
render(<Widget />, root);
    `,
    relatedFiles: ['src/index.ts', 'src/widget/Widget.tsx'],
    tags: ['shadow-dom', 'css', 'encapsulation', 'styles'],
    dateAdded: '2025-11-26',
  },

  // Add more entries as problems are solved
];

/**
 * Search knowledge base by error message
 */
export function searchByError(errorMessage: string): KnowledgeBaseEntry[] {
  return knowledgeBaseEntries.filter(entry =>
    entry.errorMessages.some(msg =>
      errorMessage.toLowerCase().includes(msg.toLowerCase())
    )
  );
}

/**
 * Search knowledge base by tag
 */
export function searchByTag(tag: string): KnowledgeBaseEntry[] {
  return knowledgeBaseEntries.filter(entry =>
    entry.tags.some(t => t.toLowerCase().includes(tag.toLowerCase()))
  );
}

/**
 * Search knowledge base by category
 */
export function searchByCategory(category: KnowledgeBaseCategory): KnowledgeBaseEntry[] {
  return knowledgeBaseEntries.filter(entry => entry.category === category);
}
