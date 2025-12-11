'use client';

import React, { useMemo } from 'react';
import type { RoadmapNode, RoadmapEdge } from '@/lib/db/schemas/roadmap';

interface RoadmapEdgesProps {
  nodes: RoadmapNode[];
  edges: RoadmapEdge[];
  offsetX: number;
  offsetY: number;
}

// Calculate the center of a node for edge connections
function getNodeCenter(node: RoadmapNode, offsetX: number, offsetY: number): { x: number; y: number } {
  // Approximate node dimensions based on type
  const widths: Record<RoadmapNode['type'], number> = {
    milestone: 180,
    topic: 140,
    checkpoint: 120,
    optional: 130,
  };
  const heights: Record<RoadmapNode['type'], number> = {
    milestone: 60,
    topic: 50,
    checkpoint: 44,
    optional: 46,
  };
  
  return {
    x: node.position.x - offsetX + widths[node.type] / 2,
    y: node.position.y - offsetY + heights[node.type] / 2,
  };
}

// Generate a curved path between two points
function generatePath(
  from: { x: number; y: number },
  to: { x: number; y: number },
  type: RoadmapEdge['type']
): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  
  // Calculate control points for a smooth bezier curve
  const midX = from.x + dx / 2;
  const midY = from.y + dy / 2;
  
  // Curve intensity based on distance
  const curveIntensity = Math.min(Math.abs(dx) * 0.3, 80);
  
  if (Math.abs(dy) > Math.abs(dx)) {
    // Mostly vertical - curve horizontally
    return `M ${from.x} ${from.y} C ${from.x} ${midY}, ${to.x} ${midY}, ${to.x} ${to.y}`;
  } else {
    // Mostly horizontal - curve vertically
    return `M ${from.x} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x} ${to.y}`;
  }
}

const edgeStyles: Record<RoadmapEdge['type'], { stroke: string; strokeWidth: number; dashArray?: string }> = {
  sequential: {
    stroke: 'hsl(var(--primary))',
    strokeWidth: 2,
  },
  recommended: {
    stroke: 'hsl(var(--muted-foreground))',
    strokeWidth: 1.5,
  },
  optional: {
    stroke: 'hsl(var(--muted-foreground))',
    strokeWidth: 1,
    dashArray: '4 4',
  },
};

export function RoadmapEdges({ nodes, edges, offsetX, offsetY }: RoadmapEdgesProps) {
  const nodeMap = useMemo(() => {
    const map = new Map<string, RoadmapNode>();
    for (const node of nodes) {
      map.set(node.id, node);
    }
    return map;
  }, [nodes]);
  
  const paths = useMemo(() => {
    return edges.map(edge => {
      const sourceNode = nodeMap.get(edge.source);
      const targetNode = nodeMap.get(edge.target);
      
      if (!sourceNode || !targetNode) return null;
      
      const from = getNodeCenter(sourceNode, offsetX, offsetY);
      const to = getNodeCenter(targetNode, offsetX, offsetY);
      
      // Adjust start/end points to edge of nodes
      const sourceWidth = sourceNode.type === 'milestone' ? 90 : 70;
      const targetWidth = targetNode.type === 'milestone' ? 90 : 70;
      const startY = from.y + (sourceNode.type === 'milestone' ? 30 : 25);
      const endY = to.y - (targetNode.type === 'milestone' ? 30 : 25);
      
      return {
        id: edge.id,
        path: generatePath(
          { x: from.x, y: startY },
          { x: to.x, y: endY },
          edge.type
        ),
        type: edge.type,
        label: edge.label,
        midPoint: { x: (from.x + to.x) / 2, y: (startY + endY) / 2 },
      };
    }).filter(Boolean);
  }, [edges, nodeMap, offsetX, offsetY]);
  
  // Calculate SVG viewBox dimensions
  const viewBoxWidth = useMemo(() => {
    const maxX = Math.max(...nodes.map(n => n.position.x - offsetX + 200));
    return Math.max(maxX, 800);
  }, [nodes, offsetX]);
  
  const viewBoxHeight = useMemo(() => {
    const maxY = Math.max(...nodes.map(n => n.position.y - offsetY + 100));
    return Math.max(maxY, 600);
  }, [nodes, offsetY]);
  
  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width={viewBoxWidth}
      height={viewBoxHeight}
      style={{ overflow: 'visible' }}
    >
      <defs>
        {/* Arrow marker for sequential edges */}
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon
            points="0 0, 10 3.5, 0 7"
            fill="hsl(var(--primary))"
          />
        </marker>
        <marker
          id="arrowhead-muted"
          markerWidth="8"
          markerHeight="6"
          refX="7"
          refY="3"
          orient="auto"
        >
          <polygon
            points="0 0, 8 3, 0 6"
            fill="hsl(var(--muted-foreground))"
          />
        </marker>
      </defs>
      
      {paths.map(pathData => {
        if (!pathData) return null;
        const style = edgeStyles[pathData.type];
        const markerId = pathData.type === 'sequential' ? 'arrowhead' : 'arrowhead-muted';
        
        return (
          <g key={pathData.id}>
            <path
              d={pathData.path}
              fill="none"
              stroke={style.stroke}
              strokeWidth={style.strokeWidth}
              strokeDasharray={style.dashArray}
              strokeLinecap="round"
              markerEnd={`url(#${markerId})`}
              opacity={0.6}
            />
          </g>
        );
      })}
    </svg>
  );
}
