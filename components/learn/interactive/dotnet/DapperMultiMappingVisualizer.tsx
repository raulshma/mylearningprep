'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, Users, ShoppingCart, ArrowRight, Link2, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function DapperMultiMappingVisualizer() {
  const [step, setStep] = useState(0);
  const [showResult, setShowResult] = useState(false);

  const runDemo = async () => {
    setShowResult(false);
    for (let i = 0; i <= 4; i++) {
      setStep(i);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    setShowResult(true);
  };

  const reset = () => {
    setStep(0);
    setShowResult(false);
  };

  const orderData = {
    orderId: 1001,
    orderDate: '2024-12-15',
    total: 129.97,
  };

  const customerData = {
    customerId: 42,
    name: 'Alice Johnson',
    email: 'alice@example.com',
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="w-5 h-5" />
          Dapper Multi-Mapping
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* SQL Query */}
        <div className="bg-slate-900 text-slate-50 p-4 rounded-lg font-mono text-sm">
          <div className="text-green-400 mb-2">{"//"} SQL with JOIN</div>
          <div className="text-yellow-300">var sql = <span className="text-orange-300">@&quot;</span></div>
          <div className="ml-4 text-cyan-300">SELECT o.*, c.*</div>
          <div className="ml-4 text-cyan-300">FROM Orders o</div>
          <div className="ml-4 text-cyan-300">INNER JOIN Customers c ON c.Id = o.CustomerId</div>
          <div className="ml-4 text-cyan-300">WHERE o.Id = @orderId</div>
          <div className="text-yellow-300"><span className="text-orange-300">&quot;</span>;</div>
          
          <div className="text-purple-400 mt-4">{"//"} Multi-mapping to combine objects</div>
          <div className="text-cyan-300">var orders = connection.Query&lt;Order, Customer, Order&gt;(</div>
          <div className="ml-4 text-yellow-300">sql,</div>
          <div className="ml-4 text-green-300">(order, customer) =&gt; {'{'}</div>
          <div className="ml-8 text-cyan-300">order.Customer = customer;</div>
          <div className="ml-8 text-cyan-300">return order;</div>
          <div className="ml-4 text-green-300">{'}'},</div>
          <div className="ml-4 text-yellow-300">new {'{'} orderId = 1001 {'}'},</div>
          <div className="ml-4 text-yellow-300">splitOn: &quot;Id&quot;</div>
          <div className="text-cyan-300">);</div>
        </div>

        {/* Visualization */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Mapping Process:</div>
            <div className="text-xs text-muted-foreground">Step {step}/4</div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Order Object */}
            <motion.div
              className={`p-4 rounded-lg border-2 ${
                step >= 1 ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'border-border bg-muted/30'
              }`}
              animate={{ scale: step === 1 ? [1, 1.05, 1] : 1 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-center gap-2 mb-3">
                <ShoppingCart className="w-5 h-5 text-blue-600" />
                <span className="font-semibold">Order Object</span>
              </div>
              <div className="space-y-1 font-mono text-xs">
                <div>OrderId: <span className="text-blue-600">{orderData.orderId}</span></div>
                <div>OrderDate: <span className="text-blue-600">{orderData.orderDate}</span></div>
                <div>Total: <span className="text-blue-600">${orderData.total}</span></div>
                {step >= 3 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="pt-2 border-t border-blue-300 dark:border-blue-700"
                  >
                    <div className="text-purple-600 font-semibold">Customer: →</div>
                  </motion.div>
                )}
              </div>
            </motion.div>

            {/* Customer Object */}
            <motion.div
              className={`p-4 rounded-lg border-2 ${
                step >= 2 ? 'border-purple-500 bg-purple-50 dark:bg-purple-950' : 'border-border bg-muted/30'
              }`}
              animate={{ scale: step === 2 ? [1, 1.05, 1] : 1 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-5 h-5 text-purple-600" />
                <span className="font-semibold">Customer Object</span>
              </div>
              <div className="space-y-1 font-mono text-xs">
                <div>CustomerId: <span className="text-purple-600">{customerData.customerId}</span></div>
                <div>Name: <span className="text-purple-600">{customerData.name}</span></div>
                <div>Email: <span className="text-purple-600">{customerData.email}</span></div>
              </div>
            </motion.div>
          </div>

          {/* Mapping Arrow */}
          <AnimatePresence>
            {step >= 3 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center justify-center"
              >
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-semibold">
                  <ArrowRight className="w-6 h-6" />
                  <span>Mapping Function Combines Objects</span>
                  <ArrowRight className="w-6 h-6" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Combined Result */}
          <AnimatePresence>
            {step >= 4 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-lg border-2 border-green-500 bg-green-50 dark:bg-green-950"
              >
                <div className="flex items-center gap-2 mb-3 text-green-700 dark:text-green-300">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-semibold">Combined Order with Customer</span>
                </div>
                <div className="font-mono text-xs space-y-2">
                  <div className="bg-white dark:bg-slate-900 p-3 rounded">
                    <div className="text-blue-600 font-semibold mb-2">Order Properties:</div>
                    <div>OrderId: {orderData.orderId}</div>
                    <div>OrderDate: {orderData.orderDate}</div>
                    <div>Total: ${orderData.total}</div>
                    
                    <div className="text-purple-600 font-semibold mt-3 mb-2">Nested Customer:</div>
                    <div className="ml-4">CustomerId: {customerData.customerId}</div>
                    <div className="ml-4">Name: {customerData.name}</div>
                    <div className="ml-4">Email: {customerData.email}</div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* splitOn Explanation */}
        {step >= 3 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800"
          >
            <div className="font-semibold text-sm text-yellow-900 dark:text-yellow-100 mb-2">
              Understanding &quot;splitOn&quot;
            </div>
            <div className="text-xs text-yellow-800 dark:text-yellow-200">
              The <code className="bg-yellow-200 dark:bg-yellow-900 px-1 rounded">splitOn: &quot;Id&quot;</code> parameter tells Dapper where to split the columns. 
              Columns before the split go to the first object (Order), and columns after go to the second object (Customer).
            </div>
          </motion.div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button onClick={runDemo} disabled={step > 0 && step < 4} className="flex-1">
            {step > 0 && step < 4 ? 'Running...' : 'Run Multi-Mapping Demo'}
          </Button>
          {showResult && (
            <Button variant="outline" onClick={reset}>
              Reset
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
