'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface XPAwardAnimationProps {
  amount: number | null;
  onComplete?: () => void;
}

/**
 * Animated XP award notification that appears when XP is earned
 * Shows a floating "+X XP" animation with sparkle effect
 * Auto-dismisses after the animation completes
 * 
 * Design: The animation is driven by the `amount` prop.
 * - When amount is a positive number, show the animation
 * - The component manages auto-dismiss via setTimeout
 * - Uses a tracked "lastTriggeredAmount" to detect new amounts
 */
export function XPAwardAnimation({ amount, onComplete }: XPAwardAnimationProps) {
  // State to track if we're in the dismiss phase
  const [isDismissing, setIsDismissing] = useState(false);
  // Track the last amount we triggered for (to detect new amounts)
  const [triggeredFor, setTriggeredFor] = useState<number | null>(null);
  
  // Refs for timeout and callback (only accessed in effects)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onCompleteRef = useRef(onComplete);
  
  // Update onComplete ref in effect
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);
  
  // Derive if we should show based on amount and state
  // Show when: amount > 0 AND we haven't dismissed OR it's a new amount
  const isNewAmount = amount !== null && amount > 0 && amount !== triggeredFor;
  
  // Compute visibility: we're visible if we have a valid amount and not dismissing
  // Also reset dismissing state when we get a new amount
  const isVisible = useMemo(() => {
    if (isNewAmount) {
      return true; // New amount always shows
    }
    if (amount !== null && amount > 0 && !isDismissing) {
      return true; // Valid amount that hasn't been dismissed
    }
    return false;
  }, [amount, isDismissing, isNewAmount]);
  
  // Display amount is the current valid amount or the triggered amount
  const displayAmount = amount !== null && amount > 0 ? amount : triggeredFor;
  
  // Handle dismiss timer and new amount detection
  useEffect(() => {
    // If we have a new valid amount, set up the auto-dismiss
    if (amount !== null && amount > 0) {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // If this is a new amount, reset dismiss state via timeout (async)
      if (amount !== triggeredFor) {
        // Use a microtask to update state (not synchronous in effect)
        const resetTimeout = setTimeout(() => {
          setIsDismissing(false);
          setTriggeredFor(amount);
        }, 0);
        
        // Set up auto-dismiss after 2.5 seconds
        timeoutRef.current = setTimeout(() => {
          setIsDismissing(true);
          // Call onComplete after exit animation
          setTimeout(() => {
            onCompleteRef.current?.();
          }, 300);
        }, 2500);
        
        return () => {
          clearTimeout(resetTimeout);
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
        };
      }
      
      // Same amount, just set up dismiss timer
      timeoutRef.current = setTimeout(() => {
        setIsDismissing(true);
        setTimeout(() => {
          onCompleteRef.current?.();
        }, 300);
      }, 2500);
    } else if (amount === null && triggeredFor !== null) {
      // Amount reset to null, prepare for next animation via timeout
      setTimeout(() => {
        setTriggeredFor(null);
        setIsDismissing(false);
      }, 0);
    }
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [amount, triggeredFor]);

  return (
    <AnimatePresence>
      {isVisible && displayAmount !== null && (
        <motion.div
          key="xp-award"
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.8 }}
          transition={{ type: 'spring', bounce: 0.4 }}
          className="fixed bottom-8 right-8 z-50"
        >
          <motion.div
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-linear-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/40 shadow-lg backdrop-blur-sm"
            animate={{
              boxShadow: [
                '0 0 0 0 rgba(234, 179, 8, 0)',
                '0 0 20px 10px rgba(234, 179, 8, 0.3)',
                '0 0 0 0 rgba(234, 179, 8, 0)',
              ],
            }}
            transition={{ duration: 1, repeat: 1 }}
          >
            <motion.div
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ duration: 0.5, repeat: 2 }}
            >
              <Sparkles className="w-5 h-5 text-yellow-500" />
            </motion.div>
            <span className="text-lg font-bold text-yellow-500">
              +{displayAmount} XP
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface XPAwardInlineProps {
  amount: number;
  show: boolean;
}

/**
 * Inline XP award animation for use within components (like quiz feedback)
 */
export function XPAwardInline({ amount, show }: XPAwardInlineProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.span
          initial={{ opacity: 0, scale: 0.5, x: -10 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0.5 }}
          className="inline-flex items-center gap-1 text-yellow-500 font-medium"
        >
          <motion.span
            animate={{ rotate: [0, 15, -15, 0] }}
            transition={{ duration: 0.4 }}
          >
            <Sparkles className="w-3.5 h-3.5" />
          </motion.span>
          +{amount} XP
        </motion.span>
      )}
    </AnimatePresence>
  );
}
