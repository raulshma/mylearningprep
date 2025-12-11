"use client";

import {
  useRef,
  useEffect,
  useCallback,
  useState,
  memo,
  useMemo,
} from "react";
import {
  List,
  AutoSizer,
  CellMeasurer,
  CellMeasurerCache,
} from "react-virtualized";
import type { MeasuredCellParent } from "react-virtualized/dist/es/CellMeasurer";
import { useChatStore, useActiveMessages, useStreamingMessage } from "@/lib/store/chat/store";
import type { Message, StreamingMessage } from "@/lib/store/chat/types";
import { cn } from "@/lib/utils";

/**
 * Threshold for enabling virtualization
 * Below this count, we render all messages directly for simplicity
 */
const VIRTUALIZATION_THRESHOLD = 50;

/**
 * Distance from bottom to consider "near bottom" for auto-scroll
 */
const SCROLL_THRESHOLD = 100;

interface MessageListProps {
  /**
   * Render function for each message
   */
  renderMessage: (message: Message, index: number, isLast: boolean) => React.ReactNode;
  /**
   * Render function for streaming message
   */
  renderStreamingMessage?: (streaming: StreamingMessage) => React.ReactNode;
  /**
   * Optional loading indicator to show at the bottom
   */
  loadingIndicator?: React.ReactNode;
  /**
   * Whether the assistant is currently loading/streaming
   */
  isLoading?: boolean;
  /**
   * Optional class name for the container
   */
  className?: string;
  /**
   * Optional empty state to show when no messages
   */
  emptyState?: React.ReactNode;
}

/**
 * Message list component with virtualization support
 * 
 * Features:
 * - Virtualization for lists > 50 messages (Requirements 2.5)
 * - Auto-scroll to bottom with user scroll detection
 * - Chronological message ordering (Requirements 3.6)
 * - Support for streaming messages
 */
export const MessageList = memo(function MessageList({
  renderMessage,
  renderStreamingMessage,
  loadingIndicator,
  isLoading = false,
  className,
  emptyState,
}: MessageListProps) {
  const messages = useActiveMessages();
  const streamingMessage = useStreamingMessage();
  
  // Sort messages chronologically (Requirements 3.6)
  const sortedMessages = useMemo(() => {
    return [...messages].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [messages]);

  const shouldVirtualize = sortedMessages.length > VIRTUALIZATION_THRESHOLD;

  if (sortedMessages.length === 0 && !isLoading && !streamingMessage) {
    return emptyState ?? null;
  }

  if (shouldVirtualize) {
    return (
      <VirtualizedList
        messages={sortedMessages}
        renderMessage={renderMessage}
        renderStreamingMessage={renderStreamingMessage}
        streamingMessage={streamingMessage}
        loadingIndicator={loadingIndicator}
        isLoading={isLoading}
        className={className}
      />
    );
  }

  return (
    <SimpleList
      messages={sortedMessages}
      renderMessage={renderMessage}
      renderStreamingMessage={renderStreamingMessage}
      streamingMessage={streamingMessage}
      loadingIndicator={loadingIndicator}
      isLoading={isLoading}
      className={className}
    />
  );
});

/**
 * Simple non-virtualized list for small message counts
 */
interface SimpleListProps {
  messages: Message[];
  renderMessage: (message: Message, index: number, isLast: boolean) => React.ReactNode;
  renderStreamingMessage?: (streaming: StreamingMessage) => React.ReactNode;
  streamingMessage: StreamingMessage | null;
  loadingIndicator?: React.ReactNode;
  isLoading: boolean;
  className?: string;
}

const SimpleList = memo(function SimpleList({
  messages,
  renderMessage,
  renderStreamingMessage,
  streamingMessage,
  loadingIndicator,
  isLoading,
  className,
}: SimpleListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const lastMessageCountRef = useRef(messages.length);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (!isUserScrolling && containerRef.current) {
      const hasNewMessages = messages.length > lastMessageCountRef.current;
      if (hasNewMessages || streamingMessage) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    }
    lastMessageCountRef.current = messages.length;
  }, [messages.length, streamingMessage, isUserScrolling]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isNearBottom =
      target.scrollHeight - target.scrollTop - target.clientHeight < SCROLL_THRESHOLD;
    setIsUserScrolling(!isNearBottom);
  }, []);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={cn("flex-1 overflow-y-auto", className)}
      id="message-list"
      role="log"
      aria-label="Chat messages"
      aria-live="polite"
      aria-relevant="additions"
    >
      <div className="flex flex-col gap-6 p-4">
        {messages.map((message, index) => (
          <article 
            key={message.id}
            aria-label={`Message from ${message.role === 'user' ? 'you' : 'AI assistant'}`}
          >
            {renderMessage(message, index, index === messages.length - 1 && !streamingMessage)}
          </article>
        ))}
        
        {/* Streaming message */}
        {streamingMessage && renderStreamingMessage && (
          <article 
            key="streaming"
            aria-label="AI assistant is responding"
            aria-busy="true"
          >
            {renderStreamingMessage(streamingMessage)}
          </article>
        )}
        
        {/* Loading indicator */}
        {isLoading && !streamingMessage && loadingIndicator && (
          <div 
            key="loading"
            role="status"
            aria-label="Loading response"
          >
            {loadingIndicator}
          </div>
        )}
      </div>
    </div>
  );
});

/**
 * Virtualized list for large message counts (> 50)
 * Uses react-virtualized for efficient rendering
 */
interface VirtualizedListProps {
  messages: Message[];
  renderMessage: (message: Message, index: number, isLast: boolean) => React.ReactNode;
  renderStreamingMessage?: (streaming: StreamingMessage) => React.ReactNode;
  streamingMessage: StreamingMessage | null;
  loadingIndicator?: React.ReactNode;
  isLoading: boolean;
  className?: string;
}

const VirtualizedList = memo(function VirtualizedList({
  messages,
  renderMessage,
  renderStreamingMessage,
  streamingMessage,
  loadingIndicator,
  isLoading,
  className,
}: VirtualizedListProps) {
  const listRef = useRef<List>(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);

  // Cache for measuring row heights
  const cache = useRef(
    new CellMeasurerCache({
      fixedWidth: true,
      defaultHeight: 100,
    })
  );

  // Calculate total row count including streaming/loading rows
  const extraRows = (streamingMessage ? 1 : 0) + (isLoading && !streamingMessage ? 1 : 0);
  const rowCount = messages.length + extraRows;

  // Clear cache when messages change significantly
  useEffect(() => {
    cache.current.clearAll();
    listRef.current?.recomputeRowHeights();
  }, [messages.length]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (!isUserScrolling && listRef.current && rowCount > 0) {
      listRef.current.scrollToRow(rowCount - 1);
    }
  }, [rowCount, isUserScrolling]);

  const handleScroll = useCallback(
    ({
      scrollTop,
      scrollHeight,
      clientHeight,
    }: {
      scrollTop: number;
      scrollHeight: number;
      clientHeight: number;
    }) => {
      const isNearBottom = scrollHeight - scrollTop - clientHeight < SCROLL_THRESHOLD;
      setIsUserScrolling(!isNearBottom);
    },
    []
  );

  const rowRenderer = useCallback(
    ({
      index,
      key,
      parent,
      style,
    }: {
      index: number;
      key: string;
      parent: MeasuredCellParent;
      style: React.CSSProperties;
    }) => {
      // Streaming message row
      if (streamingMessage && index === messages.length) {
        return (
          <CellMeasurer
            cache={cache.current}
            columnIndex={0}
            key={key}
            parent={parent}
            rowIndex={index}
          >
            {({ registerChild }) => (
              <div
                ref={registerChild as React.LegacyRef<HTMLDivElement>}
                style={style}
                className="px-4 py-3"
              >
                {renderStreamingMessage?.(streamingMessage)}
              </div>
            )}
          </CellMeasurer>
        );
      }

      // Loading indicator row
      if (isLoading && !streamingMessage && index === messages.length) {
        return (
          <CellMeasurer
            cache={cache.current}
            columnIndex={0}
            key={key}
            parent={parent}
            rowIndex={index}
          >
            {({ registerChild }) => (
              <div
                ref={registerChild as React.LegacyRef<HTMLDivElement>}
                style={style}
                className="px-4 py-3"
              >
                {loadingIndicator}
              </div>
            )}
          </CellMeasurer>
        );
      }

      // Regular message row
      const message = messages[index];
      if (!message) return null;

      const isLast = index === messages.length - 1 && !streamingMessage;

      return (
        <CellMeasurer
          cache={cache.current}
          columnIndex={0}
          key={key}
          parent={parent}
          rowIndex={index}
        >
          {({ registerChild }) => (
            <div
              ref={registerChild as React.LegacyRef<HTMLDivElement>}
              style={style}
              className="px-4 py-3"
            >
              {renderMessage(message, index, isLast)}
            </div>
          )}
        </CellMeasurer>
      );
    },
    [messages, renderMessage, renderStreamingMessage, streamingMessage, isLoading, loadingIndicator]
  );

  return (
    <div className={cn("flex-1 h-full", className)}>
      <AutoSizer>
        {({ height, width }) => (
          <List
            ref={listRef}
            height={height}
            width={width}
            rowCount={rowCount}
            rowHeight={cache.current.rowHeight}
            rowRenderer={rowRenderer}
            deferredMeasurementCache={cache.current}
            onScroll={handleScroll}
            overscanRowCount={5}
            scrollToAlignment="end"
          />
        )}
      </AutoSizer>
    </div>
  );
});

/**
 * Hook to get message list state
 * Useful for external components that need to know about scroll state
 */
export function useMessageListState() {
  const messages = useActiveMessages();
  const streamingMessage = useStreamingMessage();
  
  return {
    messageCount: messages.length,
    isVirtualized: messages.length > VIRTUALIZATION_THRESHOLD,
    hasStreamingMessage: streamingMessage !== null,
    isStreamingComplete: streamingMessage?.isComplete ?? true,
  };
}
