'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Database, Code, ArrowRight, Table, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface DapperQueryVisualizerProps {
  initialQuery?: string;
  showSteps?: boolean;
}

const sampleData = {
  products: [
    { id: 1, name: 'Laptop', categoryId: 1, price: 999.99, stock: 15 },
    { id: 2, name: 'Mouse', categoryId: 2, price: 29.99, stock: 50 },
    { id: 3, name: 'Keyboard', categoryId: 2, price: 79.99, stock: 30 },
    { id: 4, name: 'Monitor', categoryId: 1, price: 299.99, stock: 20 },
  ],
  customers: [
    { id: 1, name: 'Alice Johnson', email: 'alice@example.com', region: 'North' },
    { id: 2, name: 'Bob Smith', email: 'bob@example.com', region: 'South' },
    { id: 3, name: 'Carol Williams', email: 'carol@example.com', region: 'North' },
  ],
};

const queryExamples = [
  {
    name: 'Simple Query',
    sql: 'SELECT * FROM Products WHERE CategoryId = @categoryId',
    params: '{ categoryId = 1 }',
    code: 'var products = connection.Query<Product>(sql, new { categoryId = 1 });',
    resultCount: 2,
  },
  {
    name: 'Query Single',
    sql: 'SELECT * FROM Customers WHERE Id = @id',
    params: '{ id = 1 }',
    code: 'var customer = connection.QuerySingle<Customer>(sql, new { id = 1 });',
    resultCount: 1,
  },
  {
    name: 'Query First',
    sql: 'SELECT * FROM Products ORDER BY Price DESC',
    params: 'null',
    code: 'var product = connection.QueryFirst<Product>(sql);',
    resultCount: 1,
  },
];

export function DapperQueryVisualizer({ initialQuery, showSteps = true }: DapperQueryVisualizerProps) {
  const [selectedExample, setSelectedExample] = useState(0);
  const [step, setStep] = useState(0);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const currentExample = queryExamples[selectedExample];

  const steps = [
    { title: 'Define SQL Query', icon: Code, color: 'text-blue-500' },
    { title: 'Create Parameters', icon: Database, color: 'text-purple-500' },
    { title: 'Execute Query', icon: Play, color: 'text-green-500' },
    { title: 'Map to Objects', icon: Table, color: 'text-orange-500' },
  ];

  const executeQuery = async () => {
    setIsExecuting(true);
    setShowResult(false);
    
    for (let i = 0; i <= 3; i++) {
      setStep(i);
      await new Promise(resolve => setTimeout(resolve, 800));
    }
    
    setShowResult(true);
    setIsExecuting(false);
  };

  const resetDemo = () => {
    setStep(0);
    setShowResult(false);
    setIsExecuting(false);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          Dapper Query Visualizer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Example Selection */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Select Query Example:</label>
          <Tabs value={selectedExample.toString()} onValueChange={(v) => { setSelectedExample(parseInt(v)); resetDemo(); }}>
            <TabsList className="grid w-full grid-cols-3">
              {queryExamples.map((example, idx) => (
                <TabsTrigger key={idx} value={idx.toString()}>
                  {example.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Code Display */}
        <div className="bg-slate-900 text-slate-50 p-4 rounded-lg font-mono text-sm">
          <div className="text-green-400 mb-2">{"//"} C# with Dapper</div>
          <div className="text-yellow-300">var sql = <span className="text-orange-300">&quot;{currentExample.sql}&quot;</span>;</div>
          <div className="text-cyan-300 mt-2">{currentExample.code}</div>
        </div>

        {/* Execution Steps */}
        {showSteps && (
          <div className="grid grid-cols-4 gap-2">
            {steps.map((s, idx) => {
              const Icon = s.icon;
              const isActive = step >= idx;
              const isCurrent = step === idx && isExecuting;
              
              return (
                <motion.div
                  key={idx}
                  className={`p-3 rounded-lg border-2 text-center transition-all ${
                    isActive
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-muted/30'
                  }`}
                  animate={{
                    scale: isCurrent ? [1, 1.05, 1] : 1,
                  }}
                  transition={{
                    repeat: isCurrent ? Infinity : 0,
                    duration: 0.8,
                  }}
                >
                  <Icon className={`w-6 h-6 mx-auto mb-2 ${isActive ? s.color : 'text-muted-foreground'}`} />
                  <div className="text-xs font-medium">{s.title}</div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* SQL & Parameters Display */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="text-sm font-semibold flex items-center gap-2">
              <Code className="w-4 h-4" />
              SQL Query
            </div>
            <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded border border-blue-200 dark:border-blue-800 font-mono text-xs">
              {currentExample.sql}
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="text-sm font-semibold flex items-center gap-2">
              <Database className="w-4 h-4" />
              Parameters
            </div>
            <div className="bg-purple-50 dark:bg-purple-950 p-3 rounded border border-purple-200 dark:border-purple-800 font-mono text-xs">
              {currentExample.params}
            </div>
          </div>
        </div>

        {/* Result Display */}
        <AnimatePresence>
          {showResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-2"
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-green-600 dark:text-green-400">
                <CheckCircle2 className="w-4 h-4" />
                Query Result ({currentExample.resultCount} {currentExample.resultCount === 1 ? 'row' : 'rows'})
              </div>
              <div className="bg-green-50 dark:bg-green-950 p-4 rounded border border-green-200 dark:border-green-800">
                <div className="font-mono text-xs">
                  {selectedExample === 0 && (
                    <div className="space-y-2">
                      {sampleData.products.filter(p => p.categoryId === 1).map(p => (
                        <div key={p.id} className="bg-white dark:bg-slate-900 p-2 rounded">
                          Id: {p.id}, Name: &quot;{p.name}&quot;, Price: ${p.price}
                        </div>
                      ))}
                    </div>
                  )}
                  {selectedExample === 1 && (
                    <div className="bg-white dark:bg-slate-900 p-2 rounded">
                      Id: {sampleData.customers[0].id}, Name: &quot;{sampleData.customers[0].name}&quot;, Email: &quot;{sampleData.customers[0].email}&quot;
                    </div>
                  )}
                  {selectedExample === 2 && (
                    <div className="bg-white dark:bg-slate-900 p-2 rounded">
                      Id: {sampleData.products[0].id}, Name: &quot;{sampleData.products[0].name}&quot;, Price: ${sampleData.products[0].price}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={executeQuery}
            disabled={isExecuting}
            className="flex-1"
          >
            {isExecuting ? (
              <>Running Query...</>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Execute Query
              </>
            )}
          </Button>
          {showResult && (
            <Button variant="outline" onClick={resetDemo}>
              Reset
            </Button>
          )}
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex gap-2 text-sm">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900 dark:text-blue-100 mb-1">How Dapper Works</p>
              <p className="text-blue-800 dark:text-blue-200 text-xs">
                Dapper extends IDbConnection with methods like Query&lt;T&gt;() that execute SQL and automatically map the results to your C# objects. It&apos;s simple, fast, and requires minimal code!
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
