'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Play, RotateCcw, Globe, Code } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface ApiEndpoint {
  method: HttpMethod;
  route: string;
  action: string;
  parameters?: string[];
}

export interface ApiEndpointBuilderProps {
  mode?: 'beginner' | 'intermediate' | 'advanced';
  title?: string;
}

const methodColors: Record<HttpMethod, string> = {
  GET: 'bg-green-500',
  POST: 'bg-blue-500',
  PUT: 'bg-amber-500',
  DELETE: 'bg-red-500',
  PATCH: 'bg-purple-500',
};

const defaultEndpoints: ApiEndpoint[] = [
  { method: 'GET', route: '/api/users', action: 'GetAll', parameters: [] },
  { method: 'GET', route: '/api/users/{id}', action: 'GetById', parameters: ['id'] },
  { method: 'POST', route: '/api/users', action: 'Create', parameters: [] },
  { method: 'PUT', route: '/api/users/{id}', action: 'Update', parameters: ['id'] },
  { method: 'DELETE', route: '/api/users/{id}', action: 'Delete', parameters: ['id'] },
];

export function ApiEndpointBuilder({
  mode = 'beginner',
  title = 'REST API Endpoint Builder',
}: ApiEndpointBuilderProps) {
  const [endpoints, setEndpoints] = useState<ApiEndpoint[]>(defaultEndpoints);
  const [selectedEndpoint, setSelectedEndpoint] = useState<number | null>(null);
  const [testUrl, setTestUrl] = useState('/api/users');
  const [testMethod, setTestMethod] = useState<HttpMethod>('GET');
  const [testResult, setTestResult] = useState<string | null>(null);

  const addEndpoint = () => {
    setEndpoints([
      ...endpoints,
      { method: 'GET', route: '/api/new', action: 'NewAction', parameters: [] },
    ]);
  };

  const removeEndpoint = (index: number) => {
    setEndpoints(endpoints.filter((_, i) => i !== index));
    if (selectedEndpoint === index) setSelectedEndpoint(null);
  };

  const testEndpoint = () => {
    const match = endpoints.find(ep => {
      if (ep.method !== testMethod) return false;
      const routeRegex = ep.route.replace(/\{[^}]+\}/g, '[^/]+');
      return new RegExp(`^${routeRegex}$`).test(testUrl);
    });

    if (match) {
      setTestResult(`✅ Matched: ${match.action}() in UsersController`);
    } else {
      setTestResult('❌ No matching endpoint found (404)');
    }
  };

  const resetDemo = () => {
    setEndpoints(defaultEndpoints);
    setSelectedEndpoint(null);
    setTestUrl('/api/users');
    setTestMethod('GET');
    setTestResult(null);
  };

  return (
    <Card className="my-4 overflow-hidden bg-gray-950 border-gray-800">
      <CardHeader className="pb-2 flex flex-row items-center justify-between bg-gray-900/50">
        <CardTitle className="text-sm font-medium text-gray-200 flex items-center gap-2">
          <Globe className="h-4 w-4 text-blue-400" />
          {title}
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={resetDemo}
            className="text-gray-400 hover:text-white"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {/* Beginner Analogy */}
        {mode === 'beginner' && (
          <div className="bg-gray-900/50 rounded-lg p-4 mb-4">
            <h4 className="font-medium text-gray-200 mb-2">📬 Think of APIs Like a Post Office</h4>
            <ul className="text-sm text-gray-400 space-y-1">
              <li><span className="text-green-400">GET</span> = &quot;I want to read something&quot;</li>
              <li><span className="text-blue-400">POST</span> = &quot;I want to send/create something new&quot;</li>
              <li><span className="text-amber-400">PUT</span> = &quot;I want to update/replace something&quot;</li>
              <li><span className="text-red-400">DELETE</span> = &quot;I want to remove something&quot;</li>
            </ul>
          </div>
        )}

        {/* Endpoint List */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-300">Endpoints</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={addEndpoint}
              className="text-gray-400 hover:text-white"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>

          <AnimatePresence>
            {endpoints.map((endpoint, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className={cn(
                  'flex items-center gap-2 p-2 rounded-lg border transition-all cursor-pointer',
                  selectedEndpoint === index
                    ? 'border-blue-500 bg-blue-900/20'
                    : 'border-gray-700 bg-gray-900/50 hover:border-gray-600'
                )}
                onClick={() => setSelectedEndpoint(index)}
              >
                <span
                  className={cn(
                    'px-2 py-0.5 rounded text-xs font-bold text-white',
                    methodColors[endpoint.method]
                  )}
                >
                  {endpoint.method}
                </span>
                <span className="flex-1 font-mono text-sm text-gray-300">
                  {endpoint.route}
                </span>
                <span className="text-xs text-gray-500">{endpoint.action}()</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeEndpoint(index);
                  }}
                  className="text-gray-500 hover:text-red-400 h-6 w-6 p-0"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Test API */}
        <div className="bg-gray-900/50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-300 mb-3">Test Request</h4>
          <div className="flex gap-2 mb-3">
            <select
              value={testMethod}
              onChange={(e) => setTestMethod(e.target.value as HttpMethod)}
              className="bg-gray-800 text-gray-300 text-sm rounded px-2 py-1 border border-gray-700"
            >
              {(['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as HttpMethod[]).map(method => (
                <option key={method} value={method}>{method}</option>
              ))}
            </select>
            <Input
              value={testUrl}
              onChange={(e) => setTestUrl(e.target.value)}
              placeholder="/api/users"
              className="flex-1 bg-gray-800 border-gray-700 text-gray-300 text-sm"
            />
            <Button
              onClick={testEndpoint}
              className="bg-blue-600 hover:bg-blue-700"
              size="sm"
            >
              <Play className="h-4 w-4 mr-1" />
              Test
            </Button>
          </div>

          {testResult && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                'p-2 rounded text-sm',
                testResult.startsWith('✅')
                  ? 'bg-green-900/30 text-green-400'
                  : 'bg-red-900/30 text-red-400'
              )}
            >
              {testResult}
            </motion.div>
          )}
        </div>

        {/* Code Preview for Intermediate/Advanced */}
        {mode !== 'beginner' && selectedEndpoint !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 bg-gray-900 rounded-lg p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <Code className="h-4 w-4 text-gray-400" />
              <span className="text-xs font-medium text-gray-400">Controller Code</span>
            </div>
            <pre className="text-xs font-mono text-gray-300 overflow-x-auto">
              <span className="text-gray-500">{/* UsersController.cs */}{'// UsersController.cs'}</span>
              {'\n'}
              <span className="text-gray-400">[</span>
              <span className="text-cyan-400">Http{endpoints[selectedEndpoint].method.charAt(0) + endpoints[selectedEndpoint].method.slice(1).toLowerCase()}</span>
              <span className="text-gray-400">(</span>
              <span className="text-amber-400">&quot;{endpoints[selectedEndpoint].route.replace('/api/users', '')}&quot;</span>
              <span className="text-gray-400">)]</span>
              {'\n'}
              <span className="text-purple-400">public</span>
              <span className="text-gray-300"> </span>
              <span className="text-cyan-400">IActionResult</span>
              <span className="text-gray-300"> </span>
              <span className="text-yellow-400">{endpoints[selectedEndpoint].action}</span>
              <span className="text-gray-400">(</span>
              {endpoints[selectedEndpoint].parameters?.length ? (
                <>
                  <span className="text-cyan-400">int</span>
                  <span className="text-gray-300"> </span>
                  <span className="text-gray-200">{endpoints[selectedEndpoint].parameters[0]}</span>
                </>
              ) : ''}
              <span className="text-gray-400">)</span>
              {'\n'}
              <span className="text-gray-400">{`{'}`}</span>
              {'\n'}
              <span className="text-gray-400">{'    '}{'// Implementation...'}</span>
              {'\n'}
              <span className="text-gray-400">{`}`}</span>
            </pre>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}

export default ApiEndpointBuilder;
