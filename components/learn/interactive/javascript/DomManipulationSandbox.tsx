'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Editor from '@monaco-editor/react';
import {
  Play,
  RotateCcw,
  Code2,
  Eye,
  AlertCircle,
  CheckCircle,
  Loader2,
  SplitSquareHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface DomManipulationSandboxProps {
  /** Initial HTML content */
  initialHtml?: string;
  /** Initial JavaScript code */
  initialJs?: string;
  /** Whether to show the live preview */
  showPreview?: boolean;
  /** Callback when code changes */
  onCodeChange?: (html: string, js: string) => void;
}

const defaultHtml = `<div id="container">
  <h1 id="title">Hello World</h1>
  <p class="description">
    This is a paragraph.
  </p>
  <ul id="list">
    <li>Item 1</li>
    <li>Item 2</li>
    <li>Item 3</li>
  </ul>
  <button id="btn">Click Me</button>
</div>`;

const defaultJs = `// Try manipulating the DOM!
// The HTML on the left is your playground.

// Example 1: Change text content
const title = document.getElementById('title');
title.textContent = 'DOM Manipulation!';

// Example 2: Change styles
title.style.color = '#3b82f6';
title.style.fontSize = '2rem';

// Example 3: Add a new element
const newItem = document.createElement('li');
newItem.textContent = 'New Item';
newItem.style.color = '#22c55e';
document.getElementById('list').appendChild(newItem);

// Example 4: Add event listener
const btn = document.getElementById('btn');
btn.addEventListener('click', () => {
  alert('Button clicked!');
});

// Try your own DOM manipulation below!
`;

interface ExecutionStatus {
  success: boolean;
  message: string;
  error?: string;
}


/**
 * DomManipulationSandbox Component
 * Split view with HTML/JS editors and live preview for DOM manipulation practice
 * Requirements: 2.6
 */
export function DomManipulationSandbox({
  initialHtml = defaultHtml,
  initialJs = defaultJs,
  showPreview = true,
  onCodeChange,
}: DomManipulationSandboxProps) {
  const [html, setHtml] = useState(initialHtml);
  const [js, setJs] = useState(initialJs);
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState<ExecutionStatus | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Handle HTML change
  const handleHtmlChange = useCallback(
    (value: string | undefined) => {
      const newHtml = value || '';
      setHtml(newHtml);
      onCodeChange?.(newHtml, js);
    },
    [js, onCodeChange]
  );

  // Handle JS change
  const handleJsChange = useCallback(
    (value: string | undefined) => {
      const newJs = value || '';
      setJs(newJs);
      onCodeChange?.(html, newJs);
    },
    [html, onCodeChange]
  );

  // Execute the code in the preview iframe
  const handleRun = useCallback(() => {
    setIsRunning(true);
    setStatus(null);

    // Increment key to force iframe refresh
    setPreviewKey((prev) => prev + 1);

    // Small delay to allow iframe to load
    setTimeout(() => {
      try {
        const iframe = iframeRef.current;
        if (!iframe || !iframe.contentWindow) {
          throw new Error('Preview not available');
        }

        // Execute the JavaScript in the iframe context
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        
        // Create a script element and inject it
        const script = iframeDoc.createElement('script');
        script.textContent = `
          try {
            ${js}
            parent.postMessage({ type: 'success', message: 'Code executed successfully!' }, '*');
          } catch (error) {
            parent.postMessage({ type: 'error', message: error.message }, '*');
          }
        `;
        iframeDoc.body.appendChild(script);
      } catch (error) {
        setStatus({
          success: false,
          message: 'Execution failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        setIsRunning(false);
      }
    }, 100);
  }, [js]);

  // Listen for messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'success') {
        setStatus({ success: true, message: event.data.message });
        setIsRunning(false);
      } else if (event.data?.type === 'error') {
        setStatus({
          success: false,
          message: 'Execution error',
          error: event.data.message,
        });
        setIsRunning(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Reset to initial state
  const handleReset = useCallback(() => {
    setHtml(initialHtml);
    setJs(initialJs);
    setStatus(null);
    setPreviewKey((prev) => prev + 1);
    onCodeChange?.(initialHtml, initialJs);
  }, [initialHtml, initialJs, onCodeChange]);

  // Generate the preview HTML with embedded styles
  const previewHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * { box-sizing: border-box; }
        body {
          font-family: system-ui, -apple-system, sans-serif;
          padding: 16px;
          margin: 0;
          background: #18181b;
          color: #fafafa;
          font-size: 14px;
        }
        h1, h2, h3 { margin-top: 0; }
        button {
          background: #3b82f6;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
        }
        button:hover { background: #2563eb; }
        ul { padding-left: 20px; }
        li { margin: 4px 0; }
        p { line-height: 1.6; }
        #container {
          max-width: 100%;
        }
      </style>
    </head>
    <body>
      ${html}
    </body>
    </html>
  `;

  return (
    <Card className="w-full max-w-6xl mx-auto my-8 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-secondary/30">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <SplitSquareHorizontal className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">DOM Manipulation Sandbox</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleReset} className="gap-1">
              <RotateCcw className="w-3 h-3" />
              Reset
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleRun}
              disabled={isRunning}
              className="gap-1"
            >
              {isRunning ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Play className="w-3 h-3" />
              )}
              {isRunning ? 'Running...' : 'Run Code'}
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Write JavaScript to manipulate the HTML and see the results in real-time
        </p>
      </div>

      {/* Status Bar */}
      <AnimatePresence>
        {status && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={cn(
              'px-4 py-2 flex items-center gap-2 text-sm',
              status.success
                ? 'bg-green-500/10 text-green-500'
                : 'bg-red-500/10 text-red-500'
            )}
          >
            {status.success ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            <span>{status.message}</span>
            {status.error && (
              <span className="text-xs opacity-80">: {status.error}</span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-0">
        {/* HTML Editor */}
        <div className="border-r border-border">
          <div className="px-4 py-2 bg-zinc-900 border-b border-border flex items-center gap-2">
            <Code2 className="w-4 h-4 text-orange-500" />
            <span className="text-xs text-zinc-400 font-mono">index.html</span>
          </div>
          <div style={{ height: 350 }}>
            <Editor
              height="100%"
              language="html"
              value={html}
              onChange={handleHtmlChange}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                wordWrap: 'on',
                padding: { top: 12, bottom: 12 },
              }}
            />
          </div>
        </div>

        {/* JavaScript Editor */}
        <div className="border-r border-border">
          <div className="px-4 py-2 bg-zinc-900 border-b border-border flex items-center gap-2">
            <Code2 className="w-4 h-4 text-yellow-500" />
            <span className="text-xs text-zinc-400 font-mono">script.js</span>
          </div>
          <div style={{ height: 350 }}>
            <Editor
              height="100%"
              language="javascript"
              value={js}
              onChange={handleJsChange}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                wordWrap: 'on',
                padding: { top: 12, bottom: 12 },
              }}
            />
          </div>
        </div>

        {/* Live Preview */}
        {showPreview && (
          <div className="md:col-span-2 lg:col-span-1">
            <div className="px-4 py-2 bg-zinc-900 border-b border-border flex items-center gap-2">
              <Eye className="w-4 h-4 text-green-500" />
              <span className="text-xs text-zinc-400 font-mono">Preview</span>
            </div>
            <div style={{ height: 350 }} className="bg-zinc-900">
              <iframe
                key={previewKey}
                ref={iframeRef}
                srcDoc={previewHtml}
                title="DOM Preview"
                className="w-full h-full border-0"
                sandbox="allow-scripts"
              />
            </div>
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="px-6 py-3 border-t border-border bg-secondary/20 text-xs text-muted-foreground">
        💡 Edit the HTML on the left, write JavaScript in the middle, and click &quot;Run Code&quot; to see your DOM manipulations in action!
      </div>
    </Card>
  );
}

// Export for testing
export { defaultHtml, defaultJs };
export default DomManipulationSandbox;
