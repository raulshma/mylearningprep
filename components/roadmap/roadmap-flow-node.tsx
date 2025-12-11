'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { 
  CheckCircle2, 
  Circle, 
  Lock, 
  Play, 
  Star,
  ChevronRight 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RoadmapNode as RoadmapNodeType } from '@/lib/db/schemas/roadmap';
import type { NodeProgressStatus } from '@/lib/db/schemas/user-roadmap-progress';

// Node data type for React Flow
export type RoadmapFlowNodeData = {
  node: RoadmapNodeType;
  status: NodeProgressStatus;
  isActive: boolean;
  onNodeClick: (nodeId: string) => void;
};

export type RoadmapFlowNode = Node<RoadmapFlowNodeData, 'roadmapNode'>;

const statusColors: Record<NodeProgressStatus, { bg: string; border: string; text: string; icon: string }> = {
  locked: {
    bg: 'bg-muted/50',
    border: 'border-muted-foreground/20',
    text: 'text-muted-foreground',
    icon: 'text-muted-foreground/50',
  },
  available: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    text: 'text-blue-600 dark:text-blue-400',
    icon: 'text-blue-500',
  },
  'in-progress': {
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/50',
    text: 'text-yellow-600 dark:text-yellow-400',
    icon: 'text-yellow-500',
  },
  completed: {
    bg: 'bg-green-500/10',
    border: 'border-green-500/50',
    text: 'text-green-600 dark:text-green-400',
    icon: 'text-green-500',
  },
  skipped: {
    bg: 'bg-muted/30',
    border: 'border-muted-foreground/30',
    text: 'text-muted-foreground',
    icon: 'text-muted-foreground/70',
  },
};

const typeStyles: Record<RoadmapNodeType['type'], { size: string; shape: string }> = {
  milestone: {
    size: 'min-w-[180px] min-h-[60px] px-5 py-3',
    shape: 'rounded-2xl',
  },
  topic: {
    size: 'min-w-[140px] min-h-[50px] px-4 py-2.5',
    shape: 'rounded-xl',
  },
  checkpoint: {
    size: 'min-w-[120px] min-h-[44px] px-3 py-2',
    shape: 'rounded-full',
  },
  optional: {
    size: 'min-w-[130px] min-h-[46px] px-4 py-2',
    shape: 'rounded-xl border-dashed',
  },
};

function StatusIcon({ status }: { status: NodeProgressStatus }) {
  const iconClass = `w-4 h-4 ${statusColors[status].icon}`;
  
  switch (status) {
    case 'locked':
      return <Lock className={iconClass} />;
    case 'available':
      return <Circle className={iconClass} />;
    case 'in-progress':
      return <Play className={iconClass} fill="currentColor" />;
    case 'completed':
      return <CheckCircle2 className={iconClass} />;
    case 'skipped':
      return <ChevronRight className={iconClass} />;
  }
}

function RoadmapFlowNodeComponent({ data, selected }: NodeProps<RoadmapFlowNode>) {
  const { node, status, isActive, onNodeClick } = data;
  const colors = statusColors[status];
  const typeStyle = typeStyles[node.type];
  const isClickable = status !== 'locked';
  
  const handleClick = () => {
    if (isClickable) {
      onNodeClick(node.id);
    }
  };

  const handleStyle = {
    background: '#f59e0b',
    width: 8,
    height: 8,
    border: '2px solid #1f2937',
  };
  
  return (
    <>
      {/* Multiple handles for different connection points */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        style={handleStyle}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        style={handleStyle}
      />
      
      <button
        onClick={handleClick}
        disabled={!isClickable}
        className={cn(
          'group relative flex items-center gap-2 border-2 transition-all duration-200',
          typeStyle.size,
          typeStyle.shape,
          colors.bg,
          colors.border,
          isClickable && 'cursor-pointer hover:scale-105 hover:shadow-lg',
          !isClickable && 'cursor-not-allowed opacity-70',
          (isActive || selected) && 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-105 shadow-xl'
        )}
      >
        {/* Status Icon */}
        <StatusIcon status={status} />
        
        {/* Title */}
        <span className={cn(
          'font-medium text-sm truncate',
          colors.text,
          node.type === 'milestone' && 'font-semibold text-base'
        )}>
          {node.title}
        </span>
        
        {/* Sub-roadmap indicator */}
        {node.subRoadmapSlug && (
          <Star className="w-3 h-3 text-amber-500 ml-auto" fill="currentColor" />
        )}
        
        {/* Progress/Activity indicator for in-progress */}
        {status === 'in-progress' && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full animate-pulse" />
        )}
        
        {/* Hover tooltip */}
        {node.description && (
          <div className={cn(
            'absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2',
            'bg-popover text-popover-foreground text-xs rounded-lg shadow-xl',
            'opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none',
            'max-w-[200px] text-center whitespace-normal z-50'
          )}>
            {node.description}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-popover" />
          </div>
        )}
      </button>
      
      {/* Source handles (bottom and right) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={handleStyle}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={handleStyle}
      />
    </>
  );
}

export const RoadmapFlowNodeMemo = memo(RoadmapFlowNodeComponent);
