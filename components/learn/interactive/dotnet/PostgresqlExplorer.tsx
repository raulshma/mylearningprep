'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database, 
  Terminal, 
  Code, 
  Settings, 
  Play, 
  RotateCcw,
  Package,
  Braces,
  List,
  Copy,
  Check,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface PostgresqlExplorerProps {
  mode?: 'beginner' | 'intermediate' | 'advanced';
  title?: string;
}

interface DataTypeCategory {
  name: string;
  types: { name: string; description: string; example: string; isUnique?: boolean }[];
}

const postgresDataTypes: DataTypeCategory[] = [
  {
    name: 'Numeric',
    types: [
      { name: 'integer / int', description: 'Standard 32-bit integer', example: '42' },
      { name: 'bigint', description: '64-bit integer for large numbers', example: '9223372036854775807' },
      { name: 'serial', description: 'Auto-incrementing integer', example: 'CREATE TABLE t(id SERIAL)' },
      { name: 'numeric(p,s)', description: 'Exact precision decimal', example: 'numeric(10,2)' },
    ],
  },
  {
    name: 'Text',
    types: [
      { name: 'text', description: 'Unlimited length string', example: "'Any length text'" },
      { name: 'varchar(n)', description: 'Variable-length with limit', example: "varchar(255)" },
      { name: 'char(n)', description: 'Fixed-length padded', example: "char(3) for 'USA'" },
    ],
  },
  {
    name: 'Date & Time',
    types: [
      { name: 'timestamp', description: 'Date and time', example: "'2024-01-15 10:30:00'" },
      { name: 'timestamptz', description: 'Timestamp with timezone', example: "'2024-01-15 10:30:00+05:30'", isUnique: true },
      { name: 'date', description: 'Date only', example: "'2024-01-15'" },
      { name: 'interval', description: 'Time span', example: "'2 hours 30 minutes'", isUnique: true },
    ],
  },
  {
    name: 'PostgreSQL Special ✨',
    types: [
      { name: 'jsonb', description: 'Binary JSON - fast queries', example: '\'{"name": "John"}\'::jsonb', isUnique: true },
      { name: 'uuid', description: 'Universally unique identifier', example: 'gen_random_uuid()' },
      { name: 'array', description: 'Array of any type', example: "'{1,2,3}'::int[]", isUnique: true },
      { name: 'hstore', description: 'Key-value pairs', example: '"key"=>"value"', isUnique: true },
      { name: 'inet / cidr', description: 'IP addresses and networks', example: "'192.168.1.1/24'", isUnique: true },
      { name: 'tsvector', description: 'Full-text search vector', example: "to_tsvector('english', 'text')", isUnique: true },
    ],
  },
];

const psqlCommands = [
  { cmd: '\\l', desc: 'List all databases' },
  { cmd: '\\c dbname', desc: 'Connect to database' },
  { cmd: '\\dt', desc: 'List all tables' },
  { cmd: '\\d tablename', desc: 'Describe table structure' },
  { cmd: '\\di', desc: 'List all indexes' },
  { cmd: '\\df', desc: 'List all functions' },
  { cmd: '\\x', desc: 'Toggle expanded display' },
  { cmd: '\\timing', desc: 'Toggle query timing' },
  { cmd: '\\q', desc: 'Quit psql' },
];

const extensions = [
  { name: 'pg_trgm', desc: 'Trigram matching for text similarity', example: "SELECT similarity('word', 'work');" },
  { name: 'uuid-ossp', desc: 'UUID generation functions', example: 'SELECT uuid_generate_v4();' },
  { name: 'postgis', desc: 'Geographic/spatial data support', example: "ST_Distance(geom1, geom2)" },
  { name: 'hstore', desc: 'Key-value store data type', example: "'a=>1,b=>2'::hstore" },
  { name: 'pg_stat_statements', desc: 'Query performance tracking', example: 'View slow queries' },
];

const connectionString = `Host=localhost;Port=5432;Database=mydb;
Username=postgres;Password=mypassword`;

const npgsqlConnectionString = `Host=localhost;Port=5432;Database=mydb;
Username=postgres;Password=mypassword;
Pooling=true;MinPoolSize=5;MaxPoolSize=100`;

export function PostgresqlExplorer({
  mode = 'beginner',
  title = 'PostgreSQL Explorer',
}: PostgresqlExplorerProps) {
  const [activeTab, setActiveTab] = useState<'datatypes' | 'psql' | 'extensions' | 'connection'>('datatypes');
  const [terminalLines, setTerminalLines] = useState<string[]>([
    'postgres@localhost:~$ psql -U postgres -d mydb',
    'psql (16.1)',
    'Type "help" for help.',
    '',
    'mydb=# ',
  ]);
  const [currentInput, setCurrentInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedString, setCopiedString] = useState(false);
  const [selectedExtension, setSelectedExtension] = useState<typeof extensions[0] | null>(null);

  const executeCommand = useCallback(async () => {
    if (!currentInput.trim()) return;
    
    setIsProcessing(true);
    setTerminalLines(prev => [...prev.slice(0, -1), `mydb=# ${currentInput}`]);
    
    await new Promise(resolve => setTimeout(resolve, 400));
    
    // Simulate responses
    let response: string[] = [];
    const cmd = currentInput.toLowerCase().trim();
    
    if (cmd === '\\dt') {
      response = [
        '          List of relations',
        ' Schema |   Name   | Type  | Owner',
        '--------+----------+-------+----------',
        ' public | users    | table | postgres',
        ' public | orders   | table | postgres',
        ' public | products | table | postgres',
        '(3 rows)',
      ];
    } else if (cmd === '\\l') {
      response = [
        '                              List of databases',
        '   Name   | Owner    | Encoding | Collate     | Ctype',
        '----------+----------+----------+-------------+-------------',
        ' mydb     | postgres | UTF8     | en_US.UTF-8 | en_US.UTF-8',
        ' postgres | postgres | UTF8     | en_US.UTF-8 | en_US.UTF-8',
        '(2 rows)',
      ];
    } else if (cmd.startsWith('select')) {
      response = [
        ' id |    name     |       email',
        '----+-------------+--------------------',
        '  1 | Alice       | alice@example.com',
        '  2 | Bob         | bob@example.com',
        '(2 rows)',
        '',
        'Time: 1.234 ms',
      ];
    } else if (cmd === '\\x') {
      response = ['Expanded display is on.'];
    } else {
      response = [`ERROR: unrecognized command "${currentInput}"`];
    }
    
    setTerminalLines(prev => [...prev, ...response, '', 'mydb=# ']);
    setCurrentInput('');
    setIsProcessing(false);
  }, [currentInput]);

  const copyConnectionString = useCallback(async (str: string) => {
    await navigator.clipboard.writeText(str);
    setCopiedString(true);
    setTimeout(() => setCopiedString(false), 2000);
  }, []);

  const reset = useCallback(() => {
    setTerminalLines([
      'postgres@localhost:~$ psql -U postgres -d mydb',
      'psql (16.1)',
      'Type "help" for help.',
      '',
      'mydb=# ',
    ]);
    setCurrentInput('');
    setSelectedExtension(null);
  }, []);

  return (
    <Card className="my-4 overflow-hidden bg-gray-950 border-gray-800">
      <CardHeader className="pb-2 flex flex-row items-center justify-between bg-gray-900/50">
        <CardTitle className="text-sm font-medium text-gray-200 flex items-center gap-2">
          <Database className="h-4 w-4 text-blue-400" />
          {title}
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={reset} className="text-gray-400 hover:text-white">
          <RotateCcw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* Beginner Analogy */}
        {mode === 'beginner' && (
          <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
            <h4 className="font-medium text-blue-300 mb-2">🐘 PostgreSQL - The Swiss Army Knife of Databases</h4>
            <p className="text-sm text-gray-400">
              PostgreSQL (often called &quot;Postgres&quot;) is like a Swiss Army knife - it has tools for everything! 
              Unlike other databases, it can store JSON like MongoDB, handle geographic data like a GIS system, 
              and still be a powerful relational database.
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-gray-800 pb-2">
          {[
            { id: 'datatypes', label: 'Data Types', icon: <Braces className="h-3 w-3" /> },
            { id: 'psql', label: 'psql Terminal', icon: <Terminal className="h-3 w-3" /> },
            { id: 'extensions', label: 'Extensions', icon: <Package className="h-3 w-3" /> },
            { id: 'connection', label: '.NET Connection', icon: <Code className="h-3 w-3" /> },
          ].map(tab => (
            <Button
              key={tab.id}
              size="sm"
              variant={activeTab === tab.id ? 'default' : 'ghost'}
              className={cn(
                'text-xs flex items-center gap-1',
                activeTab === tab.id && 'bg-blue-800'
              )}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
            >
              {tab.icon}
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Data Types Tab */}
        {activeTab === 'datatypes' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              PostgreSQL offers unique data types you won&apos;t find in other databases:
            </p>
            {postgresDataTypes.map(category => (
              <div key={category.name} className="space-y-2">
                <h4 className="text-sm font-medium text-gray-300">{category.name}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {category.types.map(dt => (
                    <div 
                      key={dt.name} 
                      className={cn(
                        'p-2 bg-gray-900 rounded-lg border',
                        dt.isUnique ? 'border-blue-600' : 'border-gray-700'
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-cyan-400">{dt.name}</span>
                        {dt.isUnique && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-blue-900 text-blue-300 rounded">
                            PostgreSQL Special
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">{dt.description}</p>
                      <code className="text-[10px] text-green-400 block mt-1">{dt.example}</code>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* psql Terminal Tab */}
        {activeTab === 'psql' && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {psqlCommands.slice(0, 5).map(cmd => (
                <Button
                  key={cmd.cmd}
                  size="sm"
                  variant="outline"
                  className="text-xs font-mono border-gray-600"
                  onClick={() => setCurrentInput(cmd.cmd)}
                  title={cmd.desc}
                >
                  {cmd.cmd}
                </Button>
              ))}
            </div>
            
            <div className="bg-black rounded-lg border border-gray-700 overflow-hidden font-mono">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 border-b border-gray-700">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-xs text-gray-400 ml-2">psql - PostgreSQL Interactive Terminal</span>
              </div>
              <div className="p-3 max-h-48 overflow-y-auto">
                {terminalLines.map((line, i) => (
                  <div key={i} className="text-xs text-green-400 whitespace-pre">
                    {line || '\u00A0'}
                  </div>
                ))}
              </div>
              <div className="flex items-center border-t border-gray-800 px-3 py-2">
                <span className="text-xs text-green-400 mr-2">mydb=#</span>
                <input
                  type="text"
                  value={currentInput}
                  onChange={(e) => setCurrentInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && executeCommand()}
                  className="flex-1 bg-transparent text-xs text-green-400 border-none outline-none font-mono"
                  placeholder="Type a command or SQL query..."
                  disabled={isProcessing}
                />
                <Button size="sm" onClick={executeCommand} disabled={isProcessing} className="h-6 bg-green-700 hover:bg-green-600">
                  <Play className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {mode !== 'beginner' && (
              <div className="grid grid-cols-3 gap-2">
                {psqlCommands.map(cmd => (
                  <div key={cmd.cmd} className="text-xs p-2 bg-gray-900 rounded border border-gray-700">
                    <code className="text-cyan-400">{cmd.cmd}</code>
                    <p className="text-gray-500 mt-0.5">{cmd.desc}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Extensions Tab */}
        {activeTab === 'extensions' && (
          <div className="space-y-4">
            <div className="bg-purple-900/20 border border-purple-700 rounded-lg p-3">
              <h4 className="text-sm font-medium text-purple-300 mb-1 flex items-center gap-2">
                <Zap className="h-4 w-4" /> PostgreSQL Extensions
              </h4>
              <p className="text-xs text-gray-400">
                Extensions add superpowers to PostgreSQL! Enable them with: 
                <code className="ml-1 px-1 bg-gray-800 rounded text-green-400">CREATE EXTENSION extension_name;</code>
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {extensions.map(ext => (
                <motion.div
                  key={ext.name}
                  className={cn(
                    'p-3 bg-gray-900 rounded-lg border cursor-pointer transition-colors',
                    selectedExtension?.name === ext.name ? 'border-purple-500 bg-purple-900/20' : 'border-gray-700 hover:border-gray-600'
                  )}
                  onClick={() => setSelectedExtension(ext)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Package className="h-4 w-4 text-purple-400" />
                    <span className="font-mono text-sm text-cyan-400">{ext.name}</span>
                  </div>
                  <p className="text-xs text-gray-400">{ext.desc}</p>
                </motion.div>
              ))}
            </div>

            <AnimatePresence>
              {selectedExtension && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-gray-900 rounded-lg border border-purple-600 p-3"
                >
                  <h5 className="text-sm font-medium text-purple-300 mb-2">{selectedExtension.name} Example</h5>
                  <pre className="text-xs font-mono text-green-400 bg-black p-2 rounded">
                    {`-- Enable the extension
CREATE EXTENSION IF NOT EXISTS ${selectedExtension.name};

-- Usage example
${selectedExtension.example}`}
                  </pre>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Connection Tab */}
        {activeTab === 'connection' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              Use <strong className="text-cyan-400">Npgsql</strong> - the official .NET data provider for PostgreSQL:
            </p>

            <div className="bg-gray-900 rounded-lg border border-gray-700 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-400">Basic Connection String</span>
                <Button size="sm" variant="ghost" onClick={() => copyConnectionString(connectionString)}>
                  {copiedString ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
              <pre className="text-xs font-mono text-green-400 whitespace-pre-wrap">{connectionString}</pre>
            </div>

            {mode !== 'beginner' && (
              <>
                <div className="bg-gray-900 rounded-lg border border-gray-700 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-400">With Connection Pooling</span>
                    <Button size="sm" variant="ghost" onClick={() => copyConnectionString(npgsqlConnectionString)}>
                      {copiedString ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                  <pre className="text-xs font-mono text-green-400 whitespace-pre-wrap">{npgsqlConnectionString}</pre>
                </div>

                <div className="bg-gray-900 rounded-lg border border-gray-700 p-3">
                  <h5 className="text-xs font-medium text-gray-400 mb-2">Install Npgsql Package</h5>
                  <pre className="text-xs font-mono text-cyan-400">
{`dotnet add package Npgsql
dotnet add package Npgsql.EntityFrameworkCore.PostgreSQL`}
                  </pre>
                </div>
              </>
            )}

            {mode === 'advanced' && (
              <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3">
                <h4 className="text-sm font-medium text-blue-300 mb-2">🚀 PostgreSQL with EF Core</h4>
                <pre className="text-xs font-mono text-green-400 bg-black p-2 rounded overflow-x-auto">
{`// Program.cs
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        o => o.EnableRetryOnFailure(3)
    )
);

// Enable JSONB column
modelBuilder.Entity<User>()
    .Property(u => u.Preferences)
    .HasColumnType("jsonb");`}
                </pre>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default PostgresqlExplorer;
