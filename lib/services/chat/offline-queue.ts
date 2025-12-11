/**
 * Offline Queue Service
 *
 * Handles action queueing when offline and retry on connectivity restore.
 * Provides resilient message handling for the AI Chat feature.
 *
 * Requirements: 11.3 - Queue pending actions and retry when connection restores
 */

import { errorHandler, createChatError, type ChatError, type ErrorCategory } from './error-handler';

// =============================================================================
// Types
// =============================================================================

export type QueuedActionType = 'send-message' | 'create-conversation' | 'update-conversation' | 'delete-conversation';

export interface QueuedAction<T = unknown> {
  id: string;
  type: QueuedActionType;
  payload: T;
  createdAt: Date;
  retryCount: number;
  lastError?: ChatError;
  priority: number; // Lower number = higher priority
}

export interface SendMessagePayload {
  content: string;
  conversationId?: string;
  files?: Array<{ id: string; name: string; type: string; size: number; dataUrl: string }>;
  modelId?: string;
  providerTools?: string[];
}

export interface CreateConversationPayload {
  title?: string;
  chatMode: 'single' | 'multi';
  context?: {
    interviewId?: string;
    learningPathId?: string;
  };
}

export interface UpdateConversationPayload {
  conversationId: string;
  updates: Record<string, unknown>;
}

export interface DeleteConversationPayload {
  conversationId: string;
}

export type ActionPayload = 
  | SendMessagePayload 
  | CreateConversationPayload 
  | UpdateConversationPayload 
  | DeleteConversationPayload;

export interface QueueState {
  isOnline: boolean;
  isProcessing: boolean;
  queue: QueuedAction[];
}

export interface QueueCallbacks {
  onOnlineStatusChange?: (isOnline: boolean) => void;
  onActionQueued?: (action: QueuedAction) => void;
  onActionProcessing?: (action: QueuedAction) => void;
  onActionComplete?: (action: QueuedAction, result: unknown) => void;
  onActionFailed?: (action: QueuedAction, error: ChatError) => void;
  onQueueEmpty?: () => void;
}

export interface ActionExecutor<T = unknown, R = unknown> {
  (payload: T): Promise<R>;
}

// =============================================================================
// Constants
// =============================================================================

const STORAGE_KEY = 'chat_offline_queue';
const MAX_QUEUE_SIZE = 100;
const MAX_RETRIES = 3;
const PROCESS_DELAY_MS = 500; // Delay between processing actions

// Priority levels (lower = higher priority)
const PRIORITY: Record<QueuedActionType, number> = {
  'create-conversation': 1,
  'send-message': 2,
  'update-conversation': 3,
  'delete-conversation': 4,
};

// =============================================================================
// Offline Queue Service Interface
// =============================================================================

export interface OfflineQueueService {
  /**
   * Initialize the queue service and start listening for connectivity changes
   */
  initialize(callbacks?: QueueCallbacks): void;

  /**
   * Cleanup and stop listening for connectivity changes
   */
  destroy(): void;

  /**
   * Check if currently online
   */
  isOnline(): boolean;

  /**
   * Queue an action for later execution
   * Requirements: 11.3 - Queue pending actions when offline
   */
  enqueue<T extends ActionPayload>(type: QueuedActionType, payload: T): QueuedAction<T>;

  /**
   * Remove an action from the queue
   */
  dequeue(actionId: string): boolean;

  /**
   * Get all queued actions
   */
  getQueue(): QueuedAction[];

  /**
   * Get queue size
   */
  getQueueSize(): number;

  /**
   * Clear all queued actions
   */
  clearQueue(): void;

  /**
   * Register an executor for a specific action type
   */
  registerExecutor<T, R>(type: QueuedActionType, executor: ActionExecutor<T, R>): void;

  /**
   * Process the queue (called automatically on connectivity restore)
   * Requirements: 11.3 - Retry when connection restores
   */
  processQueue(): Promise<void>;

  /**
   * Get current queue state
   */
  getState(): QueueState;
}

// =============================================================================
// Offline Queue Implementation
// =============================================================================

class OfflineQueueServiceImpl implements OfflineQueueService {
  private queue: QueuedAction[] = [];
  private isOnlineState = true;
  private isProcessing = false;
  private callbacks: QueueCallbacks = {};
  private executors: Map<QueuedActionType, ActionExecutor> = new Map();
  private initialized = false;
  private boundHandleOnline: () => void;
  private boundHandleOffline: () => void;

  constructor() {
    this.boundHandleOnline = this.handleOnline.bind(this);
    this.boundHandleOffline = this.handleOffline.bind(this);
  }

  initialize(callbacks: QueueCallbacks = {}): void {
    if (this.initialized) return;

    this.callbacks = callbacks;
    this.loadFromStorage();

    // Check initial online status
    if (typeof navigator !== 'undefined') {
      this.isOnlineState = navigator.onLine;
    }

    // Listen for connectivity changes
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.boundHandleOnline);
      window.addEventListener('offline', this.boundHandleOffline);
    }

    this.initialized = true;

    // Process queue if online and has items
    if (this.isOnlineState && this.queue.length > 0) {
      this.processQueue();
    }
  }

  destroy(): void {
    if (!this.initialized) return;

    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.boundHandleOnline);
      window.removeEventListener('offline', this.boundHandleOffline);
    }

    this.saveToStorage();
    this.initialized = false;
  }

  isOnline(): boolean {
    return this.isOnlineState;
  }

  enqueue<T extends ActionPayload>(type: QueuedActionType, payload: T): QueuedAction<T> {
    // Check queue size limit
    if (this.queue.length >= MAX_QUEUE_SIZE) {
      // Remove oldest low-priority action
      const lowestPriorityIndex = this.findLowestPriorityIndex();
      if (lowestPriorityIndex !== -1) {
        this.queue.splice(lowestPriorityIndex, 1);
      }
    }

    const action: QueuedAction<T> = {
      id: generateActionId(),
      type,
      payload,
      createdAt: new Date(),
      retryCount: 0,
      priority: PRIORITY[type],
    };

    // Insert in priority order
    const insertIndex = this.findInsertIndex(action.priority);
    this.queue.splice(insertIndex, 0, action);

    this.saveToStorage();
    this.callbacks.onActionQueued?.(action);

    return action;
  }

  dequeue(actionId: string): boolean {
    const index = this.queue.findIndex(a => a.id === actionId);
    if (index === -1) return false;

    this.queue.splice(index, 1);
    this.saveToStorage();
    return true;
  }

  getQueue(): QueuedAction[] {
    return [...this.queue];
  }

  getQueueSize(): number {
    return this.queue.length;
  }

  clearQueue(): void {
    this.queue = [];
    this.saveToStorage();
  }

  registerExecutor<T, R>(type: QueuedActionType, executor: ActionExecutor<T, R>): void {
    this.executors.set(type, executor as ActionExecutor);
  }

  async processQueue(): Promise<void> {
    if (this.isProcessing || !this.isOnlineState || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.queue.length > 0 && this.isOnlineState) {
        const action = this.queue[0];
        const executor = this.executors.get(action.type);

        if (!executor) {
          console.warn(`[OfflineQueue] No executor registered for action type: ${action.type}`);
          this.queue.shift();
          continue;
        }

        this.callbacks.onActionProcessing?.(action);

        try {
          const result = await executor(action.payload);
          
          // Success - remove from queue
          this.queue.shift();
          this.saveToStorage();
          this.callbacks.onActionComplete?.(action, result);

          // Small delay between actions to avoid overwhelming the server
          if (this.queue.length > 0) {
            await sleep(PROCESS_DELAY_MS);
          }
        } catch (error) {
          const chatError = createChatError(error, { actionId: action.id, actionType: action.type });
          action.lastError = chatError;
          action.retryCount++;

          if (action.retryCount >= MAX_RETRIES || !errorHandler.isRetryable(chatError)) {
            // Max retries reached or not retryable - remove from queue
            this.queue.shift();
            this.saveToStorage();
            this.callbacks.onActionFailed?.(action, chatError);
          } else {
            // Will retry on next process cycle
            this.saveToStorage();
            
            // If it's a network error, stop processing (we're probably offline)
            if (chatError.category === 'network') {
              break;
            }

            // Wait before retrying
            const delay = errorHandler.calculateRetryDelay(chatError.category, action.retryCount - 1);
            if (delay > 0) {
              await sleep(delay);
            }
          }
        }
      }

      if (this.queue.length === 0) {
        this.callbacks.onQueueEmpty?.();
      }
    } finally {
      this.isProcessing = false;
    }
  }

  getState(): QueueState {
    return {
      isOnline: this.isOnlineState,
      isProcessing: this.isProcessing,
      queue: [...this.queue],
    };
  }

  // =============================================================================
  // Private Methods
  // =============================================================================

  private handleOnline(): void {
    this.isOnlineState = true;
    this.callbacks.onOnlineStatusChange?.(true);
    
    // Requirements: 11.3 - Retry when connection restores
    if (this.queue.length > 0) {
      this.processQueue();
    }
  }

  private handleOffline(): void {
    this.isOnlineState = false;
    this.callbacks.onOnlineStatusChange?.(false);
  }

  private findInsertIndex(priority: number): number {
    // Find the first action with lower priority (higher number)
    for (let i = 0; i < this.queue.length; i++) {
      if (this.queue[i].priority > priority) {
        return i;
      }
    }
    return this.queue.length;
  }

  private findLowestPriorityIndex(): number {
    if (this.queue.length === 0) return -1;
    
    let lowestIndex = 0;
    let lowestPriority = this.queue[0].priority;
    
    for (let i = 1; i < this.queue.length; i++) {
      if (this.queue[i].priority > lowestPriority) {
        lowestPriority = this.queue[i].priority;
        lowestIndex = i;
      }
    }
    
    return lowestIndex;
  }

  private saveToStorage(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const serialized = JSON.stringify(this.queue.map(action => ({
        ...action,
        createdAt: action.createdAt.toISOString(),
        lastError: action.lastError ? {
          ...action.lastError,
          timestamp: action.lastError.timestamp.toISOString(),
        } : undefined,
      })));
      localStorage.setItem(STORAGE_KEY, serialized);
    } catch (error) {
      console.warn('[OfflineQueue] Failed to save to storage:', error);
    }
  }

  private loadFromStorage(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const serialized = localStorage.getItem(STORAGE_KEY);
      if (!serialized) return;

      const parsed = JSON.parse(serialized) as Array<{
        id: string;
        type: QueuedActionType;
        payload: unknown;
        createdAt: string;
        retryCount: number;
        lastError?: {
          message: string;
          code?: string;
          category: ErrorCategory;
          timestamp: string;
        };
        priority: number;
      }>;

      this.queue = parsed.map(item => ({
        ...item,
        createdAt: new Date(item.createdAt),
        lastError: item.lastError ? {
          ...item.lastError,
          timestamp: new Date(item.lastError.timestamp),
        } : undefined,
      }));
    } catch (error) {
      console.warn('[OfflineQueue] Failed to load from storage:', error);
      this.queue = [];
    }
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

function generateActionId(): string {
  return `action_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// =============================================================================
// Singleton Instance
// =============================================================================

export const offlineQueueService: OfflineQueueService = new OfflineQueueServiceImpl();

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Queue a message to be sent when online
 */
export function queueMessage(payload: SendMessagePayload): QueuedAction<SendMessagePayload> {
  return offlineQueueService.enqueue('send-message', payload);
}

/**
 * Queue a conversation creation
 */
export function queueCreateConversation(payload: CreateConversationPayload): QueuedAction<CreateConversationPayload> {
  return offlineQueueService.enqueue('create-conversation', payload);
}

/**
 * Queue a conversation update
 */
export function queueUpdateConversation(payload: UpdateConversationPayload): QueuedAction<UpdateConversationPayload> {
  return offlineQueueService.enqueue('update-conversation', payload);
}

/**
 * Queue a conversation deletion
 */
export function queueDeleteConversation(payload: DeleteConversationPayload): QueuedAction<DeleteConversationPayload> {
  return offlineQueueService.enqueue('delete-conversation', payload);
}

// =============================================================================
// Export for testing
// =============================================================================

export { OfflineQueueServiceImpl, generateActionId, STORAGE_KEY, MAX_QUEUE_SIZE, MAX_RETRIES, PRIORITY };
