'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database, 
  Table2, 
  Key, 
  Link2, 
  RotateCcw,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  Layers,
  Plus,
  Trash2,
  Maximize2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type RelationshipType = 'one-to-one' | 'one-to-many' | 'many-to-many';
export type NormalizationLevel = 'unnormalized' | '1NF' | '2NF' | '3NF';

export interface DatabaseDesignVisualizerProps {
  mode?: 'beginner' | 'intermediate' | 'advanced';
  title?: string;
  initialTab?: 'relationships' | 'normalization' | 'keys';
}

interface TableDef {
  name: string;
  columns: { name: string; type: string; isPK?: boolean; isFK?: boolean; fkRef?: string }[];
}

const relationshipExamples: Record<RelationshipType, { tables: TableDef[]; description: string; realWorld: string }> = {
  'one-to-one': {
    tables: [
      { 
        name: 'Users', 
        columns: [
          { name: 'Id', type: 'int', isPK: true },
          { name: 'Email', type: 'varchar(255)' },
          { name: 'PasswordHash', type: 'varchar(255)' },
        ] 
      },
      { 
        name: 'UserProfiles', 
        columns: [
          { name: 'Id', type: 'int', isPK: true },
          { name: 'UserId', type: 'int', isFK: true, fkRef: 'Users.Id' },
          { name: 'Bio', type: 'text' },
          { name: 'Avatar', type: 'varchar(255)' },
        ] 
      },
    ],
    description: 'Each user has exactly one profile, and each profile belongs to exactly one user.',
    realWorld: 'Person ↔ Passport, Employee ↔ Security Badge',
  },
  'one-to-many': {
    tables: [
      { 
        name: 'Authors', 
        columns: [
          { name: 'Id', type: 'int', isPK: true },
          { name: 'Name', type: 'varchar(100)' },
          { name: 'Country', type: 'varchar(50)' },
        ] 
      },
      { 
        name: 'Books', 
        columns: [
          { name: 'Id', type: 'int', isPK: true },
          { name: 'AuthorId', type: 'int', isFK: true, fkRef: 'Authors.Id' },
          { name: 'Title', type: 'varchar(200)' },
          { name: 'Year', type: 'int' },
        ] 
      },
    ],
    description: 'One author can write many books, but each book has only one author.',
    realWorld: 'Parent ↔ Children, Teacher ↔ Students, Department ↔ Employees',
  },
  'many-to-many': {
    tables: [
      { 
        name: 'Students', 
        columns: [
          { name: 'Id', type: 'int', isPK: true },
          { name: 'Name', type: 'varchar(100)' },
        ] 
      },
      { 
        name: 'Courses', 
        columns: [
          { name: 'Id', type: 'int', isPK: true },
          { name: 'Title', type: 'varchar(100)' },
        ] 
      },
      { 
        name: 'Enrollments', 
        columns: [
          { name: 'StudentId', type: 'int', isPK: true, isFK: true, fkRef: 'Students.Id' },
          { name: 'CourseId', type: 'int', isPK: true, isFK: true, fkRef: 'Courses.Id' },
          { name: 'EnrollDate', type: 'date' },
          { name: 'Grade', type: 'decimal(3,2)' },
        ] 
      },
    ],
    description: 'Students can enroll in many courses, and courses can have many students.',
    realWorld: 'Actors ↔ Movies, Tags ↔ Articles, Products ↔ Orders',
  },
};

interface NormalizationExample {
  level: NormalizationLevel;
  table: { name: string; data: string[][] };
  issues: string[];
  fixes: string[];
}

const normalizationExamples: NormalizationExample[] = [
  {
    level: 'unnormalized',
    table: {
      name: 'Orders',
      data: [
        ['OrderId', 'Customer', 'CustomerPhone', 'Products', 'Quantities'],
        ['1', 'John Smith', '555-1234', 'Laptop, Mouse', '1, 2'],
        ['2', 'Jane Doe', '555-5678', 'Keyboard', '1'],
      ],
    },
    issues: ['Repeating groups (multiple products in one cell)', 'Cannot easily query individual products'],
    fixes: ['Split into multiple rows - one product per row'],
  },
  {
    level: '1NF',
    table: {
      name: 'Orders',
      data: [
        ['OrderId', 'Customer', 'CustomerPhone', 'Product', 'Quantity'],
        ['1', 'John Smith', '555-1234', 'Laptop', '1'],
        ['1', 'John Smith', '555-1234', 'Mouse', '2'],
        ['2', 'Jane Doe', '555-5678', 'Keyboard', '1'],
      ],
    },
    issues: ['Partial dependency: Customer info depends only on OrderId, not Product', 'Data duplication for customer details'],
    fixes: ['Create separate Customer table', 'Reference by CustomerId'],
  },
  {
    level: '2NF',
    table: {
      name: 'Orders + OrderItems + Customers',
      data: [
        ['Orders: OrderId, CustomerId'],
        ['OrderItems: OrderId, ProductId, Quantity'],
        ['Customers: CustomerId, Name, Phone'],
      ],
    },
    issues: ['If CustomerPhone depends on Name (transitive), we still have issues'],
    fixes: ['Ensure all non-key columns depend ONLY on the primary key'],
  },
  {
    level: '3NF',
    table: {
      name: 'Fully Normalized',
      data: [
        ['Customers: Id, Name, Phone'],
        ['Products: Id, Name, Price'],
        ['Orders: Id, CustomerId, OrderDate'],
        ['OrderItems: OrderId, ProductId, Quantity'],
      ],
    },
    issues: [],
    fixes: ['Every column depends only on the key, the whole key, and nothing but the key!'],
  },
];

export function DatabaseDesignVisualizer({
  mode = 'beginner',
  title = 'Database Design Visualizer',
  initialTab = 'relationships',
}: DatabaseDesignVisualizerProps) {
  const [activeTab, setActiveTab] = useState<'relationships' | 'normalization' | 'keys'>(initialTab);
  const [selectedRelationship, setSelectedRelationship] = useState<RelationshipType>('one-to-many');
  const [normalizationStep, setNormalizationStep] = useState(0);
  const [showConstraints, setShowConstraints] = useState(false);

  const currentRelationship = relationshipExamples[selectedRelationship];
  const currentNormalization = normalizationExamples[normalizationStep];

  const renderTable = useCallback((table: TableDef, index: number) => (
    <motion.div
      key={table.name}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden"
    >
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 border-b border-gray-700">
        <Table2 className="h-4 w-4 text-green-400" />
        <span className="text-sm font-mono text-gray-200">{table.name}</span>
      </div>
      <div className="p-2 space-y-1">
        {table.columns.map(col => (
          <div 
            key={col.name} 
            className={cn(
              'flex items-center gap-2 px-2 py-1 rounded text-xs',
              col.isPK && 'bg-yellow-900/20',
              col.isFK && !col.isPK && 'bg-blue-900/20'
            )}
          >
            {col.isPK && <Key className="h-3 w-3 text-yellow-400" />}
            {col.isFK && !col.isPK && <Link2 className="h-3 w-3 text-blue-400" />}
            {!col.isPK && !col.isFK && <div className="w-3" />}
            <span className="text-gray-300">{col.name}</span>
            <span className="text-gray-500 ml-auto">{col.type}</span>
            {col.fkRef && (
              <span className="text-xs text-blue-400">→ {col.fkRef}</span>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  ), []);

  const reset = useCallback(() => {
    setSelectedRelationship('one-to-many');
    setNormalizationStep(0);
    setShowConstraints(false);
  }, []);

  return (
    <Card className="my-4 overflow-hidden bg-gray-950 border-gray-800">
      <CardHeader className="pb-2 flex flex-row items-center justify-between bg-gray-900/50">
        <CardTitle className="text-sm font-medium text-gray-200 flex items-center gap-2">
          <Layers className="h-4 w-4 text-purple-400" />
          {title}
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={reset} className="text-gray-400 hover:text-white">
          <RotateCcw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* Beginner Analogy */}
        {mode === 'beginner' && (
          <div className="bg-purple-900/20 border border-purple-700 rounded-lg p-4">
            <h4 className="font-medium text-purple-300 mb-2">🏗️ Database Design = Building Blueprints</h4>
            <p className="text-sm text-gray-400">
              Just like architects create blueprints before building a house, we design our database 
              before storing data. Good design prevents problems later - like trying to add a 
              bathroom where there&apos;s no plumbing!
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-gray-800 pb-2">
          {[
            { id: 'relationships', label: 'Relationships', icon: <Link2 className="h-3 w-3" /> },
            { id: 'normalization', label: 'Normalization', icon: <Layers className="h-3 w-3" /> },
            { id: 'keys', label: 'Keys & Constraints', icon: <Key className="h-3 w-3" /> },
          ].map(tab => (
            <Button
              key={tab.id}
              size="sm"
              variant={activeTab === tab.id ? 'default' : 'ghost'}
              className={cn(
                'text-xs flex items-center gap-1',
                activeTab === tab.id && 'bg-purple-800'
              )}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
            >
              {tab.icon}
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Relationships Tab */}
        {activeTab === 'relationships' && (
          <div className="space-y-4">
            {/* Relationship Type Selector */}
            <div className="flex flex-wrap gap-2">
              {(['one-to-one', 'one-to-many', 'many-to-many'] as RelationshipType[]).map(type => (
                <Button
                  key={type}
                  size="sm"
                  variant={selectedRelationship === type ? 'default' : 'outline'}
                  className={cn(
                    'text-xs',
                    selectedRelationship === type && 'bg-purple-600'
                  )}
                  onClick={() => setSelectedRelationship(type)}
                >
                  {type.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </Button>
              ))}
            </div>

            {/* Description */}
            <motion.div
              key={selectedRelationship}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-gray-900 rounded-lg p-3 border border-gray-700"
            >
              <p className="text-sm text-gray-300">{currentRelationship.description}</p>
              <p className="text-xs text-gray-500 mt-2">
                <strong className="text-gray-400">Real-world examples:</strong> {currentRelationship.realWorld}
              </p>
            </motion.div>

            {/* Tables Visualization */}
            <div className={cn(
              'grid gap-4',
              currentRelationship.tables.length === 3 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'
            )}>
              {currentRelationship.tables.map((table, i) => (
                <div key={table.name} className="relative">
                  {renderTable(table, i)}
                  {/* Relationship Arrow */}
                  {i < currentRelationship.tables.length - 1 && (
                    <div className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 z-10">
                      <ArrowRight className="h-6 w-6 text-purple-400" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Junction Table Info for Many-to-Many */}
            {selectedRelationship === 'many-to-many' && (
              <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3">
                <h5 className="text-sm font-medium text-blue-300 mb-1">💡 Junction Table</h5>
                <p className="text-xs text-gray-400">
                  The &quot;Enrollments&quot; table is called a <strong>junction table</strong> (or bridge/link table). 
                  It breaks the many-to-many relationship into two one-to-many relationships.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Normalization Tab */}
        {activeTab === 'normalization' && (
          <div className="space-y-4">
            {/* Step Navigation */}
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {normalizationExamples.map((ex, i) => (
                  <Button
                    key={ex.level}
                    size="sm"
                    variant={normalizationStep === i ? 'default' : 'outline'}
                    className={cn(
                      'text-xs',
                      normalizationStep === i && 'bg-green-600'
                    )}
                    onClick={() => setNormalizationStep(i)}
                  >
                    {ex.level}
                  </Button>
                ))}
              </div>
              <div className="flex gap-1">
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => setNormalizationStep(Math.max(0, normalizationStep - 1))}
                  disabled={normalizationStep === 0}
                >
                  ← Prev
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => setNormalizationStep(Math.min(normalizationExamples.length - 1, normalizationStep + 1))}
                  disabled={normalizationStep === normalizationExamples.length - 1}
                >
                  Next →
                </Button>
              </div>
            </div>

            {/* Current State */}
            <motion.div
              key={currentNormalization.level}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-3"
            >
              {/* Table Display */}
              <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
                <div className="px-3 py-2 bg-gray-800 border-b border-gray-700">
                  <span className="text-sm font-mono text-gray-200">{currentNormalization.table.name}</span>
                </div>
                <div className="p-3 overflow-x-auto">
                  <table className="w-full text-xs">
                    <tbody>
                      {currentNormalization.table.data.map((row, i) => (
                        <tr key={i} className={i === 0 ? 'bg-gray-800' : ''}>
                          {row.map((cell, j) => (
                            <td key={j} className={cn(
                              'px-2 py-1 border-b border-gray-700',
                              i === 0 ? 'font-medium text-gray-300' : 'text-gray-400'
                            )}>
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Issues */}
              {currentNormalization.issues.length > 0 && (
                <div className="bg-red-900/20 border border-red-700 rounded-lg p-3">
                  <h5 className="text-sm font-medium text-red-300 mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" /> Issues at {currentNormalization.level}
                  </h5>
                  <ul className="space-y-1">
                    {currentNormalization.issues.map((issue, i) => (
                      <li key={i} className="text-xs text-gray-400">• {issue}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Fixes */}
              <div className={cn(
                'border rounded-lg p-3',
                currentNormalization.issues.length === 0 
                  ? 'bg-green-900/20 border-green-700' 
                  : 'bg-gray-900 border-gray-700'
              )}>
                <h5 className={cn(
                  'text-sm font-medium mb-2 flex items-center gap-2',
                  currentNormalization.issues.length === 0 ? 'text-green-300' : 'text-gray-300'
                )}>
                  {currentNormalization.issues.length === 0 
                    ? <><CheckCircle className="h-4 w-4" /> Properly Normalized!</>
                    : <>How to fix</>
                  }
                </h5>
                <ul className="space-y-1">
                  {currentNormalization.fixes.map((fix, i) => (
                    <li key={i} className="text-xs text-gray-400">• {fix}</li>
                  ))}
                </ul>
              </div>
            </motion.div>
          </div>
        )}

        {/* Keys & Constraints Tab */}
        {activeTab === 'keys' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Primary Key */}
              <div className="bg-gray-900 rounded-lg border border-yellow-700 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Key className="h-4 w-4 text-yellow-400" />
                  <span className="text-sm font-medium text-yellow-300">Primary Key (PK)</span>
                </div>
                <p className="text-xs text-gray-400 mb-2">
                  Uniquely identifies each row. Like a Social Security Number - no two rows can have the same PK.
                </p>
                <code className="text-xs bg-black px-2 py-1 rounded text-green-400 block">
                  Id INT PRIMARY KEY
                </code>
              </div>

              {/* Foreign Key */}
              <div className="bg-gray-900 rounded-lg border border-blue-700 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Link2 className="h-4 w-4 text-blue-400" />
                  <span className="text-sm font-medium text-blue-300">Foreign Key (FK)</span>
                </div>
                <p className="text-xs text-gray-400 mb-2">
                  References a PK in another table. Creates relationships between tables.
                </p>
                <code className="text-xs bg-black px-2 py-1 rounded text-green-400 block">
                  FOREIGN KEY (UserId) REFERENCES Users(Id)
                </code>
              </div>

              {/* Unique */}
              <div className="bg-gray-900 rounded-lg border border-purple-700 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Maximize2 className="h-4 w-4 text-purple-400" />
                  <span className="text-sm font-medium text-purple-300">UNIQUE Constraint</span>
                </div>
                <p className="text-xs text-gray-400 mb-2">
                  Ensures all values in a column are different. Unlike PK, allows NULL values.
                </p>
                <code className="text-xs bg-black px-2 py-1 rounded text-green-400 block">
                  Email VARCHAR(255) UNIQUE
                </code>
              </div>

              {/* NOT NULL */}
              <div className="bg-gray-900 rounded-lg border border-red-700 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                  <span className="text-sm font-medium text-red-300">NOT NULL</span>
                </div>
                <p className="text-xs text-gray-400 mb-2">
                  Prevents empty values. The column must always have a value.
                </p>
                <code className="text-xs bg-black px-2 py-1 rounded text-green-400 block">
                  Name VARCHAR(100) NOT NULL
                </code>
              </div>

              {mode !== 'beginner' && (
                <>
                  {/* CHECK */}
                  <div className="bg-gray-900 rounded-lg border border-green-700 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      <span className="text-sm font-medium text-green-300">CHECK Constraint</span>
                    </div>
                    <p className="text-xs text-gray-400 mb-2">
                      Validates data based on a condition before allowing insert/update.
                    </p>
                    <code className="text-xs bg-black px-2 py-1 rounded text-green-400 block">
                      Age INT CHECK (Age {'>'}= 0 AND Age {'<'}= 150)
                    </code>
                  </div>

                  {/* DEFAULT */}
                  <div className="bg-gray-900 rounded-lg border border-cyan-700 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Plus className="h-4 w-4 text-cyan-400" />
                      <span className="text-sm font-medium text-cyan-300">DEFAULT Value</span>
                    </div>
                    <p className="text-xs text-gray-400 mb-2">
                      Provides a default value when none is specified during insert.
                    </p>
                    <code className="text-xs bg-black px-2 py-1 rounded text-green-400 block">
                      CreatedAt DATETIME DEFAULT GETDATE()
                    </code>
                  </div>
                </>
              )}
            </div>

            {mode === 'advanced' && (
              <div className="bg-gray-900 rounded-lg border border-gray-700 p-3">
                <h5 className="text-sm font-medium text-gray-300 mb-2">Complete Table Creation Example</h5>
                <pre className="text-xs font-mono text-green-400 bg-black p-3 rounded overflow-x-auto">
{`CREATE TABLE Orders (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    CustomerId INT NOT NULL,
    OrderDate DATETIME NOT NULL DEFAULT GETDATE(),
    TotalAmount DECIMAL(18,2) NOT NULL CHECK (TotalAmount >= 0),
    Status VARCHAR(20) NOT NULL DEFAULT 'Pending',
    Notes NVARCHAR(MAX) NULL,
    
    CONSTRAINT FK_Orders_Customers 
        FOREIGN KEY (CustomerId) REFERENCES Customers(Id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);`}
                </pre>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default DatabaseDesignVisualizer;
