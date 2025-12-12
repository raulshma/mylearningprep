'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronRight,
  FileJson,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Copy,
  Check,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// Types
export interface ResponseData {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: unknown;
  time?: number;
}

export interface ResponseInspectorProps {
  /** Response data to display */
  response?: ResponseData | null;
  /** Whether to show the headers section expanded by default */
  headersExpanded?: boolean;
  /** Whether to show the body section expanded by default */
  bodyExpanded?: boolean;
  /** Maximum height for the body section */
  maxBodyHeight?: number;
}

// Status code categories
function getStatusCategory(status: number): {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
} {
  if (status >= 100 && status < 200) {
    return {
      label: 'Informational',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
    };
  }
  if (status >= 200 && status < 300) {
    return {
      label: 'Success',
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/30',
    };
  }
  if (status >= 300 && status < 400) {
    return {
      label: 'Redirection',
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/30',
    };
  }
  if (status >= 400 && status < 500) {
    return {
      label: 'Client Error',
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/30',
    };
  }
  if (status >= 500) {
    return {
      label: 'Server Error',
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/30',
    };
  }
  return {
    label: 'Unknown',
    color: 'text-zinc-500',
    bgColor: 'bg-zinc-500/10',
    borderColor: 'border-zinc-500/30',
  };
}

// Format body for display with syntax highlighting
function formatBody(body: unknown): { formatted: string; type: 'json' | 'text' | 'html' } {
  if (body === null || body === undefined) {
    return { formatted: '', type: 'text' };
  }

  if (typeof body === 'string') {
    // Check if it's HTML
    if (body.trim().startsWith('<')) {
      return { formatted: body, type: 'html' };
    }
    // Try to parse as JSON
    try {
      const parsed = JSON.parse(body);
      return { formatted: JSON.stringify(parsed, null, 2), type: 'json' };
    } catch {
      return { formatted: body, type: 'text' };
    }
  }

  // Object or array - format as JSON
  try {
    return { formatted: JSON.stringify(body, null, 2), type: 'json' };
  } catch {
    return { formatted: String(body), type: 'text' };
  }
}


/**
 * ResponseInspector Component
 * Display HTTP response with status, headers, and body with syntax highlighting
 * Requirements: 3.7
 */
export function ResponseInspector({
  response,
  headersExpanded = false,
  bodyExpanded = true,
  maxBodyHeight = 400,
}: ResponseInspectorProps) {
  const [showHeaders, setShowHeaders] = useState(headersExpanded);
  const [showBody, setShowBody] = useState(bodyExpanded);
  const [copiedBody, setCopiedBody] = useState(false);
  const [copiedHeaders, setCopiedHeaders] = useState(false);

  const statusInfo = useMemo(
    () => (response ? getStatusCategory(response.status) : null),
    [response]
  );

  const bodyInfo = useMemo(
    () => (response ? formatBody(response.body) : null),
    [response]
  );

  const headerCount = useMemo(
    () => (response ? Object.keys(response.headers).length : 0),
    [response]
  );

  // Copy body to clipboard
  const handleCopyBody = async () => {
    if (!bodyInfo) return;
    await navigator.clipboard.writeText(bodyInfo.formatted);
    setCopiedBody(true);
    setTimeout(() => setCopiedBody(false), 2000);
  };

  // Copy headers to clipboard
  const handleCopyHeaders = async () => {
    if (!response) return;
    const headersText = Object.entries(response.headers)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
    await navigator.clipboard.writeText(headersText);
    setCopiedHeaders(true);
    setTimeout(() => setCopiedHeaders(false), 2000);
  };

  if (!response) {
    return (
      <Card className="w-full max-w-3xl mx-auto my-8 overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-secondary/30">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Response Inspector</h3>
          </div>
        </div>
        <div className="p-12 text-center text-muted-foreground">
          <Eye className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-sm">No response to display</p>
          <p className="text-xs mt-1">Send a request to see the response here</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-3xl mx-auto my-8 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-secondary/30">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Response Inspector</h3>
          </div>
          {response.time !== undefined && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>{response.time.toFixed(0)}ms</span>
            </div>
          )}
        </div>
      </div>

      {/* Status Section */}
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Status Code */}
          <div
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg border',
              statusInfo?.bgColor,
              statusInfo?.borderColor
            )}
          >
            {response.status >= 200 && response.status < 300 ? (
              <CheckCircle className={cn('w-5 h-5', statusInfo?.color)} />
            ) : (
              <AlertCircle className={cn('w-5 h-5', statusInfo?.color)} />
            )}
            <span className={cn('font-mono text-lg font-bold', statusInfo?.color)}>
              {response.status}
            </span>
            <span className={cn('font-medium', statusInfo?.color)}>
              {response.statusText}
            </span>
          </div>

          {/* Status Category Badge */}
          <span
            className={cn(
              'text-xs px-2 py-1 rounded-full',
              statusInfo?.bgColor,
              statusInfo?.color
            )}
          >
            {statusInfo?.label}
          </span>
        </div>
      </div>

      {/* Headers Section */}
      <div className="border-b border-border">
        <button
          onClick={() => setShowHeaders(!showHeaders)}
          className="w-full px-6 py-3 flex items-center justify-between hover:bg-secondary/20 transition-colors"
        >
          <div className="flex items-center gap-2">
            {showHeaders ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
            <span className="font-medium text-sm">Headers</span>
            <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
              {headerCount}
            </span>
          </div>
          {showHeaders && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleCopyHeaders();
              }}
              className="h-7 gap-1 text-xs"
            >
              {copiedHeaders ? (
                <Check className="w-3 h-3 text-green-500" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
              {copiedHeaders ? 'Copied!' : 'Copy'}
            </Button>
          )}
        </button>

        <AnimatePresence>
          {showHeaders && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-6 pb-4">
                <div className="bg-zinc-900/50 rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <tbody>
                      {Object.entries(response.headers).map(([key, value], index) => (
                        <tr
                          key={key}
                          className={cn(
                            'border-b border-border/50 last:border-0',
                            index % 2 === 0 ? 'bg-transparent' : 'bg-zinc-900/30'
                          )}
                        >
                          <td className="px-4 py-2 font-mono text-purple-400 whitespace-nowrap">
                            {key}
                          </td>
                          <td className="px-4 py-2 font-mono text-zinc-300 break-all">
                            {value}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Body Section */}
      <div>
        <button
          onClick={() => setShowBody(!showBody)}
          className="w-full px-6 py-3 flex items-center justify-between hover:bg-secondary/20 transition-colors"
        >
          <div className="flex items-center gap-2">
            {showBody ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
            <span className="font-medium text-sm">Body</span>
            {bodyInfo && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                {bodyInfo.type === 'json' ? (
                  <FileJson className="w-3 h-3" />
                ) : (
                  <FileText className="w-3 h-3" />
                )}
                {bodyInfo.type.toUpperCase()}
              </span>
            )}
          </div>
          {showBody && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleCopyBody();
              }}
              className="h-7 gap-1 text-xs"
            >
              {copiedBody ? (
                <Check className="w-3 h-3 text-green-500" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
              {copiedBody ? 'Copied!' : 'Copy'}
            </Button>
          )}
        </button>

        <AnimatePresence>
          {showBody && bodyInfo && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-6 pb-4">
                <div
                  className="bg-zinc-900 rounded-lg border border-border overflow-auto"
                  style={{ maxHeight: maxBodyHeight }}
                >
                  <SyntaxHighlightedBody content={bodyInfo.formatted} type={bodyInfo.type} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Tips */}
      <div className="px-6 py-3 border-t border-border bg-secondary/20 text-xs text-muted-foreground">
        💡 Click on Headers or Body sections to expand/collapse. Use the Copy button to copy content.
      </div>
    </Card>
  );
}


/**
 * Simple syntax highlighting for JSON/text content
 */
function SyntaxHighlightedBody({
  content,
  type,
}: {
  content: string;
  type: 'json' | 'text' | 'html';
}) {
  if (type === 'json') {
    // Simple JSON syntax highlighting
    const highlighted = content
      .replace(/"([^"]+)":/g, '<span class="text-purple-400">"$1"</span>:')
      .replace(/: "([^"]*)"/g, ': <span class="text-green-400">"$1"</span>')
      .replace(/: (\d+)/g, ': <span class="text-blue-400">$1</span>')
      .replace(/: (true|false)/g, ': <span class="text-yellow-400">$1</span>')
      .replace(/: (null)/g, ': <span class="text-red-400">$1</span>');

    return (
      <pre
        className="p-4 text-sm font-mono text-zinc-300 whitespace-pre-wrap"
        dangerouslySetInnerHTML={{ __html: highlighted }}
      />
    );
  }

  if (type === 'html') {
    // Simple HTML syntax highlighting
    const highlighted = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/&lt;(\/?[\w-]+)/g, '&lt;<span class="text-blue-400">$1</span>')
      .replace(/([\w-]+)=/g, '<span class="text-purple-400">$1</span>=')
      .replace(/"([^"]*)"/g, '<span class="text-green-400">"$1"</span>');

    return (
      <pre
        className="p-4 text-sm font-mono text-zinc-300 whitespace-pre-wrap"
        dangerouslySetInnerHTML={{ __html: highlighted }}
      />
    );
  }

  return (
    <pre className="p-4 text-sm font-mono text-zinc-300 whitespace-pre-wrap">
      {content}
    </pre>
  );
}

// Export for testing
export { getStatusCategory, formatBody };
export default ResponseInspector;
