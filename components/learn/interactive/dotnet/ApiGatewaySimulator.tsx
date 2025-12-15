'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  RotateCcw, 
  Play, 
  Shield,
  Gauge,
  ArrowRight,
  Server,
  User,
  Globe,
  Lock,
  Timer,
  Shuffle,
  CheckCircle2,
  XCircle,
  Loader2,
  Building2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface ApiGatewaySimulatorProps {
  mode?: 'beginner' | 'intermediate' | 'advanced';
  title?: string;
}

interface Request {
  id: string;
  path: string;
  targetService: string;
  status: 'pending' | 'authenticated' | 'routing' | 'processing' | 'complete' | 'blocked';
  color: string;
}

interface Service {
  id: string;
  name: string;
  path: string;
  color: string;
}

const services: Service[] = [
  { id: 'users', name: 'User Service', path: '/api/users', color: 'bg-blue-500' },
  { id: 'catalog', name: 'Catalog Service', path: '/api/products', color: 'bg-green-500' },
  { id: 'orders', name: 'Order Service', path: '/api/orders', color: 'bg-purple-500' },
  { id: 'payment', name: 'Payment Service', path: '/api/payments', color: 'bg-orange-500' },
];

const gatewayFeatures = [
  { icon: <Lock className="h-4 w-4" />, name: 'Authentication', color: 'text-yellow-400' },
  { icon: <Shuffle className="h-4 w-4" />, name: 'Routing', color: 'text-blue-400' },
  { icon: <Gauge className="h-4 w-4" />, name: 'Rate Limiting', color: 'text-red-400' },
  { icon: <Shield className="h-4 w-4" />, name: 'SSL Termination', color: 'text-green-400' },
];

export function ApiGatewaySimulator({
  mode = 'beginner',
  title = 'API Gateway Pattern',
}: ApiGatewaySimulatorProps) {
  const [requests, setRequests] = useState<Request[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [selectedService, setSelectedService] = useState<string>('catalog');
  const [currentStep, setCurrentStep] = useState<string>('');
  const [rateLimitCount, setRateLimitCount] = useState(0);
  const requestIdRef = useRef(0);

  const resetDemo = () => {
    setRequests([]);
    setIsAnimating(false);
    setCurrentStep('');
    setRateLimitCount(0);
  };

  const simulateRequest = async () => {
    setIsAnimating(true);
    const service = services.find(s => s.id === selectedService)!;
    const reqId = `req-${requestIdRef.current++}`;
    
    const newRequest: Request = {
      id: reqId,
      path: service.path,
      targetService: service.name,
      status: 'pending',
      color: service.color,
    };

    setRequests(prev => [...prev.slice(-4), newRequest]); // Keep last 5 requests

    // Step 1: Request arrives at gateway
    setCurrentStep('Request arrives at API Gateway');
    await new Promise(resolve => setTimeout(resolve, 600));

    // Step 2: Authentication
    setCurrentStep('Verifying authentication...');
    setRequests(prev => prev.map(r => 
      r.id === reqId ? { ...r, status: 'authenticated' as const } : r
    ));
    await new Promise(resolve => setTimeout(resolve, 700));

    // Step 3: Rate limiting check
    setRateLimitCount(prev => prev + 1);
    if (rateLimitCount >= 9) {
      setCurrentStep('Rate limit exceeded! Request blocked.');
      setRequests(prev => prev.map(r => 
        r.id === reqId ? { ...r, status: 'blocked' as const } : r
      ));
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsAnimating(false);
      return;
    }
    setCurrentStep('Rate limit check passed');
    await new Promise(resolve => setTimeout(resolve, 400));

    // Step 4: Routing
    setCurrentStep(`Routing to ${service.name}...`);
    setRequests(prev => prev.map(r => 
      r.id === reqId ? { ...r, status: 'routing' as const } : r
    ));
    await new Promise(resolve => setTimeout(resolve, 600));

    // Step 5: Processing
    setCurrentStep(`${service.name} processing request...`);
    setRequests(prev => prev.map(r => 
      r.id === reqId ? { ...r, status: 'processing' as const } : r
    ));
    await new Promise(resolve => setTimeout(resolve, 800));

    // Step 6: Complete
    setCurrentStep('Response returned to client');
    setRequests(prev => prev.map(r => 
      r.id === reqId ? { ...r, status: 'complete' as const } : r
    ));
    await new Promise(resolve => setTimeout(resolve, 500));

    setIsAnimating(false);
  };

  return (
    <Card className="my-4 overflow-hidden bg-gray-950 border-gray-800">
      <CardHeader className="pb-2 flex flex-row items-center justify-between bg-gray-900/50">
        <CardTitle className="text-sm font-medium text-gray-200 flex items-center gap-2">
          <Shield className="h-4 w-4 text-green-400" />
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
            <h4 className="font-medium text-gray-200 mb-2">🛎️ Hotel Concierge Analogy</h4>
            <p className="text-sm text-gray-400">
              Think of an API Gateway like a <span className="text-green-400">hotel concierge</span>. 
              Guests (clients) don&apos;t need to know where the restaurant, spa, or room service are located. 
              They just ask the concierge, who knows exactly where to send each request!
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2 text-gray-400">
                <Lock className="h-4 w-4 text-yellow-400" />
                <span>Checks your room key (Auth)</span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <Shuffle className="h-4 w-4 text-blue-400" />
                <span>Directs you to right service</span>
              </div>
            </div>
          </div>
        )}

        {/* Service Selector */}
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="text-sm text-gray-400 mr-2">Request to:</span>
          {services.map(service => (
            <Button
              key={service.id}
              variant={selectedService === service.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedService(service.id)}
              className={cn(
                'text-xs',
                selectedService === service.id && service.color
              )}
            >
              {service.path}
            </Button>
          ))}
        </div>

        {/* Main Visualization */}
        <div className="relative bg-gray-900/30 rounded-xl p-6">
          <div className="flex items-center justify-between gap-4">
            {/* Client */}
            <div className="flex flex-col items-center min-w-[60px]">
              <motion.div
                animate={isAnimating ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 0.5 }}
                className="w-16 h-16 rounded-full bg-gray-800 border-2 border-gray-600 flex items-center justify-center"
              >
                <User className="h-8 w-8 text-gray-400" />
              </motion.div>
              <span className="text-xs text-gray-400 mt-2">Client</span>
            </div>

            {/* Arrow to Gateway */}
            <div className="flex-1 relative h-8 max-w-[60px]">
              <ArrowRight className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-gray-500" />
              <AnimatePresence>
                {requests.filter(r => r.status === 'pending').map(req => (
                  <motion.div
                    key={req.id}
                    initial={{ x: 0, opacity: 0 }}
                    animate={{ x: 40, opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={cn('absolute top-0 left-0 w-3 h-3 rounded-full', req.color)}
                  />
                ))}
              </AnimatePresence>
            </div>

            {/* API Gateway */}
            <div className="flex flex-col items-center">
              <motion.div
                animate={
                  requests.some(r => ['authenticated', 'routing'].includes(r.status))
                    ? { 
                        boxShadow: [
                          '0 0 0 rgba(34, 197, 94, 0)',
                          '0 0 20px rgba(34, 197, 94, 0.5)',
                          '0 0 0 rgba(34, 197, 94, 0)'
                        ]
                      }
                    : {}
                }
                transition={{ duration: 1, repeat: Infinity }}
                className="relative w-24 h-24 rounded-xl bg-gradient-to-br from-green-900/50 to-green-950/50 border-2 border-green-500 flex flex-col items-center justify-center"
              >
                <Globe className="h-8 w-8 text-green-400" />
                <span className="text-xs text-green-300 mt-1">Gateway</span>
                
                {/* Rate limit indicator */}
                {mode !== 'beginner' && (
                  <div className="absolute -top-2 -right-2 bg-gray-800 border border-gray-600 rounded-full px-2 py-0.5 text-[10px] text-gray-300">
                    {rateLimitCount}/10
                  </div>
                )}
              </motion.div>
              
              {/* Gateway features */}
              <div className="flex gap-2 mt-2">
                {gatewayFeatures.slice(0, mode === 'beginner' ? 2 : 4).map((feature, i) => (
                  <div
                    key={i}
                    className={cn('p-1 rounded bg-gray-800', feature.color)}
                    title={feature.name}
                  >
                    {feature.icon}
                  </div>
                ))}
              </div>
            </div>

            {/* Arrow to Services */}
            <div className="flex-1 relative h-8 max-w-[60px]">
              <ArrowRight className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-gray-500" />
              <AnimatePresence>
                {requests.filter(r => r.status === 'routing').map(req => (
                  <motion.div
                    key={req.id}
                    initial={{ x: 0, opacity: 0 }}
                    animate={{ x: 40, opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={cn('absolute top-0 left-0 w-3 h-3 rounded-full', req.color)}
                  />
                ))}
              </AnimatePresence>
            </div>

            {/* Microservices */}
            <div className="flex flex-col gap-2">
              {services.map(service => (
                <motion.div
                  key={service.id}
                  animate={
                    requests.some(r => 
                      r.targetService === service.name && 
                      ['processing', 'complete'].includes(r.status)
                    )
                      ? { scale: [1, 1.05, 1] }
                      : {}
                  }
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition-all',
                    selectedService === service.id
                      ? `${service.color} border-white/30 text-white`
                      : 'bg-gray-800/50 border-gray-700 text-gray-400'
                  )}
                >
                  <Server className="h-3 w-3" />
                  <span className="hidden sm:inline">{service.name}</span>
                  {requests.some(r => 
                    r.targetService === service.name && r.status === 'complete'
                  ) && (
                    <CheckCircle2 className="h-3 w-3 text-green-400" />
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          {/* Status Message */}
          <AnimatePresence>
            {currentStep && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-center mt-4 text-sm text-gray-400"
              >
                {isAnimating && <Loader2 className="h-4 w-4 animate-spin inline mr-2" />}
                {currentStep}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Button */}
          <div className="flex justify-center mt-6">
            <Button
              onClick={simulateRequest}
              disabled={isAnimating}
              className="bg-green-600 hover:bg-green-700"
            >
              <Play className="h-4 w-4 mr-2" />
              Send Request
            </Button>
          </div>
        </div>

        {/* Request History */}
        {requests.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-300 mb-2">Request History</h4>
            <div className="space-y-1">
              {requests.slice().reverse().map(req => (
                <div
                  key={req.id}
                  className="flex items-center justify-between bg-gray-900/50 rounded px-3 py-1.5 text-xs"
                >
                  <span className="text-gray-400">{req.path}</span>
                  <span className={cn(
                    'flex items-center gap-1',
                    req.status === 'complete' && 'text-green-400',
                    req.status === 'blocked' && 'text-red-400',
                    !['complete', 'blocked'].includes(req.status) && 'text-yellow-400'
                  )}>
                    {req.status === 'complete' && <CheckCircle2 className="h-3 w-3" />}
                    {req.status === 'blocked' && <XCircle className="h-3 w-3" />}
                    {!['complete', 'blocked'].includes(req.status) && <Loader2 className="h-3 w-3 animate-spin" />}
                    {req.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Intermediate: Gateway Responsibilities */}
        {mode !== 'beginner' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2"
          >
            <div className="bg-gray-900/50 rounded-lg p-3 text-center">
              <Lock className="h-5 w-5 text-yellow-400 mx-auto mb-1" />
              <span className="text-xs text-gray-300">Authentication</span>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-3 text-center">
              <Gauge className="h-5 w-5 text-red-400 mx-auto mb-1" />
              <span className="text-xs text-gray-300">Rate Limiting</span>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-3 text-center">
              <Shuffle className="h-5 w-5 text-blue-400 mx-auto mb-1" />
              <span className="text-xs text-gray-300">Load Balancing</span>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-3 text-center">
              <Timer className="h-5 w-5 text-purple-400 mx-auto mb-1" />
              <span className="text-xs text-gray-300">Caching</span>
            </div>
          </motion.div>
        )}

        {/* Advanced: Ocelot Configuration */}
        {mode === 'advanced' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 bg-gray-900 rounded-lg p-4 font-mono text-xs overflow-x-auto"
          >
            <div className="text-green-400 mb-2">{"//"} ocelot.json - Route Configuration</div>
            <pre className="text-gray-300">
{`{
  "Routes": [
    {
      "DownstreamPathTemplate": "/api/products/{everything}",
      "DownstreamScheme": "http",
      "DownstreamHostAndPorts": [
        { "Host": "catalog-service", "Port": 80 }
      ],
      "UpstreamPathTemplate": "/api/products/{everything}",
      "UpstreamHttpMethod": [ "GET", "POST" ],
      "AuthenticationOptions": {
        "AuthenticationProviderKey": "Bearer"
      },
      "RateLimitOptions": {
        "ClientWhitelist": [],
        "EnableRateLimiting": true,
        "Period": "1m",
        "Limit": 100
      }
    }
  ]
}`}
            </pre>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}

export default ApiGatewaySimulator;
