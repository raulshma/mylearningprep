import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatLatency(ms: number): string {
  if (ms > 1000) return `${(ms / 1000).toFixed(2)}s`
  return `${ms}ms`
}
