/**
 * Performance Utilities
 *
 * Provides utilities for optimizing React component performance
 * including comparison helpers and measurement tools.
 *
 * Requirements: 10.5 - Minimize unnecessary re-renders through proper memoization
 */

// =============================================================================
// Shallow Comparison Utilities
// =============================================================================

/**
 * Shallow compare two objects for equality
 * Useful for custom memo comparison functions
 */
export function shallowEqual<T extends Record<string, unknown>>(
  objA: T,
  objB: T
): boolean {
  if (objA === objB) return true;
  if (!objA || !objB) return false;

  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (objA[key] !== objB[key]) return false;
  }

  return true;
}

/**
 * Shallow compare two arrays for equality
 */
export function shallowArrayEqual<T>(arrA: T[], arrB: T[]): boolean {
  if (arrA === arrB) return true;
  if (arrA.length !== arrB.length) return false;

  for (let i = 0; i < arrA.length; i++) {
    if (arrA[i] !== arrB[i]) return false;
  }

  return true;
}

/**
 * Deep compare two values for equality
 * Use sparingly as it's more expensive than shallow comparison
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  
  if (typeof a !== typeof b) return false;
  
  if (a === null || b === null) return a === b;
  
  if (typeof a !== 'object') return a === b;
  
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => deepEqual(item, b[index]));
  }
  
  if (Array.isArray(a) || Array.isArray(b)) return false;
  
  const objA = a as Record<string, unknown>;
  const objB = b as Record<string, unknown>;
  
  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);
  
  if (keysA.length !== keysB.length) return false;
  
  return keysA.every(key => deepEqual(objA[key], objB[key]));
}

// =============================================================================
// Selector Optimization
// =============================================================================

/**
 * Create a memoized selector that only recomputes when inputs change
 * Similar to reselect but simpler
 */
export function createSelector<TInput, TOutput>(
  inputSelector: () => TInput,
  resultFn: (input: TInput) => TOutput
): () => TOutput {
  let lastInput: TInput | undefined;
  let lastResult: TOutput | undefined;

  return () => {
    const input = inputSelector();
    
    if (input !== lastInput) {
      lastInput = input;
      lastResult = resultFn(input);
    }

    return lastResult as TOutput;
  };
}

/**
 * Create a memoized selector with multiple inputs
 */
export function createSelectorMulti<TInputs extends unknown[], TOutput>(
  inputSelectors: { [K in keyof TInputs]: () => TInputs[K] },
  resultFn: (...inputs: TInputs) => TOutput
): () => TOutput {
  let lastInputs: TInputs | undefined;
  let lastResult: TOutput | undefined;

  return () => {
    const inputs = inputSelectors.map((selector) => selector()) as TInputs;
    
    const inputsChanged = !lastInputs || 
      inputs.some((input, i) => input !== lastInputs![i]);

    if (inputsChanged) {
      lastInputs = inputs;
      lastResult = resultFn(...inputs);
    }

    return lastResult as TOutput;
  };
}

// =============================================================================
// Performance Measurement
// =============================================================================

/**
 * Measure execution time of a function
 */
export function measureTime<T>(
  fn: () => T,
  label?: string
): { result: T; timeMs: number } {
  const start = performance.now();
  const result = fn();
  const timeMs = performance.now() - start;

  if (label && process.env.NODE_ENV === 'development') {
    console.log(`[Performance] ${label}: ${timeMs.toFixed(2)}ms`);
  }

  return { result, timeMs };
}

/**
 * Async version of measureTime
 */
export async function measureTimeAsync<T>(
  fn: () => Promise<T>,
  label?: string
): Promise<{ result: T; timeMs: number }> {
  const start = performance.now();
  const result = await fn();
  const timeMs = performance.now() - start;

  if (label && process.env.NODE_ENV === 'development') {
    console.log(`[Performance] ${label}: ${timeMs.toFixed(2)}ms`);
  }

  return { result, timeMs };
}

// =============================================================================
// RAF Utilities
// =============================================================================

/**
 * Schedule a callback to run on the next animation frame
 * Returns a cancel function
 */
export function scheduleFrame(callback: () => void): () => void {
  const frameId = requestAnimationFrame(callback);
  return () => cancelAnimationFrame(frameId);
}

/**
 * Debounce a function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | undefined;
  
  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Throttle a function
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      fn(...args);
    }
  };
}

// =============================================================================
// Memo Comparison Functions
// =============================================================================

/**
 * Create a custom comparison function for React.memo
 * that only compares specific props
 */
export function createPropsComparator<T extends Record<string, unknown>>(
  propsToCompare: (keyof T)[]
): (prevProps: T, nextProps: T) => boolean {
  return (prevProps: T, nextProps: T) => {
    for (const prop of propsToCompare) {
      if (prevProps[prop] !== nextProps[prop]) {
        return false;
      }
    }
    return true;
  };
}

/**
 * Create a comparison function that ignores specific props
 */
export function createPropsComparatorExcluding<T extends Record<string, unknown>>(
  propsToIgnore: (keyof T)[]
): (prevProps: T, nextProps: T) => boolean {
  const ignoreSet = new Set(propsToIgnore);
  
  return (prevProps: T, nextProps: T) => {
    const allKeys = new Set([...Object.keys(prevProps), ...Object.keys(nextProps)]);
    
    for (const key of allKeys) {
      if (ignoreSet.has(key as keyof T)) continue;
      if (prevProps[key] !== nextProps[key]) {
        return false;
      }
    }
    return true;
  };
}
