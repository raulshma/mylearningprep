'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sparkles,
  User,
  Globe,
  Code,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface JsTimelineExplorerProps {
  mode?: 'beginner' | 'intermediate' | 'advanced';
}

interface TimelineEvent {
  year: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  details?: string;
  color: string;
  significance: 'low' | 'medium' | 'high';
}

const timelineEvents: TimelineEvent[] = [
  {
    year: 1995,
    title: 'JavaScript is Born',
    description: 'Brendan Eich creates JavaScript in just 10 days at Netscape.',
    icon: <Sparkles className="w-5 h-5" />,
    details: 'Originally called Mocha, then LiveScript, renamed to JavaScript for marketing (Java was popular!). Created to make web pages interactive.',
    color: 'from-yellow-500 to-amber-500',
    significance: 'high',
  },
  {
    year: 1996,
    title: 'Microsoft Creates JScript',
    description: 'IE 3.0 ships with JScript, Microsoft\'s version of JavaScript.',
    icon: <Globe className="w-5 h-5" />,
    details: 'This began the "browser wars" - different browsers had different JavaScript implementations, causing compatibility nightmares for developers.',
    color: 'from-blue-500 to-indigo-500',
    significance: 'medium',
  },
  {
    year: 1997,
    title: 'ECMAScript 1',
    description: 'JavaScript is standardized as ECMAScript by ECMA International.',
    icon: <Code className="w-5 h-5" />,
    details: 'Netscape submitted JavaScript to ECMA for standardization. ES1 established the core language specification that all browsers should follow.',
    color: 'from-green-500 to-emerald-500',
    significance: 'high',
  },
  {
    year: 1999,
    title: 'ECMAScript 3',
    description: 'Added try/catch, regular expressions, and better string handling.',
    icon: <Code className="w-5 h-5" />,
    details: 'ES3 was a major update that added error handling and pattern matching. It remained the standard for 10 years!',
    color: 'from-green-500 to-teal-500',
    significance: 'medium',
  },
  {
    year: 2005,
    title: 'AJAX Revolution',
    description: 'Gmail and Google Maps show what JavaScript can really do.',
    icon: <Zap className="w-5 h-5" />,
    details: 'AJAX (Asynchronous JavaScript and XML) allowed pages to update without reloading. This changed web development forever.',
    color: 'from-purple-500 to-pink-500',
    significance: 'high',
  },
  {
    year: 2009,
    title: 'Node.js & ES5',
    description: 'JavaScript escapes the browser! Node.js enables server-side JS.',
    icon: <User className="w-5 h-5" />,
    details: 'Ryan Dahl created Node.js using Chrome\'s V8 engine. ES5 added strict mode, JSON support, and array methods like map/filter/reduce.',
    color: 'from-emerald-500 to-green-600',
    significance: 'high',
  },
  {
    year: 2015,
    title: 'ES6/ES2015',
    description: 'The biggest update ever! Classes, arrow functions, modules, and more.',
    icon: <Sparkles className="w-5 h-5" />,
    details: 'After 6 years, JavaScript got a massive overhaul: let/const, arrow functions, classes, promises, template literals, destructuring, and ES modules.',
    color: 'from-orange-500 to-red-500',
    significance: 'high',
  },
  {
    year: 2017,
    title: 'Async/Await',
    description: 'ES2017 makes asynchronous code much easier to write and read.',
    icon: <Clock className="w-5 h-5" />,
    details: 'The async/await syntax built on Promises to make asynchronous code look and behave like synchronous code.',
    color: 'from-cyan-500 to-blue-500',
    significance: 'medium',
  },
  {
    year: 2024,
    title: 'ES2024',
    description: 'Array grouping, Promise.withResolvers, and more modern features.',
    icon: <Calendar className="w-5 h-5" />,
    details: 'Object.groupBy(), Map.groupBy(), Promise.withResolvers(), RegExp v flag, and well-formed Unicode string methods.',
    color: 'from-violet-500 to-purple-600',
    significance: 'medium',
  },
];

export function JsTimelineExplorer({ mode = 'beginner' }: JsTimelineExplorerProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  const filteredEvents = mode === 'beginner' 
    ? timelineEvents.filter(e => e.significance === 'high')
    : timelineEvents;

  const maxIndex = filteredEvents.length - 1;

  const currentEvent = filteredEvents[selectedIndex];

  const handlePrev = useCallback(() => {
    setSelectedIndex(prev => Math.max(0, prev - 1));
    setIsExpanded(false);
  }, []);

  const handleNext = useCallback(() => {
    setSelectedIndex(prev => {
      return Math.min(maxIndex, prev + 1);
    });
    setIsExpanded(false);
  }, [maxIndex]);

  return (
    <div className="my-8 p-6 rounded-2xl bg-gradient-to-br from-background to-muted/30 border border-border">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-purple-500/10">
          <Calendar className="w-5 h-5 text-purple-500" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">JavaScript Timeline</h3>
          <p className="text-sm text-muted-foreground">
            {mode === 'beginner' 
              ? 'Explore the key moments in JavaScript history'
              : 'Complete history from 1995 to present'}
          </p>
        </div>
      </div>

      {/* Timeline Navigation */}
      <div className="relative mb-6">
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-muted -translate-y-1/2 rounded-full" />
        <div className="relative flex justify-between items-center">
          {filteredEvents.map((event, index) => (
            <motion.button
              key={event.year}
              onClick={() => {
                setSelectedIndex(index);
                setIsExpanded(false);
              }}
              className={cn(
                'relative z-10 w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                index === selectedIndex
                  ? 'bg-primary text-primary-foreground scale-125 shadow-lg'
                  : index < selectedIndex
                  ? 'bg-primary/50 text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
              whileHover={{ scale: index === selectedIndex ? 1.25 : 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              {event.year.toString().slice(-2)}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Current Event Display */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentEvent.year}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="rounded-xl border border-border overflow-hidden"
        >
          <div className={cn(
            'p-4 bg-gradient-to-r text-white',
            currentEvent.color
          )}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white/20">
                {currentEvent.icon}
              </div>
              <div>
                <div className="text-sm font-medium opacity-90">{currentEvent.year}</div>
                <h4 className="text-lg font-bold">{currentEvent.title}</h4>
              </div>
            </div>
          </div>

          <div className="p-4 bg-card">
            <p className="text-muted-foreground mb-4">
              {currentEvent.description}
            </p>

            {(mode !== 'beginner' || isExpanded) && currentEvent.details && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground"
              >
                {currentEvent.details}
              </motion.div>
            )}

            {mode === 'beginner' && !isExpanded && currentEvent.details && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(true)}
                className="text-primary"
              >
                Learn more →
              </Button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center mt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrev}
          disabled={selectedIndex === 0}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Previous
        </Button>
        
        <span className="text-sm text-muted-foreground">
          {selectedIndex + 1} of {filteredEvents.length}
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={handleNext}
          disabled={selectedIndex === filteredEvents.length - 1}
        >
          Next
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

export default JsTimelineExplorer;
