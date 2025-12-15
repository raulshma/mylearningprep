'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface CacheEntry {
  key: string;
  value: string;
  expiry: Date | null;
  hits: number;
}

interface ServerInstance {
  id: number;
  name: string;
  cache: Record<string, CacheEntry>;
}

export function CacheVisualization() {
  const [servers, setServers] = useState<ServerInstance[]>([
    { id: 1, name: 'Server A', cache: {} },
    { id: 2, name: 'Server B', cache: {} },
    { id: 3, name: 'Server C', cache: {} }
  ]);
  
  const [redisCache, setRedisCache] = useState<Record<string, CacheEntry>>({});
  const [activeServer, setActiveServer] = useState<number>(1);
  const [requestCount, setRequestCount] = useState(0);
  const [cacheHits, setCacheHits] = useState(0);
  const [operation, setOperation] = useState<'get' | 'set'>('get');
  const [keyInput, setKeyInput] = useState('user-profile-123');
  const [valueInput, setValueInput] = useState('John Doe\'s Profile Data');

  // Simulate a request to get data
  const handleRequest = () => {
    setRequestCount(prev => prev + 1);
    
    // Check active server cache first (in-memory scenario)
    const activeServerCache = servers.find(s => s.id === activeServer)?.cache || {};
    if (activeServerCache[keyInput]) {
      // Cache hit on active server
      setCacheHits(prev => prev + 1);
      
      // Update hit count
      const updatedServers = servers.map(server => {
        if (server.id === activeServer && server.cache[keyInput]) {
          return {
            ...server,
            cache: {
              ...server.cache,
              [keyInput]: {
                ...server.cache[keyInput],
                hits: server.cache[keyInput].hits + 1
              }
            }
          };
        }
        return server;
      });
      
      setServers(updatedServers);
      return;
    }
    
    // Check Redis cache (distributed scenario)
    if (redisCache[keyInput]) {
      // Cache hit in Redis
      setCacheHits(prev => prev + 1);
      
      // Update hit count in Redis
      setRedisCache(prev => ({
        ...prev,
        [keyInput]: {
          ...prev[keyInput],
          hits: prev[keyInput].hits + 1
        }
      }));
      
      // Also populate active server cache for next time
      const updatedServers = servers.map(server => {
        if (server.id === activeServer) {
          return {
            ...server,
            cache: {
              ...server.cache,
              [keyInput]: {
                ...redisCache[keyInput],
                hits: redisCache[keyInput].hits + 1
              }
            }
          };
        }
        return server;
      });
      
      setServers(updatedServers);
      return;
    }
    
    // Cache miss - simulate database fetch and cache population
    const newEntry: CacheEntry = {
      key: keyInput,
      value: valueInput,
      expiry: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      hits: 1
    };
    
    // Store in Redis (distributed cache)
    setRedisCache(prev => ({
      ...prev,
      [keyInput]: newEntry
    }));
    
    // Also populate active server cache
    const updatedServers = servers.map(server => {
      if (server.id === activeServer) {
        return {
          ...server,
          cache: {
            ...server.cache,
            [keyInput]: newEntry
          }
        };
      }
      return server;
    });
    
    setServers(updatedServers);
  };

  const handleSetCache = () => {
    const newEntry: CacheEntry = {
      key: keyInput,
      value: valueInput,
      expiry: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      hits: 0
    };
    
    if (operation === 'set') {
      // Set in Redis (distributed)
      setRedisCache(prev => ({
        ...prev,
        [keyInput]: newEntry
      }));
      
      // Also populate all server caches
      const updatedServers = servers.map(server => ({
        ...server,
        cache: {
          ...server.cache,
          [keyInput]: newEntry
        }
      }));
      
      setServers(updatedServers);
    }
  };

  const clearAllCaches = () => {
    setServers(prev => prev.map(server => ({
      ...server,
      cache: {}
    })));
    setRedisCache({});
    setRequestCount(0);
    setCacheHits(0);
  };

  const getHitRatio = () => {
    if (requestCount === 0) return 0;
    return Math.round((cacheHits / requestCount) * 100);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Cache Hit Ratio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{getHitRatio()}%</div>
            <Progress value={getHitRatio()} className="mt-2" />
            <div className="text-sm text-muted-foreground mt-1">
              {cacheHits} hits / {requestCount} requests
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>In-Memory Cache</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {servers.find(s => s.id === activeServer)?.cache ? 
                Object.keys(servers.find(s => s.id === activeServer)!.cache).length : 0}
            </div>
            <div className="text-sm text-muted-foreground">entries</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Redis Cache</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{Object.keys(redisCache).length}</div>
            <div className="text-sm text-muted-foreground">entries</div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Server Visualization */}
        <Card>
          <CardHeader>
            <CardTitle>Server Instances</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {servers.map((server) => (
                <div 
                  key={server.id}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    activeServer === server.id 
                      ? 'border-primary bg-primary/10' 
                      : 'border-border'
                  }`}
                  onClick={() => setActiveServer(server.id)}
                >
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold">{server.name}</h3>
                    <Badge variant={activeServer === server.id ? "default" : "secondary"}>
                      {Object.keys(server.cache).length} entries
                    </Badge>
                  </div>
                  
                  <div className="mt-3 space-y-2 max-h-32 overflow-y-auto">
                    <AnimatePresence>
                      {Object.entries(server.cache).map(([key, entry]) => (
                        <motion.div
                          key={key}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="flex justify-between text-sm p-2 bg-secondary rounded"
                        >
                          <span className="truncate">{key}</span>
                          <span className="font-mono text-xs">({entry.hits})</span>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    
                    {Object.keys(server.cache).length === 0 && (
                      <div className="text-muted-foreground text-sm italic">
                        No cached entries
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        {/* Redis Cache Visualization */}
        <Card>
          <CardHeader>
            <CardTitle>Redis Distributed Cache</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 rounded-lg border border-border bg-blue-50 dark:bg-blue-950/20">
                <h3 className="font-semibold mb-2">Shared Across All Servers</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  <AnimatePresence>
                    {Object.entries(redisCache).map(([key, entry]) => (
                      <motion.div
                        key={key}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex justify-between text-sm p-2 bg-secondary rounded"
                      >
                        <span className="truncate">{key}</span>
                        <span className="font-mono text-xs">({entry.hits})</span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  
                  {Object.keys(redisCache).length === 0 && (
                    <div className="text-muted-foreground text-sm italic">
                      No cached entries
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    onClick={() => setOperation('get')}
                    variant={operation === 'get' ? 'default' : 'outline'}
                  >
                    GET
                  </Button>
                  <Button 
                    onClick={() => setOperation('set')}
                    variant={operation === 'set' ? 'default' : 'outline'}
                  >
                    SET
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <input
                    type="text"
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    placeholder="Cache key"
                    className="w-full p-2 border rounded text-sm"
                  />
                  
                  {operation === 'set' && (
                    <textarea
                      value={valueInput}
                      onChange={(e) => setValueInput(e.target.value)}
                      placeholder="Cache value"
                      className="w-full p-2 border rounded text-sm"
                      rows={2}
                    />
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={operation === 'get' ? handleRequest : handleSetCache}
                    className="flex-1"
                  >
                    {operation === 'get' ? 'Request Data' : 'Set Cache'}
                  </Button>
                  <Button 
                    onClick={clearAllCaches}
                    variant="destructive"
                    className="flex-1"
                  >
                    Clear All
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>How Caching Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">
                1
              </div>
              <div>
                <h4 className="font-medium">In-Memory Cache (Per Server)</h4>
                <p className="text-sm text-muted-foreground">
                  Each server maintains its own cache. Fast but not shared between servers.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">
                2
              </div>
              <div>
                <h4 className="font-medium">Redis Distributed Cache</h4>
                <p className="text-sm text-muted-foreground">
                  Shared cache accessible by all servers. Slightly slower but consistent.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">
                3
              </div>
              <div>
                <h4 className="font-medium">Cache Lookup Strategy</h4>
                <p className="text-sm text-muted-foreground">
                  Check in-memory cache first, then Redis, then database. Higher hit ratio = better performance.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}