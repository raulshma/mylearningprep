'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Database, Edit3, Trash2, Plus, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const commandExamples = [
  {
    name: 'INSERT',
    icon: Plus,
    sql: 'INSERT INTO Products (Name, Price, Stock) VALUES (@name, @price, @stock)',
    params: '{ name = "Tablet", price = 499.99, stock = 25 }',
    code: 'var rowsAffected = connection.Execute(sql, new { name = "Tablet", price = 499.99, stock = 25 });',
    color: 'green',
    affectedRows: 1,
  },
  {
    name: 'UPDATE',
    icon: Edit3,
    sql: 'UPDATE Products SET Price = @price WHERE Id = @id',
    params: '{ id = 1, price = 899.99 }',
    code: 'var rowsAffected = connection.Execute(sql, new { id = 1, price = 899.99 });',
    color: 'blue',
    affectedRows: 1,
  },
  {
    name: 'DELETE',
    icon: Trash2,
    sql: 'DELETE FROM Products WHERE Stock = 0',
    params: 'null',
    code: 'var rowsAffected = connection.Execute(sql);',
    color: 'red',
    affectedRows: 3,
  },
  {
    name: 'Bulk INSERT',
    icon: Database,
    sql: 'INSERT INTO Products (Name, Price) VALUES (@name, @price)',
    params: 'List<Product> products',
    code: 'var rowsAffected = connection.Execute(sql, products);',
    color: 'purple',
    affectedRows: 5,
  },
];

export function DapperCommandVisualizer() {
  const [selectedExample, setSelectedExample] = useState(0);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const currentExample = commandExamples[selectedExample];
  const Icon = currentExample.icon;

  const executeCommand = async () => {
    setIsExecuting(true);
    setShowResult(false);
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setShowResult(true);
    setIsExecuting(false);
  };

  const resetDemo = () => {
    setShowResult(false);
    setIsExecuting(false);
  };

  const getColorClasses = (color: string) => {
    const colors = {
      green: {
        border: 'border-green-500',
        bg: 'bg-green-50 dark:bg-green-950',
        text: 'text-green-600 dark:text-green-400',
        icon: 'text-green-600',
      },
      blue: {
        border: 'border-blue-500',
        bg: 'bg-blue-50 dark:bg-blue-950',
        text: 'text-blue-600 dark:text-blue-400',
        icon: 'text-blue-600',
      },
      red: {
        border: 'border-red-500',
        bg: 'bg-red-50 dark:bg-red-950',
        text: 'text-red-600 dark:text-red-400',
        icon: 'text-red-600',
      },
      purple: {
        border: 'border-purple-500',
        bg: 'bg-purple-50 dark:bg-purple-950',
        text: 'text-purple-600 dark:text-purple-400',
        icon: 'text-purple-600',
      },
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  const colorClasses = getColorClasses(currentExample.color);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          Dapper Execute Commands
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Command Type Selection */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Select Command Type:</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {commandExamples.map((example, idx) => {
              const ExIcon = example.icon;
              const isSelected = selectedExample === idx;
              return (
                <Button
                  key={idx}
                  variant={isSelected ? 'default' : 'outline'}
                  onClick={() => { setSelectedExample(idx); resetDemo(); }}
                  className="flex items-center gap-2"
                >
                  <ExIcon className="w-4 h-4" />
                  {example.name}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Code Display */}
        <div className="bg-slate-900 text-slate-50 p-4 rounded-lg font-mono text-sm">
          <div className="text-green-400 mb-2">{"//"} Execute {currentExample.name} Command</div>
          <div className="text-yellow-300">var sql = <span className="text-orange-300">&quot;{currentExample.sql}&quot;</span>;</div>
          <div className="text-cyan-300 mt-2">{currentExample.code}</div>
          <div className="text-gray-400 mt-3">{"//"} Returns the number of affected rows</div>
        </div>

        {/* SQL & Parameters Display */}
        <div className={`p-4 rounded-lg border-2 ${colorClasses.border} ${colorClasses.bg}`}>
          <div className="flex items-center gap-2 mb-3">
            <Icon className={`w-5 h-5 ${colorClasses.icon}`} />
            <span className="font-semibold">{currentExample.name} Operation</span>
          </div>
          
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-muted-foreground">SQL Statement:</div>
              <div className="bg-white dark:bg-slate-900 p-2 rounded font-mono text-xs">
                {currentExample.sql}
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="text-xs font-semibold text-muted-foreground">Parameters:</div>
              <div className="bg-white dark:bg-slate-900 p-2 rounded font-mono text-xs">
                {currentExample.params}
              </div>
            </div>
          </div>
        </div>

        {/* Execution Animation */}
        <AnimatePresence>
          {isExecuting && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center gap-3 p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <Database className="w-6 h-6 text-yellow-600" />
              </motion.div>
              <span className="font-semibold text-yellow-800 dark:text-yellow-200">
                Executing {currentExample.name} command...
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Result Display */}
        <AnimatePresence>
          {showResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-3"
            >
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-semibold">
                <CheckCircle2 className="w-5 h-5" />
                Command Executed Successfully
              </div>
              
              <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center justify-between">
                  <div className="font-mono text-sm">
                    <span className="text-muted-foreground">Rows Affected:</span>
                    <span className="ml-2 text-green-600 dark:text-green-400 font-bold text-lg">
                      {currentExample.affectedRows}
                    </span>
                  </div>
                  <div className={`px-3 py-1 rounded-full ${colorClasses.bg} border ${colorClasses.border}`}>
                    <span className={`text-xs font-semibold ${colorClasses.text}`}>
                      {currentExample.name}
                    </span>
                  </div>
                </div>
              </div>

              {/* Additional Info for Bulk Operations */}
              {currentExample.name === 'Bulk INSERT' && (
                <div className="bg-purple-50 dark:bg-purple-950 p-3 rounded border border-purple-200 dark:border-purple-800 text-xs">
                  <div className="font-semibold text-purple-900 dark:text-purple-100 mb-1">
                    💡 Bulk Operations Tip
                  </div>
                  <div className="text-purple-800 dark:text-purple-200">
                    Pass an IEnumerable to Execute() to run the same command for multiple records efficiently!
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={executeCommand}
            disabled={isExecuting}
            className="flex-1"
          >
            {isExecuting ? (
              <>Executing...</>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Execute Command
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
          <div className="text-sm space-y-2">
            <p className="font-semibold text-blue-900 dark:text-blue-100">Execute() Method</p>
            <ul className="text-blue-800 dark:text-blue-200 text-xs space-y-1 list-disc list-inside">
              <li>Returns the number of rows affected by the command</li>
              <li>Used for INSERT, UPDATE, DELETE operations</li>
              <li>Supports parameterized queries to prevent SQL injection</li>
              <li>Can execute the same command for multiple objects (bulk operations)</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
