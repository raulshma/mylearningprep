'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, StepForward, Box, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { AnimatedControls, type AnimationSpeed, speedMultipliers } from '@/components/learn/shared';

// Types for OOP visualization
interface OopState {
  classDefinition: ClassDefinition;
  objects: ObjectInstance[];
  currentAction: string;
  phase: 'class-def' | 'instantiation' | 'property-access' | 'method-call' | 'complete';
}

interface ClassDefinition {
  name: string;
  properties: PropertyDef[];
  methods: MethodDef[];
}

interface PropertyDef {
  name: string;
  type: string;
  accessModifier: 'public' | 'private' | 'protected';
  hasGetter: boolean;
  hasSetter: boolean;
}

interface MethodDef {
  name: string;
  returnType: string;
  parameters: string;
  accessModifier: 'public' | 'private' | 'protected';
}

interface ObjectInstance {
  id: string;
  variableName: string;
  properties: Record<string, string | number | boolean>;
  isHighlighted: boolean;
}

interface OopStep {
  stepNumber: number;
  description: string;
  state: OopState;
  codeHighlight?: string;
}

type DemoType = 'basic-class' | 'properties' | 'constructor' | 'multiple-objects';

interface OopConceptVisualizerProps {
  type?: DemoType;
  customClass?: ClassDefinition;
  autoPlay?: boolean;
  speed?: AnimationSpeed;
}

// Default class definitions
const defaultClasses: Record<DemoType, ClassDefinition> = {
  'basic-class': {
    name: 'Car',
    properties: [
      { name: 'Brand', type: 'string', accessModifier: 'public', hasGetter: true, hasSetter: true },
      { name: 'Year', type: 'int', accessModifier: 'public', hasGetter: true, hasSetter: true },
    ],
    methods: [
      { name: 'Start', returnType: 'void', parameters: '', accessModifier: 'public' },
      { name: 'Honk', returnType: 'void', parameters: '', accessModifier: 'public' },
    ],
  },
  'properties': {
    name: 'Person',
    properties: [
      { name: 'Name', type: 'string', accessModifier: 'public', hasGetter: true, hasSetter: true },
      { name: 'Age', type: 'int', accessModifier: 'public', hasGetter: true, hasSetter: true },
      { name: 'Email', type: 'string', accessModifier: 'private', hasGetter: true, hasSetter: false },
    ],
    methods: [
      { name: 'Greet', returnType: 'string', parameters: '', accessModifier: 'public' },
    ],
  },
  'constructor': {
    name: 'BankAccount',
    properties: [
      { name: 'AccountNumber', type: 'string', accessModifier: 'public', hasGetter: true, hasSetter: false },
      { name: 'Balance', type: 'decimal', accessModifier: 'public', hasGetter: true, hasSetter: true },
      { name: 'Owner', type: 'string', accessModifier: 'public', hasGetter: true, hasSetter: true },
    ],
    methods: [
      { name: 'Deposit', returnType: 'void', parameters: 'decimal amount', accessModifier: 'public' },
      { name: 'Withdraw', returnType: 'bool', parameters: 'decimal amount', accessModifier: 'public' },
    ],
  },
  'multiple-objects': {
    name: 'Student',
    properties: [
      { name: 'Name', type: 'string', accessModifier: 'public', hasGetter: true, hasSetter: true },
      { name: 'Grade', type: 'int', accessModifier: 'public', hasGetter: true, hasSetter: true },
    ],
    methods: [
      { name: 'Study', returnType: 'void', parameters: '', accessModifier: 'public' },
    ],
  },
};

// Code examples for each demo type
const codeExamples: Record<DemoType, string> = {
  'basic-class': `// Class Definition (Blueprint)
public class Car
{
    public string Brand { get; set; }
    public int Year { get; set; }
    
    public void Start()
    {
        Console.WriteLine("Engine started!");
    }
    
    public void Honk()
    {
        Console.WriteLine("Beep beep!");
    }
}

// Creating an Object (Instance)
Car myCar = new Car();
myCar.Brand = "Toyota";
myCar.Year = 2024;
myCar.Start();`,

  'properties': `public class Person
{
    // Auto-implemented properties
    public string Name { get; set; }
    public int Age { get; set; }
    
    // Read-only property (no setter)
    private string _email;
    public string Email { get { return _email; } }
    
    public string Greet()
    {
        return $"Hello, I'm {Name}!";
    }
}

Person person = new Person();
person.Name = "Alice";
person.Age = 25;`,

  'constructor': `public class BankAccount
{
    public string AccountNumber { get; }
    public decimal Balance { get; private set; }
    public string Owner { get; set; }
    
    // Constructor
    public BankAccount(string owner, decimal initialDeposit)
    {
        AccountNumber = Guid.NewGuid().ToString().Substring(0, 8);
        Owner = owner;
        Balance = initialDeposit;
    }
    
    public void Deposit(decimal amount)
    {
        Balance += amount;
    }
}

// Using the constructor
var account = new BankAccount("John", 1000m);`,

  'multiple-objects': `public class Student
{
    public string Name { get; set; }
    public int Grade { get; set; }
    
    public void Study()
    {
        Grade += 10;
    }
}

// Multiple objects from same class
Student alice = new Student { Name = "Alice", Grade = 85 };
Student bob = new Student { Name = "Bob", Grade = 90 };

// Each object has its own data
alice.Study();  // Alice's grade: 95
bob.Study();    // Bob's grade: 100`,
};

// Generate steps based on demo type
function generateOopSteps(type: DemoType, classDef: ClassDefinition): OopStep[] {
  const steps: OopStep[] = [];

  switch (type) {
    case 'basic-class': {
      // Step 1: Show class definition
      steps.push({
        stepNumber: 0,
        description: `This is a CLASS definition. Think of "${classDef.name}" as a blueprint or cookie cutter.`,
        state: {
          classDefinition: classDef,
          objects: [],
          currentAction: 'Viewing class blueprint',
          phase: 'class-def',
        },
        codeHighlight: 'class',
      });

      // Step 2: Show properties
      steps.push({
        stepNumber: 1,
        description: `Properties define what data the class stores. ${classDef.name} has: ${classDef.properties.map(p => p.name).join(', ')}`,
        state: {
          classDefinition: classDef,
          objects: [],
          currentAction: 'Examining properties',
          phase: 'class-def',
        },
        codeHighlight: 'properties',
      });

      // Step 3: Show methods
      steps.push({
        stepNumber: 2,
        description: `Methods define what the class can DO. ${classDef.name} can: ${classDef.methods.map(m => m.name).join(', ')}`,
        state: {
          classDefinition: classDef,
          objects: [],
          currentAction: 'Examining methods',
          phase: 'class-def',
        },
        codeHighlight: 'methods',
      });

      // Step 4: Create object
      steps.push({
        stepNumber: 3,
        description: 'Using "new Car()" creates an OBJECT - a real instance of the class in memory!',
        state: {
          classDefinition: classDef,
          objects: [{ id: '1', variableName: 'myCar', properties: { Brand: '', Year: 0 }, isHighlighted: true }],
          currentAction: 'Creating object with new',
          phase: 'instantiation',
        },
        codeHighlight: 'new',
      });

      // Step 5: Set properties
      steps.push({
        stepNumber: 4,
        description: 'Now we can set property values on our object using dot notation.',
        state: {
          classDefinition: classDef,
          objects: [{ id: '1', variableName: 'myCar', properties: { Brand: 'Toyota', Year: 2024 }, isHighlighted: true }],
          currentAction: 'Setting property values',
          phase: 'property-access',
        },
        codeHighlight: 'set',
      });

      // Step 6: Call method
      steps.push({
        stepNumber: 5,
        description: 'We call methods using dot notation too! myCar.Start() runs the Start method.',
        state: {
          classDefinition: classDef,
          objects: [{ id: '1', variableName: 'myCar', properties: { Brand: 'Toyota', Year: 2024 }, isHighlighted: true }],
          currentAction: 'Calling Start() method',
          phase: 'method-call',
        },
        codeHighlight: 'method',
      });

      steps.push({
        stepNumber: 6,
        description: 'Complete! The class is the blueprint, the object is the actual car built from it.',
        state: {
          classDefinition: classDef,
          objects: [{ id: '1', variableName: 'myCar', properties: { Brand: 'Toyota', Year: 2024 }, isHighlighted: false }],
          currentAction: 'Complete',
          phase: 'complete',
        },
      });
      break;
    }

    case 'multiple-objects': {
      steps.push({
        stepNumber: 0,
        description: `The ${classDef.name} class is our blueprint. We can create MULTIPLE objects from it!`,
        state: {
          classDefinition: classDef,
          objects: [],
          currentAction: 'Viewing class blueprint',
          phase: 'class-def',
        },
      });

      steps.push({
        stepNumber: 1,
        description: 'Creating first student: alice',
        state: {
          classDefinition: classDef,
          objects: [{ id: '1', variableName: 'alice', properties: { Name: 'Alice', Grade: 85 }, isHighlighted: true }],
          currentAction: 'Creating alice object',
          phase: 'instantiation',
        },
      });

      steps.push({
        stepNumber: 2,
        description: 'Creating second student: bob - Same class, different object!',
        state: {
          classDefinition: classDef,
          objects: [
            { id: '1', variableName: 'alice', properties: { Name: 'Alice', Grade: 85 }, isHighlighted: false },
            { id: '2', variableName: 'bob', properties: { Name: 'Bob', Grade: 90 }, isHighlighted: true },
          ],
          currentAction: 'Creating bob object',
          phase: 'instantiation',
        },
      });

      steps.push({
        stepNumber: 3,
        description: 'Calling alice.Study() - only Alice\'s grade changes!',
        state: {
          classDefinition: classDef,
          objects: [
            { id: '1', variableName: 'alice', properties: { Name: 'Alice', Grade: 95 }, isHighlighted: true },
            { id: '2', variableName: 'bob', properties: { Name: 'Bob', Grade: 90 }, isHighlighted: false },
          ],
          currentAction: 'Alice studies (+10 grade)',
          phase: 'method-call',
        },
      });

      steps.push({
        stepNumber: 4,
        description: 'Calling bob.Study() - Bob\'s grade changes independently!',
        state: {
          classDefinition: classDef,
          objects: [
            { id: '1', variableName: 'alice', properties: { Name: 'Alice', Grade: 95 }, isHighlighted: false },
            { id: '2', variableName: 'bob', properties: { Name: 'Bob', Grade: 100 }, isHighlighted: true },
          ],
          currentAction: 'Bob studies (+10 grade)',
          phase: 'method-call',
        },
      });

      steps.push({
        stepNumber: 5,
        description: 'Each object maintains its own STATE. Same blueprint, independent data!',
        state: {
          classDefinition: classDef,
          objects: [
            { id: '1', variableName: 'alice', properties: { Name: 'Alice', Grade: 95 }, isHighlighted: false },
            { id: '2', variableName: 'bob', properties: { Name: 'Bob', Grade: 100 }, isHighlighted: false },
          ],
          currentAction: 'Complete',
          phase: 'complete',
        },
      });
      break;
    }

    default: {
      // Generic steps for other types
      steps.push({
        stepNumber: 0,
        description: `Exploring the ${classDef.name} class`,
        state: {
          classDefinition: classDef,
          objects: [],
          currentAction: 'Viewing class blueprint',
          phase: 'class-def',
        },
      });

      steps.push({
        stepNumber: 1,
        description: 'Creating an instance of the class',
        state: {
          classDefinition: classDef,
          objects: [{ id: '1', variableName: 'instance', properties: {}, isHighlighted: true }],
          currentAction: 'Creating object',
          phase: 'instantiation',
        },
      });

      steps.push({
        stepNumber: 2,
        description: 'Complete!',
        state: {
          classDefinition: classDef,
          objects: [{ id: '1', variableName: 'instance', properties: {}, isHighlighted: false }],
          currentAction: 'Complete',
          phase: 'complete',
        },
      });
    }
  }

  return steps;
}

// Phase colors
const phaseColors = {
  'class-def': { bg: 'bg-purple-500/20', border: 'border-purple-500', text: 'text-purple-400' },
  'instantiation': { bg: 'bg-blue-500/20', border: 'border-blue-500', text: 'text-blue-400' },
  'property-access': { bg: 'bg-green-500/20', border: 'border-green-500', text: 'text-green-400' },
  'method-call': { bg: 'bg-orange-500/20', border: 'border-orange-500', text: 'text-orange-400' },
  'complete': { bg: 'bg-gray-500/20', border: 'border-gray-500', text: 'text-gray-400' },
};

const demoTypeLabels: Record<DemoType, string> = {
  'basic-class': 'Basic Class & Object',
  'properties': 'Properties & Access',
  'constructor': 'Constructors',
  'multiple-objects': 'Multiple Objects',
};

/**
 * OopConceptVisualizer Component
 * Interactive visualization of C# OOP concepts
 */
export function OopConceptVisualizer({
  type = 'basic-class',
  customClass,
  autoPlay = false,
  speed: initialSpeed = 'normal',
}: OopConceptVisualizerProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [speed, setSpeed] = useState<AnimationSpeed>(initialSpeed);

  const classDef = customClass || defaultClasses[type];
  const steps = useMemo(() => generateOopSteps(type, classDef), [type, classDef]);
  const currentStep = steps[currentStepIndex];

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev >= steps.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 1500 / speedMultipliers[speed]);

    return () => clearInterval(interval);
  }, [isPlaying, speed, steps.length]);

  const handlePlay = useCallback(() => {
    if (currentStepIndex >= steps.length - 1) {
      setCurrentStepIndex(0);
    }
    setIsPlaying(true);
  }, [currentStepIndex, steps.length]);

  const handlePause = useCallback(() => setIsPlaying(false), []);
  const handleStep = useCallback(() => {
    setIsPlaying(false);
    setCurrentStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
  }, [steps.length]);
  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setCurrentStepIndex(0);
  }, []);

  return (
    <Card className="p-6 my-6 bg-linear-to-br from-background to-secondary/20">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Box className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">{demoTypeLabels[type]}</h3>
            <p className="text-sm text-muted-foreground">
              Step {currentStepIndex + 1} of {steps.length}
            </p>
          </div>
        </div>
        <AnimatedControls 
          isPlaying={isPlaying}
          speed={speed} 
          onSpeedChange={setSpeed}
          onPlayPause={() => isPlaying ? handlePause() : handlePlay()}
          onReset={handleReset}
        />
      </div>

      {/* Code Display */}
      <div className="mb-4 p-4 bg-secondary/50 rounded-lg font-mono text-sm overflow-x-auto max-h-64 overflow-y-auto">
        <pre className="whitespace-pre-wrap">{codeExamples[type]}</pre>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 mb-4">
        {isPlaying ? (
          <Button variant="outline" size="sm" onClick={handlePause}>
            <Pause className="w-4 h-4 mr-1" />
            <span>Pause</span>
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={handlePlay}>
            <Play className="w-4 h-4 mr-1" />
            <span>Play</span>
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={handleStep} disabled={currentStepIndex >= steps.length - 1}>
          <StepForward className="w-4 h-4 mr-1" />
          <span>Step</span>
        </Button>
        <Button variant="outline" size="sm" onClick={handleReset}>
          <RotateCcw className="w-4 h-4 mr-1" />
          <span>Reset</span>
        </Button>
        
        <div className="flex-1 ml-4">
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary"
              animate={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </div>

      {/* Current Step */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStepIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={cn(
            'p-4 rounded-lg border-2 mb-4',
            currentStep && phaseColors[currentStep.state.phase].bg,
            currentStep && phaseColors[currentStep.state.phase].border
          )}
        >
          <span className={cn(
            'px-2 py-0.5 rounded text-xs font-medium uppercase mb-2 inline-block',
            currentStep && phaseColors[currentStep.state.phase].text
          )}>
            {currentStep?.state.phase.replace('-', ' ')}
          </span>
          <p className="text-foreground font-medium">{currentStep?.description}</p>
        </motion.div>
      </AnimatePresence>

      {/* Visualization Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Class Blueprint */}
        <div className="p-4 bg-secondary/30 rounded-lg">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-400" />
            Class Blueprint: {classDef.name}
          </h4>
          <div className="space-y-3">
            <div className="p-3 bg-background/50 rounded border border-purple-500/30">
              <div className="text-xs text-muted-foreground mb-2">Properties</div>
              {classDef.properties.map((prop) => (
                <div key={prop.name} className="flex items-center gap-2 text-sm">
                  <span className={cn(
                    'px-1.5 py-0.5 rounded text-xs',
                    prop.accessModifier === 'public' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                  )}>
                    {prop.accessModifier}
                  </span>
                  <code className="text-blue-400">{prop.type}</code>
                  <code className="text-foreground">{prop.name}</code>
                </div>
              ))}
            </div>
            <div className="p-3 bg-background/50 rounded border border-orange-500/30">
              <div className="text-xs text-muted-foreground mb-2">Methods</div>
              {classDef.methods.map((method) => (
                <div key={method.name} className="text-sm">
                  <code className="text-orange-400">{method.name}</code>
                  <code className="text-muted-foreground">({method.parameters})</code>
                  <code className="text-blue-400 ml-1">→ {method.returnType}</code>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Objects */}
        <div className="p-4 bg-secondary/30 rounded-lg">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Box className="w-4 h-4 text-blue-400" />
            Objects (Instances)
          </h4>
          <div className="space-y-3 min-h-[150px]">
            <AnimatePresence>
              {currentStep?.state.objects.map((obj) => (
                <motion.div
                  key={obj.id}
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ 
                    opacity: 1, 
                    scale: obj.isHighlighted ? 1.02 : 1, 
                    y: 0,
                    borderColor: obj.isHighlighted ? 'hsl(var(--primary))' : 'hsl(var(--border))'
                  }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className={cn(
                    'p-3 bg-background/50 rounded border-2 transition-all',
                    obj.isHighlighted ? 'border-primary shadow-lg shadow-primary/20' : 'border-border'
                  )}
                >
                  <div className="font-medium text-sm mb-2 flex items-center gap-2">
                    <Box className="w-3 h-3" />
                    <code>{obj.variableName}</code>
                    <span className="text-muted-foreground text-xs">: {classDef.name}</span>
                  </div>
                  <div className="space-y-1">
                    {Object.entries(obj.properties).map(([key, value]) => (
                      <motion.div 
                        key={key}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex justify-between text-sm"
                      >
                        <code className="text-muted-foreground">{key}:</code>
                        <motion.code
                          key={`${key}-${value}`}
                          initial={{ color: '#22c55e' }}
                          animate={{ color: 'inherit' }}
                          className="font-semibold"
                        >
                          {typeof value === 'string' ? `"${value}"` : value}
                        </motion.code>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {(!currentStep?.state.objects.length) && (
              <div className="text-center text-muted-foreground italic py-8">
                No objects created yet...
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

export type { OopConceptVisualizerProps, DemoType, ClassDefinition, ObjectInstance };
export default OopConceptVisualizer;
