'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Editor from '@monaco-editor/react';
import {
  Send,
  RotateCcw,
  Copy,
  Check,
  Plus,
  Trash2,
  Globe,
  Code2,
  Loader2,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

// Types
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface Header {
  key: string;
  value: string;
  id: string;
}

export interface ApiResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: unknown;
  time: number;
}

export interface ApiRequestBuilderProps {
  /** Initial HTTP method */
  initialMethod?: HttpMethod;
  /** Initial URL */
  initialUrl?: string;
  /** Initial headers */
  initialHeaders?: Header[];
  /** Initial request body */
  initialBody?: string;
  /** Mock API endpoint base URL */
  mockApiBase?: string;
  /** Callback when request is sent */
  onRequest?: (response: ApiResponse) => void;
}

// Default mock API endpoints
const MOCK_ENDPOINTS = [
  { path: '/users', description: 'Get all users' },
  { path: '/users/1', description: 'Get user by ID' },
  { path: '/posts', description: 'Get all posts' },
  { path: '/posts/1', description: 'Get post by ID' },
  { path: '/comments', description: 'Get all comments' },
];

// Mock API base URL (JSONPlaceholder)
const DEFAULT_MOCK_API = 'https://jsonplaceholder.typicode.com';

const defaultHeaders: Header[] = [
  { key: 'Content-Type', value: 'application/json', id: 'header-1' },
];

const defaultBody = `{
  "title": "Hello World",
  "body": "This is a test post",
  "userId": 1
}`;

// Method colors
const methodColors: Record<HttpMethod, string> = {
  GET: 'bg-green-500/20 text-green-500 border-green-500/30',
  POST: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
  PUT: 'bg-orange-500/20 text-orange-500 border-orange-500/30',
  DELETE: 'bg-red-500/20 text-red-500 border-red-500/30',
  PATCH: 'bg-purple-500/20 text-purple-500 border-purple-500/30',
};


/**
 * Generate fetch code from request configuration
 * Requirements: 3.6
 */
export function generateFetchCode(
  method: HttpMethod,
  url: string,
  headers: Header[],
  body: string
): string {
  const hasBody = ['POST', 'PUT', 'PATCH'].includes(method) && body.trim();
  const hasHeaders = headers.filter((h) => h.key && h.value).length > 0;

  let code = `fetch('${url}'`;

  if (method !== 'GET' || hasHeaders || hasBody) {
    code += `, {\n`;
    code += `  method: '${method}'`;

    if (hasHeaders) {
      code += `,\n  headers: {\n`;
      headers
        .filter((h) => h.key && h.value)
        .forEach((h, i, arr) => {
          code += `    '${h.key}': '${h.value}'${i < arr.length - 1 ? ',' : ''}\n`;
        });
      code += `  }`;
    }

    if (hasBody) {
      code += `,\n  body: JSON.stringify(${body})`;
    }

    code += `\n}`;
  }

  code += `)\n`;
  code += `  .then(response => {\n`;
  code += `    if (!response.ok) {\n`;
  code += `      throw new Error(\`HTTP error! status: \${response.status}\`);\n`;
  code += `    }\n`;
  code += `    return response.json();\n`;
  code += `  })\n`;
  code += `  .then(data => {\n`;
  code += `    console.log('Success:', data);\n`;
  code += `  })\n`;
  code += `  .catch(error => {\n`;
  code += `    console.error('Error:', error);\n`;
  code += `  });`;

  return code;
}

/**
 * Execute a fetch request and return the response
 */
async function executeRequest(
  method: HttpMethod,
  url: string,
  headers: Header[],
  body: string
): Promise<ApiResponse> {
  const startTime = performance.now();

  const options: RequestInit = {
    method,
    headers: headers
      .filter((h) => h.key && h.value)
      .reduce(
        (acc, h) => {
          acc[h.key] = h.value;
          return acc;
        },
        {} as Record<string, string>
      ),
  };

  if (['POST', 'PUT', 'PATCH'].includes(method) && body.trim()) {
    options.body = body;
  }

  const response = await fetch(url, options);
  const endTime = performance.now();

  // Extract headers
  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });

  // Parse body
  let responseBody: unknown;
  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    responseBody = await response.json();
  } else {
    responseBody = await response.text();
  }

  return {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
    body: responseBody,
    time: endTime - startTime,
  };
}


/**
 * ApiRequestBuilder Component
 * Interactive HTTP request builder with method selector, headers, body, and code generation
 * Requirements: 3.6
 */
export function ApiRequestBuilder({
  initialMethod = 'GET',
  initialUrl = `${DEFAULT_MOCK_API}/posts`,
  initialHeaders = defaultHeaders,
  initialBody = defaultBody,
  mockApiBase = DEFAULT_MOCK_API,
  onRequest,
}: ApiRequestBuilderProps) {
  const [method, setMethod] = useState<HttpMethod>(initialMethod);
  const [url, setUrl] = useState(initialUrl);
  const [headers, setHeaders] = useState<Header[]>(initialHeaders);
  const [body, setBody] = useState(initialBody);
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showCode, setShowCode] = useState(true);

  // Generate fetch code
  const fetchCode = useMemo(
    () => generateFetchCode(method, url, headers, body),
    [method, url, headers, body]
  );

  // Add new header
  const addHeader = useCallback(() => {
    setHeaders((prev) => [
      ...prev,
      { key: '', value: '', id: `header-${Date.now()}` },
    ]);
  }, []);

  // Remove header
  const removeHeader = useCallback((id: string) => {
    setHeaders((prev) => prev.filter((h) => h.id !== id));
  }, []);

  // Update header
  const updateHeader = useCallback(
    (id: string, field: 'key' | 'value', value: string) => {
      setHeaders((prev) =>
        prev.map((h) => (h.id === id ? { ...h, [field]: value } : h))
      );
    },
    []
  );

  // Send request
  const handleSend = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setResponse(null);

    try {
      const result = await executeRequest(method, url, headers, body);
      setResponse(result);
      onRequest?.(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setIsLoading(false);
    }
  }, [method, url, headers, body, onRequest]);

  // Reset to initial state
  const handleReset = useCallback(() => {
    setMethod(initialMethod);
    setUrl(initialUrl);
    setHeaders(initialHeaders);
    setBody(initialBody);
    setResponse(null);
    setError(null);
  }, [initialMethod, initialUrl, initialHeaders, initialBody]);

  // Copy code to clipboard
  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(fetchCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [fetchCode]);

  // Select mock endpoint
  const handleSelectEndpoint = useCallback(
    (path: string) => {
      setUrl(`${mockApiBase}${path}`);
    },
    [mockApiBase]
  );

  const showBodyEditor = ['POST', 'PUT', 'PATCH'].includes(method);

  return (
    <Card className="w-full max-w-5xl mx-auto my-8 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-secondary/30">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">API Request Builder</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCode(!showCode)}
              className="gap-1"
            >
              <Code2 className="w-3 h-3" />
              {showCode ? 'Hide Code' : 'Show Code'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset} className="gap-1">
              <RotateCcw className="w-3 h-3" />
              Reset
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Build and test HTTP requests, then see the generated fetch code
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-0">
        {/* Request Builder */}
        <div className="p-6 border-r border-border space-y-6">
          {/* Method and URL */}
          <div className="space-y-3">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Request
            </Label>
            <div className="flex gap-2">
              <Select value={method} onValueChange={(v) => setMethod(v as HttpMethod)}>
                <SelectTrigger className={cn('w-28', methodColors[method])}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as HttpMethod[]).map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Enter URL..."
                className="flex-1 font-mono text-sm"
              />
            </div>
          </div>

          {/* Quick Endpoints */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Quick Endpoints
            </Label>
            <div className="flex flex-wrap gap-2">
              {MOCK_ENDPOINTS.map((endpoint) => (
                <Button
                  key={endpoint.path}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelectEndpoint(endpoint.path)}
                  className="text-xs"
                >
                  {endpoint.path}
                </Button>
              ))}
            </div>
          </div>

          {/* Headers */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Headers
              </Label>
              <Button variant="ghost" size="sm" onClick={addHeader} className="h-7 gap-1">
                <Plus className="w-3 h-3" />
                Add
              </Button>
            </div>
            <div className="space-y-2">
              {headers.map((header) => (
                <div key={header.id} className="flex gap-2 items-center">
                  <Input
                    value={header.key}
                    onChange={(e) => updateHeader(header.id, 'key', e.target.value)}
                    placeholder="Header name"
                    className="flex-1 text-sm"
                  />
                  <Input
                    value={header.value}
                    onChange={(e) => updateHeader(header.id, 'value', e.target.value)}
                    placeholder="Value"
                    className="flex-1 text-sm"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeHeader(header.id)}
                    className="h-9 w-9 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Body Editor */}
          <AnimatePresence>
            {showBodyEditor && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3"
              >
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Request Body (JSON)
                </Label>
                <div className="border border-border rounded-lg overflow-hidden">
                  <Editor
                    height={150}
                    language="json"
                    value={body}
                    onChange={(v) => setBody(v || '')}
                    theme="vs-dark"
                    options={{
                      minimap: { enabled: false },
                      fontSize: 13,
                      lineNumbers: 'off',
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      tabSize: 2,
                      padding: { top: 12, bottom: 12 },
                    }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Send Button */}
          <Button
            onClick={handleSend}
            disabled={isLoading || !url}
            className="w-full gap-2"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {isLoading ? 'Sending...' : 'Send Request'}
          </Button>
        </div>

        {/* Code and Response */}
        <div className="flex flex-col">
          {/* Generated Code */}
          <AnimatePresence>
            {showCode && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="border-b border-border"
              >
                <div className="px-4 py-2 bg-zinc-900 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-yellow-500" />
                    <span className="text-xs text-zinc-400 font-mono">Generated Fetch Code</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopy}
                    className="h-7 gap-1 text-xs"
                  >
                    {copied ? (
                      <Check className="w-3 h-3 text-green-500" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
                <div style={{ height: 200 }}>
                  <Editor
                    height="100%"
                    language="javascript"
                    value={fetchCode}
                    theme="vs-dark"
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      fontSize: 12,
                      lineNumbers: 'on',
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      padding: { top: 12, bottom: 12 },
                    }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Response */}
          <div className="flex-1 p-4 bg-secondary/10">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Response
            </Label>
            <div className="mt-3">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-3"
                >
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-500">Request Failed</p>
                    <p className="text-sm text-muted-foreground mt-1">{error}</p>
                  </div>
                </motion.div>
              )}

              {response && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3"
                >
                  {/* Status */}
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'flex items-center gap-2 px-3 py-1.5 rounded-lg',
                        response.status >= 200 && response.status < 300
                          ? 'bg-green-500/10 text-green-500'
                          : response.status >= 400
                            ? 'bg-red-500/10 text-red-500'
                            : 'bg-yellow-500/10 text-yellow-500'
                      )}
                    >
                      {response.status >= 200 && response.status < 300 ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <AlertCircle className="w-4 h-4" />
                      )}
                      <span className="font-mono font-medium">
                        {response.status} {response.statusText}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {response.time.toFixed(0)}ms
                    </span>
                  </div>

                  {/* Response Body Preview */}
                  <div className="bg-zinc-900 rounded-lg border border-border overflow-hidden">
                    <div className="px-3 py-2 border-b border-border text-xs text-muted-foreground">
                      Response Body
                    </div>
                    <pre className="p-3 text-xs font-mono overflow-auto max-h-48 text-zinc-300">
                      {typeof response.body === 'string'
                        ? response.body
                        : JSON.stringify(response.body, null, 2)}
                    </pre>
                  </div>
                </motion.div>
              )}

              {!response && !error && (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  <Globe className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Send a request to see the response</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="px-6 py-3 border-t border-border bg-secondary/20 text-xs text-muted-foreground">
        💡 Build your request using the form, then copy the generated fetch code to use in your projects!
      </div>
    </Card>
  );
}

// Export for testing
export { executeRequest, DEFAULT_MOCK_API, MOCK_ENDPOINTS, defaultHeaders, defaultBody };
export default ApiRequestBuilder;
