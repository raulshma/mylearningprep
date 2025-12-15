'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Server, Smartphone, Code2, Network, Binary } from 'lucide-react';

type ArchitectureView = 'http2' | 'layers' | 'communication';

export function GrpcArchitectureVisualizer() {
  const [view, setView] = useState<ArchitectureView>('http2');
  const [animating, setAnimating] = useState(false);

  const triggerAnimation = () => {
    setAnimating(true);
    setTimeout(() => setAnimating(false), 2000);
  };

  return (
    <Card className="p-6 my-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Network className="w-5 h-5 text-purple-500" />
          gRPC Architecture
        </h3>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={view === 'http2' ? 'default' : 'outline'}
            onClick={() => setView('http2')}
          >
            HTTP/2 Stack
          </Button>
          <Button
            size="sm"
            variant={view === 'layers' ? 'default' : 'outline'}
            onClick={() => setView('layers')}
          >
            Protocol Layers
          </Button>
          <Button
            size="sm"
            variant={view === 'communication' ? 'default' : 'outline'}
            onClick={() => setView('communication')}
          >
            Communication Flow
          </Button>
        </div>
      </div>

      {view === 'http2' && (
        <div className="space-y-6">
          <div className="text-center space-y-4">
            <div className="inline-block p-6 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 rounded-lg border-2 border-purple-200 dark:border-purple-800">
              <h4 className="font-bold text-purple-900 dark:text-purple-100 mb-4">gRPC Stack</h4>
              <div className="space-y-3 min-w-[300px]">
                <div className="p-3 bg-white dark:bg-gray-900 rounded border border-purple-300">
                  <div className="font-semibold text-sm">Application Code (C#)</div>
                  <div className="text-xs text-gray-600">Your business logic & services</div>
                </div>
                <ArrowRight className="w-5 h-5 mx-auto rotate-90 text-purple-500" />
                <div className="p-3 bg-white dark:bg-gray-900 rounded border border-purple-300">
                  <div className="font-semibold text-sm">gRPC Framework</div>
                  <div className="text-xs text-gray-600">Service definitions & RPC handling</div>
                </div>
                <ArrowRight className="w-5 h-5 mx-auto rotate-90 text-purple-500" />
                <div className="p-3 bg-white dark:bg-gray-900 rounded border border-purple-300">
                  <div className="font-semibold text-sm">Protocol Buffers</div>
                  <div className="text-xs text-gray-600">Binary serialization (encoding/decoding)</div>
                </div>
                <ArrowRight className="w-5 h-5 mx-auto rotate-90 text-purple-500" />
                <div className="p-3 bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 rounded border-2 border-blue-400">
                  <div className="font-bold text-sm">HTTP/2</div>
                  <div className="text-xs text-gray-700 dark:text-gray-300">Multiplexing • Header compression • Binary framing</div>
                </div>
                <ArrowRight className="w-5 h-5 mx-auto rotate-90 text-purple-500" />
                <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded">
                  <div className="font-semibold text-sm">TCP/IP</div>
                  <div className="text-xs text-gray-600">Network transport layer</div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
              <h5 className="font-semibold mb-2 text-blue-900 dark:text-blue-100">Multiplexing</h5>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Multiple requests/responses on a single TCP connection simultaneously
              </p>
            </div>
            <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-950/20">
              <h5 className="font-semibold mb-2 text-green-900 dark:text-green-100">Header Compression</h5>
              <p className="text-sm text-green-800 dark:text-green-200">
                HPACK compression reduces overhead for repeated header fields
              </p>
            </div>
            <div className="p-4 border rounded-lg bg-purple-50 dark:bg-purple-950/20">
              <h5 className="font-semibold mb-2 text-purple-900 dark:text-purple-100">Binary Framing</h5>
              <p className="text-sm text-purple-800 dark:text-purple-200">
                Efficient binary protocol instead of text-based HTTP/1.1
              </p>
            </div>
          </div>
        </div>
      )}

      {view === 'layers' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3 text-center">Client Side</h4>
              <div className="space-y-2">
                <div className="p-4 bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <Code2 className="w-4 h-4" />
                    <span className="font-semibold">Application Layer</span>
                  </div>
                  <p className="text-xs mt-1">Makes RPC calls through generated client stub</p>
                </div>
                <div className="p-4 bg-purple-100 dark:bg-purple-900 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <Binary className="w-4 h-4" />
                    <span className="font-semibold">Stub Layer</span>
                  </div>
                  <p className="text-xs mt-1">Auto-generated from .proto files (serialization)</p>
                </div>
                <div className="p-4 bg-indigo-100 dark:bg-indigo-900 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <Network className="w-4 h-4" />
                    <span className="font-semibold">gRPC Core</span>
                  </div>
                  <p className="text-xs mt-1">Handles HTTP/2 communication, flow control</p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-3 text-center">Server Side</h4>
              <div className="space-y-2">
                <div className="p-4 bg-gradient-to-r from-green-100 to-green-200 dark:from-green-900 dark:to-green-800 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4" />
                    <span className="font-semibold">Service Implementation</span>
                  </div>
                  <p className="text-xs mt-1">Your business logic implementing service methods</p>
                </div>
                <div className="p-4 bg-purple-100 dark:bg-purple-900 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <Binary className="w-4 h-4" />
                    <span className="font-semibold">Service Stub</span>
                  </div>
                  <p className="text-xs mt-1">Auto-generated base class (deserialization)</p>
                </div>
                <div className="p-4 bg-indigo-100 dark:bg-indigo-900 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <Network className="w-4 h-4" />
                    <span className="font-semibold">gRPC Core</span>
                  </div>
                  <p className="text-xs mt-1">Listens for requests, routes to handlers</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {view === 'communication' && (
        <div className="space-y-6">
          <div className="flex justify-center mb-4">
            <Button onClick={triggerAnimation} variant="outline" size="sm">
              Animate Request Flow
            </Button>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 p-6 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
              <div className="flex items-center gap-2 mb-3">
                <Smartphone className="w-6 h-6 text-blue-600" />
                <h4 className="font-bold text-blue-900 dark:text-blue-100">gRPC Client</h4>
              </div>
              <div className="space-y-2 text-sm">
                <div className={`p-2 bg-white dark:bg-gray-900 rounded transition-all ${animating ? 'ring-2 ring-blue-500' : ''}`}>
                  1. Call method on stub
                </div>
                <div className={`p-2 bg-white dark:bg-gray-900 rounded transition-all ${animating ? 'ring-2 ring-blue-500 delay-300' : ''}`}>
                  2. Serialize to Protobuf
                </div>
                <div className={`p-2 bg-white dark:bg-gray-900 rounded transition-all ${animating ? 'ring-2 ring-blue-500 delay-500' : ''}`}>
                  3. Send over HTTP/2
                </div>
                <div className={`p-2 bg-white dark:bg-gray-900 rounded transition-all ${animating ? 'ring-2 ring-green-500 delay-1500' : ''}`}>
                  6. Receive response
                </div>
                <div className={`p-2 bg-white dark:bg-gray-900 rounded transition-all ${animating ? 'ring-2 ring-green-500 delay-1700' : ''}`}>
                  7. Deserialize Protobuf
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center gap-2">
              <ArrowRight className={`w-8 h-8 text-blue-500 transition-transform ${animating ? 'translate-x-2 delay-500' : ''}`} />
              <Badge variant="outline">HTTP/2</Badge>
              <ArrowRight className={`w-8 h-8 text-green-500 rotate-180 transition-transform ${animating ? '-translate-x-2 delay-1300' : ''}`} />
            </div>

            <div className="flex-1 p-6 border rounded-lg bg-green-50 dark:bg-green-950/20">
              <div className="flex items-center gap-2 mb-3">
                <Server className="w-6 h-6 text-green-600" />
                <h4 className="font-bold text-green-900 dark:text-green-100">gRPC Server</h4>
              </div>
              <div className="space-y-2 text-sm">
                <div className={`p-2 bg-white dark:bg-gray-900 rounded transition-all ${animating ? 'ring-2 ring-blue-500 delay-700' : ''}`}>
                  4. Receive HTTP/2 request
                </div>
                <div className={`p-2 bg-white dark:bg-gray-900 rounded transition-all ${animating ? 'ring-2 ring-blue-500 delay-900' : ''}`}>
                  5. Deserialize Protobuf
                </div>
                <div className={`p-2 bg-white dark:bg-gray-900 rounded transition-all ${animating ? 'ring-2 ring-purple-500 delay-1000' : ''}`}>
                  ⚡ Execute method
                </div>
                <div className={`p-2 bg-white dark:bg-gray-900 rounded transition-all ${animating ? 'ring-2 ring-green-500 delay-1100' : ''}`}>
                  6. Serialize response
                </div>
                <div className={`p-2 bg-white dark:bg-gray-900 rounded transition-all ${animating ? 'ring-2 ring-green-500 delay-1300' : ''}`}>
                  7. Send via HTTP/2
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
