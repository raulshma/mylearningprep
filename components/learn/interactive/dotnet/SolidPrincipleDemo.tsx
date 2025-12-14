'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type SolidPrinciple = 'S' | 'O' | 'L' | 'I' | 'D';

export interface CodeComparison {
  bad: string;
  good: string;
  explanation: string;
}

export interface SolidPrincipleDemoProps {
  principle?: SolidPrinciple;
  mode?: 'beginner' | 'intermediate' | 'advanced';
}

const principleInfo: Record<SolidPrinciple, {
  name: string;
  full: string;
  analogy: string;
  code: CodeComparison;
}> = {
  S: {
    name: 'Single Responsibility',
    full: 'A class should have only one reason to change',
    analogy: '🔧 Like a Swiss Army knife vs. a dedicated tool. A chef uses a professional knife, not a Swiss Army knife!',
    code: {
      bad: `class UserService {
  void CreateUser() { ... }
  void SendEmail() { ... }  // ❌ Not its job!
  void GenerateReport() { ... }  // ❌ Wrong place!
}`,
      good: `class UserService { void CreateUser() { ... } }
class EmailService { void SendEmail() { ... } }
class ReportService { void GenerateReport() { ... } }`,
      explanation: 'Each class has ONE job. UserService only handles users.',
    },
  },
  O: {
    name: 'Open/Closed',
    full: 'Open for extension, closed for modification',
    analogy: '🔌 Like a power strip - you can plug in new devices without rewiring the house!',
    code: {
      bad: `class PaymentProcessor {
  void Process(string type) {
    if (type == "credit") { ... }
    else if (type == "paypal") { ... }
    // ❌ Must modify to add new types!
  }
}`,
      good: `interface IPaymentMethod { void Pay(); }
class CreditCard : IPaymentMethod { ... }
class PayPal : IPaymentMethod { ... }
// ✅ Add new payment without changing processor!`,
      explanation: 'Add new payment methods without touching existing code.',
    },
  },
  L: {
    name: 'Liskov Substitution',
    full: 'Subtypes must be substitutable for their base types',
    analogy: '🦆 If it looks like a duck and quacks like a duck, it should swim like a duck!',
    code: {
      bad: `class Bird { virtual void Fly() { ... } }
class Penguin : Bird { 
  override void Fly() { 
    throw new Exception(); // ❌ Penguins can't fly!
  }
}`,
      good: `class Bird { virtual void Move() { ... } }
class FlyingBird : Bird { void Fly() { ... } }
class Penguin : Bird { 
  override void Move() { Swim(); } // ✅ Penguins swim!
}`,
      explanation: 'Child classes should work wherever parent is expected.',
    },
  },
  I: {
    name: 'Interface Segregation',
    full: 'No client should be forced to depend on methods it does not use',
    analogy: '📺 Like a TV remote with 100 buttons when you only use 5 - make smaller, focused remotes!',
    code: {
      bad: `interface IWorker {
  void Work();
  void Eat();
  void Sleep();
}
class Robot : IWorker { 
  void Eat() { /* ❌ Robots don't eat! */ }
}`,
      good: `interface IWorkable { void Work(); }
interface IFeedable { void Eat(); }
class Human : IWorkable, IFeedable { ... }
class Robot : IWorkable { ... } // ✅ Only what it needs!`,
      explanation: 'Many small interfaces are better than one large interface.',
    },
  },
  D: {
    name: 'Dependency Inversion',
    full: 'Depend on abstractions, not concretions',
    analogy: '🔌 Like plugging into a wall outlet instead of wiring directly to the power plant!',
    code: {
      bad: `class OrderService {
  SqlDatabase db = new SqlDatabase(); // ❌ Tight coupling!
  void SaveOrder() { db.Save(); }
}`,
      good: `class OrderService {
  IDatabase db; // ✅ Abstraction!
  OrderService(IDatabase database) { db = database; }
  void SaveOrder() { db.Save(); }
}`,
      explanation: 'Depend on interfaces, inject concrete implementations.',
    },
  },
};

export function SolidPrincipleDemo({
  principle = 'S',
  mode = 'beginner',
}: SolidPrincipleDemoProps) {
  const [currentPrinciple, setCurrentPrinciple] = useState<SolidPrinciple>(principle);
  const [showGood, setShowGood] = useState(false);

  const info = principleInfo[currentPrinciple];

  return (
    <Card className="my-4 overflow-hidden bg-gray-950 border-gray-800">
      <CardHeader className="pb-2 bg-gray-900/50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-gray-200">
            SOLID Principles
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowGood(false)}
            className="text-gray-400 hover:text-white"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Principle Selector */}
        <div className="flex gap-1 mt-2">
          {(['S', 'O', 'L', 'I', 'D'] as SolidPrinciple[]).map((p) => (
            <Button
              key={p}
              variant="ghost"
              size="sm"
              onClick={() => {
                setCurrentPrinciple(p);
                setShowGood(false);
              }}
              className={cn(
                'w-8 h-8 p-0 font-bold',
                currentPrinciple === p
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white'
              )}
            >
              {p}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {/* Principle Info */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-purple-400 mb-1">
            {info.name} Principle
          </h3>
          <p className="text-sm text-gray-400 italic mb-2">&quot;{info.full}&quot;</p>
          
          {mode === 'beginner' && (
            <div className="bg-gray-900/50 rounded-lg p-3 text-sm text-gray-300">
              {info.analogy}
            </div>
          )}
        </div>

        {/* Code Comparison */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Bad Example */}
          <motion.div
            className={cn(
              'rounded-lg border-2 overflow-hidden transition-all duration-300',
              showGood ? 'border-gray-700 opacity-50' : 'border-red-500/50'
            )}
          >
            <div className="bg-red-900/20 px-3 py-2 flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-400" />
              <span className="text-sm font-medium text-red-400">Before (Bad)</span>
            </div>
            <pre className="p-3 text-xs font-mono text-gray-300 bg-gray-900/50 overflow-x-auto">
              {info.code.bad}
            </pre>
          </motion.div>

          {/* Good Example */}
          <motion.div
            className={cn(
              'rounded-lg border-2 overflow-hidden transition-all duration-300',
              showGood ? 'border-green-500/50' : 'border-gray-700'
            )}
            animate={showGood ? { scale: [1, 1.02, 1] } : {}}
          >
            <div className="bg-green-900/20 px-3 py-2 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <span className="text-sm font-medium text-green-400">After (Good)</span>
            </div>
            <pre className="p-3 text-xs font-mono text-gray-300 bg-gray-900/50 overflow-x-auto">
              {info.code.good}
            </pre>
          </motion.div>
        </div>

        {/* Toggle Button */}
        <div className="mt-4 text-center">
          <Button
            onClick={() => setShowGood(!showGood)}
            className={cn(
              'transition-all',
              showGood ? 'bg-green-600 hover:bg-green-700' : 'bg-purple-600 hover:bg-purple-700'
            )}
          >
            <Play className="h-4 w-4 mr-2" />
            {showGood ? 'View Problem' : 'Show Solution'}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>

        {/* Explanation */}
        <AnimatePresence>
          {showGood && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-4 p-3 bg-green-900/20 border border-green-700 rounded-lg"
            >
              <p className="text-sm text-green-300">
                ✅ {info.code.explanation}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

export default SolidPrincipleDemo;
