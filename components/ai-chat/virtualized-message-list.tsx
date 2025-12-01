"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import {
  List,
  AutoSizer,
  CellMeasurer,
  CellMeasurerCache,
} from "react-virtualized";
import type { MeasuredCellParent } from "react-virtualized/dist/es/CellMeasurer";
import type { UIMessage } from "ai";

interface VirtualizedMessageListProps {
  messages: UIMessage[];
  renderMessage: (message: UIMessage, index: number) => React.ReactNode;
  isLoading?: boolean;
  loadingIndicator?: React.ReactNode;
}

export function VirtualizedMessageList({
  messages,
  renderMessage,
  isLoading,
  loadingIndicator,
}: VirtualizedMessageListProps) {
  const listRef = useRef<List>(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);

  const cache = useRef(
    new CellMeasurerCache({
      fixedWidth: true,
      defaultHeight: 100,
    })
  );

  // Clear cache when messages change significantly
  useEffect(() => {
    cache.current.clearAll();
    listRef.current?.recomputeRowHeights();
  }, [messages.length]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (!isUserScrolling && listRef.current) {
      const totalRows = isLoading ? messages.length + 1 : messages.length;
      if (totalRows > 0) {
        listRef.current.scrollToRow(totalRows - 1);
      }
    }
  }, [messages, isLoading, isUserScrolling]);

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
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setIsUserScrolling(!isNearBottom);
    },
    []
  );

  const rowCount = isLoading ? messages.length + 1 : messages.length;

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
      // Loading indicator row
      if (isLoading && index === messages.length) {
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
              >
                {loadingIndicator}
              </div>
            )}
          </CellMeasurer>
        );
      }

      const message = messages[index];
      if (!message) return null;

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
            >
              {renderMessage(message, index)}
            </div>
          )}
        </CellMeasurer>
      );
    },
    [messages, renderMessage, isLoading, loadingIndicator]
  );

  if (messages.length === 0 && !isLoading) {
    return null;
  }

  return (
    <div className="flex-1 h-full">
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
}
