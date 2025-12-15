'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  RotateCcw, 
  Play, 
  Phone,
  Mail,
  ArrowRight,
  ArrowRightLeft,
  Server,
  MessageSquare,
  Zap,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface ServiceCommunicationDemoProps {
  mode?: 'beginner' | 'intermediate' | 'advanced';
  title?: string;
  defaultPattern?: 'sync' | 'async';
}

type CommunicationType = 'http' | 'grpc' | 'rabbitmq' | 'events';

interface Message {
  id: string;
  from: string;
  to: string;
  content: string;
  type: CommunicationType;
  status: 'sending' | 'delivered' | 'processing' | 'responded' | 'error';
}

const communicationTypes: Record<CommunicationType, { 
  name: string; 
  color: string; 
  icon: React.ReactNode;
  isSync: boolean;
  description: string;
}> = {
  http: { 
    name: 'HTTP REST', 
    color: 'bg-blue-500', 
    icon: <ArrowRightLeft className="h-4 w-4" />,
    isSync: true,
    description: 'Request-response over HTTP'
  },
  grpc: { 
    name: 'gRPC', 
    color: 'bg-purple-500', 
    icon: <Zap className="h-4 w-4" />,
    isSync: true,
    description: 'High-performance RPC with Protocol Buffers'
  },
  rabbitmq: { 
    name: 'RabbitMQ', 
    color: 'bg-orange-500', 
    icon: <MessageSquare className="h-4 w-4" />,
    isSync: false,
    description: 'Message broker for async communication'
  },
  events: { 
    name: 'Event Bus', 
    color: 'bg-green-500', 
    icon: <Mail className="h-4 w-4" />,
    isSync: false,
    description: 'Publish-subscribe pattern'
  },
};

export function ServiceCommunicationDemo({
  mode = 'beginner',
  title = 'Service Communication',
  defaultPattern = 'sync',
}: ServiceCommunicationDemoProps) {
  const [selectedType, setSelectedType] = useState<CommunicationType>(
    defaultPattern === 'sync' ? 'http' : 'rabbitmq'
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [step, setStep] = useState(0);
  const messageIdRef = useRef(0);

  const resetDemo = () => {
    setMessages([]);
    setIsAnimating(false);
    setStep(0);
  };

  const simulateCommunication = async () => {
    setIsAnimating(true);
    setMessages([]);
    
    const type = communicationTypes[selectedType];
    const msgId = `msg-${messageIdRef.current++}`;

    // Step 1: Send message
    setStep(1);
    const newMessage: Message = {
      id: msgId,
      from: 'Order Service',
      to: 'Payment Service',
      content: type.isSync ? 'POST /api/payments' : 'PaymentRequested Event',
      type: selectedType,
      status: 'sending'
    };
    setMessages([newMessage]);

    await new Promise(resolve => setTimeout(resolve, 800));

    // Step 2: Message in transit / queue
    setStep(2);
    setMessages(prev => prev.map(m => 
      m.id === msgId ? { ...m, status: 'delivered' as const } : m
    ));

    await new Promise(resolve => setTimeout(resolve, 600));

    // Step 3: Processing
    setStep(3);
    setMessages(prev => prev.map(m => 
      m.id === msgId ? { ...m, status: 'processing' as const } : m
    ));

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 4: Response (for sync) or Acknowledgment (for async)
    setStep(4);
    
    if (type.isSync) {
      // Sync: Add response message
      const responseId = `msg-${messageIdRef.current++}`;
      setMessages(prev => [
        ...prev.map(m => m.id === msgId ? { ...m, status: 'responded' as const } : m),
        {
          id: responseId,
          from: 'Payment Service',
          to: 'Order Service',
          content: '200 OK - Payment Confirmed',
          type: selectedType,
          status: 'delivered'
        }
      ]);
    } else {
      // Async: Just mark as delivered, no response needed
      setMessages(prev => prev.map(m => 
        m.id === msgId ? { ...m, status: 'responded' as const } : m
      ));
    }

    await new Promise(resolve => setTimeout(resolve, 500));
    setIsAnimating(false);
  };

  const isSync = communicationTypes[selectedType].isSync;

  return (
    <Card className="my-4 overflow-hidden bg-gray-950 border-gray-800">
      <CardHeader className="pb-2 flex flex-row items-center justify-between bg-gray-900/50">
        <CardTitle className="text-sm font-medium text-gray-200 flex items-center gap-2">
          <ArrowRightLeft className="h-4 w-4 text-blue-400" />
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
            <h4 className="font-medium text-gray-200 mb-2">📞 Phone vs Email Analogy</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-start gap-2">
                <Phone className="h-5 w-5 text-blue-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-blue-400 font-medium">Synchronous (Phone Call)</span>
                  <p className="text-gray-400">You call and wait for an answer. Both sides are engaged until done.</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Mail className="h-5 w-5 text-green-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-green-400 font-medium">Asynchronous (Email)</span>
                  <p className="text-gray-400">You send and continue working. Response comes later.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Communication Type Selector */}
        <div className="flex flex-wrap gap-2 mb-4">
          {Object.entries(communicationTypes).map(([key, type]) => {
            // In beginner mode, show only http and rabbitmq
            if (mode === 'beginner' && key !== 'http' && key !== 'rabbitmq') {
              return null;
            }
            return (
              <Button
                key={key}
                variant={selectedType === key ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setSelectedType(key as CommunicationType);
                  resetDemo();
                }}
                className={cn(
                  'text-xs',
                  selectedType === key && type.color
                )}
              >
                {type.icon}
                <span className="ml-1">{type.name}</span>
                <span className={cn(
                  'ml-2 text-[10px] px-1.5 py-0.5 rounded',
                  type.isSync ? 'bg-blue-900/50 text-blue-300' : 'bg-green-900/50 text-green-300'
                )}>
                  {type.isSync ? 'SYNC' : 'ASYNC'}
                </span>
              </Button>
            );
          })}
        </div>

        {/* Description */}
        <p className="text-sm text-gray-400 mb-4">
          {communicationTypes[selectedType].description}
        </p>

        {/* Visualization */}
        <div className="relative bg-gray-900/30 rounded-xl p-6 min-h-[200px]">
          {/* Services */}
          <div className="flex justify-between items-center">
            {/* Order Service */}
            <motion.div
              animate={step === 1 ? { scale: [1, 1.05, 1] } : {}}
              className="flex flex-col items-center"
            >
              <div className={cn(
                'w-20 h-20 rounded-xl border-2 flex flex-col items-center justify-center',
                'bg-purple-900/30 border-purple-500'
              )}>
                <Server className="h-6 w-6 text-purple-400" />
                <span className="text-xs text-purple-300 mt-1">Order</span>
              </div>
              {step >= 1 && isSync && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-2 flex items-center gap-1 text-xs text-yellow-400"
                >
                  <Clock className="h-3 w-3" />
                  <span>Waiting...</span>
                </motion.div>
              )}
              {step >= 1 && !isSync && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-2 flex items-center gap-1 text-xs text-green-400"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  <span>Continues work</span>
                </motion.div>
              )}
            </motion.div>

            {/* Communication Channel */}
            <div className="flex-1 mx-4 relative h-16">
              {/* Channel Line */}
              <div className={cn(
                'absolute top-1/2 left-0 right-0 h-1 -translate-y-1/2 rounded',
                isSync ? 'bg-blue-900/50' : 'bg-green-900/50'
              )} />

              {/* Message Broker (for async) */}
              {!isSync && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
                >
                  <div className={cn(
                    'w-12 h-12 rounded-lg border-2 flex items-center justify-center',
                    'bg-orange-900/50 border-orange-500'
                  )}>
                    <MessageSquare className="h-5 w-5 text-orange-400" />
                  </div>
                  <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-orange-400 whitespace-nowrap">
                    Message Queue
                  </span>
                </motion.div>
              )}

              {/* Animated Messages */}
              <AnimatePresence>
                {messages.map((msg, index) => (
                  <motion.div
                    key={msg.id}
                    initial={{ 
                      x: msg.from === 'Order Service' ? 0 : '100%',
                      opacity: 0 
                    }}
                    animate={{ 
                      x: msg.status === 'sending' 
                        ? '40%' 
                        : msg.from === 'Order Service' 
                          ? '90%' 
                          : '10%',
                      opacity: 1 
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className={cn(
                      'absolute top-1/2 -translate-y-1/2',
                      'px-2 py-1 rounded text-xs text-white flex items-center gap-1',
                      communicationTypes[msg.type].color,
                      index === 1 && 'top-[70%]'
                    )}
                  >
                    {msg.status === 'sending' && <Loader2 className="h-3 w-3 animate-spin" />}
                    {msg.status === 'delivered' && <ArrowRight className="h-3 w-3" />}
                    {msg.status === 'responded' && <CheckCircle2 className="h-3 w-3" />}
                    <span className="truncate max-w-[100px]">{msg.content}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Payment Service */}
            <motion.div
              animate={step >= 3 ? { scale: [1, 1.05, 1] } : {}}
              className="flex flex-col items-center"
            >
              <div className={cn(
                'w-20 h-20 rounded-xl border-2 flex flex-col items-center justify-center',
                'bg-orange-900/30 border-orange-500'
              )}>
                <Server className="h-6 w-6 text-orange-400" />
                <span className="text-xs text-orange-300 mt-1">Payment</span>
              </div>
              {step >= 3 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-2 flex items-center gap-1 text-xs text-blue-400"
                >
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Processing</span>
                </motion.div>
              )}
            </motion.div>
          </div>

          {/* Start Button */}
          <div className="flex justify-center mt-8">
            <Button
              onClick={simulateCommunication}
              disabled={isAnimating}
              className={cn(
                'px-6',
                isSync ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'
              )}
            >
              <Play className="h-4 w-4 mr-2" />
              Simulate {isSync ? 'Sync' : 'Async'} Call
            </Button>
          </div>
        </div>

        {/* Comparison Table (Intermediate+) */}
        {mode !== 'beginner' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 overflow-x-auto"
          >
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-2 px-3 text-gray-400">Aspect</th>
                  <th className="text-left py-2 px-3 text-blue-400">Synchronous</th>
                  <th className="text-left py-2 px-3 text-green-400">Asynchronous</th>
                </tr>
              </thead>
              <tbody className="text-gray-300">
                <tr className="border-b border-gray-800">
                  <td className="py-2 px-3 text-gray-400">Coupling</td>
                  <td className="py-2 px-3">Tight - services must be available</td>
                  <td className="py-2 px-3">Loose - fire and forget</td>
                </tr>
                <tr className="border-b border-gray-800">
                  <td className="py-2 px-3 text-gray-400">Latency</td>
                  <td className="py-2 px-3">Caller waits for response</td>
                  <td className="py-2 px-3">Caller continues immediately</td>
                </tr>
                <tr className="border-b border-gray-800">
                  <td className="py-2 px-3 text-gray-400">Reliability</td>
                  <td className="py-2 px-3">Depends on network</td>
                  <td className="py-2 px-3">Queue provides durability</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-gray-400">Use Case</td>
                  <td className="py-2 px-3">Real-time queries, validation</td>
                  <td className="py-2 px-3">Background jobs, notifications</td>
                </tr>
              </tbody>
            </table>
          </motion.div>
        )}

        {/* Advanced: Code Examples */}
        {mode === 'advanced' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div className="bg-gray-900 rounded-lg p-3 font-mono text-xs">
              <div className="text-blue-400 mb-2">{"//"} HTTP REST Call</div>
              <pre className="text-gray-300 overflow-x-auto">
{`var response = await _httpClient
  .PostAsJsonAsync(
    "api/payments",
    new PaymentRequest { 
      OrderId = orderId 
    });`}
              </pre>
            </div>
            <div className="bg-gray-900 rounded-lg p-3 font-mono text-xs">
              <div className="text-green-400 mb-2">{"//"} Event Publishing</div>
              <pre className="text-gray-300 overflow-x-auto">
{`await _eventBus.PublishAsync(
  new OrderCreatedEvent {
    OrderId = orderId,
    Amount = total
  });`}
              </pre>
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}

export default ServiceCommunicationDemo;
