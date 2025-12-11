'use client';

import ELK, { ElkNode, ElkExtendedEdge } from 'elkjs/lib/elk.bundled.js';
import type { RoadmapNode, RoadmapEdge } from '@/lib/db/schemas/roadmap';

export type ElkLayoutType = 'layered' | 'mrtree' | 'force' | 'stress';

const elk = new ELK();

// Node dimensions by type
const NODE_DIMENSIONS: Record<RoadmapNode['type'], { width: number; height: number }> = {
  milestone: { width: 200, height: 70 },
  topic: { width: 160, height: 60 },
  checkpoint: { width: 140, height: 50 },
  optional: { width: 150, height: 55 },
};

// Layout algorithm configurations with increased spacing
const LAYOUT_CONFIGS: Record<ElkLayoutType, Record<string, string>> = {
  layered: {
    'elk.algorithm': 'layered',
    'elk.direction': 'DOWN',
    'elk.spacing.nodeNode': '80',
    'elk.spacing.componentComponent': '100',
    'elk.layered.spacing.nodeNodeBetweenLayers': '100',
    'elk.layered.spacing.edgeNodeBetweenLayers': '40',
    'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
    'elk.edgeRouting': 'ORTHOGONAL',
    'elk.separateConnectedComponents': 'false',
  },
  mrtree: {
    'elk.algorithm': 'mrtree',
    'elk.direction': 'DOWN',
    'elk.spacing.nodeNode': '80',
    'elk.mrtree.weighting': 'CONSTRAINT',
    'elk.mrtree.searchOrder': 'DFS',
  },
  force: {
    'elk.algorithm': 'force',
    'elk.spacing.nodeNode': '120',
    'elk.force.iterations': '400',
    'elk.force.repulsion': '2.0',
  },
  stress: {
    'elk.algorithm': 'stress',
    'elk.spacing.nodeNode': '100',
    'elk.stress.desiredEdgeLength': '200',
    'elk.stress.epsilon': '0.001',
  },
};

export interface LayoutResult {
  nodes: { id: string; x: number; y: number; width: number; height: number }[];
  edges: { id: string; sourceHandle?: string; targetHandle?: string }[];
  width: number;
  height: number;
}

export async function computeElkLayout(
  nodes: RoadmapNode[],
  edges: RoadmapEdge[],
  layoutType: ElkLayoutType = 'layered'
): Promise<LayoutResult> {
  // Build ELK graph
  const elkNodes: ElkNode[] = nodes.map((node) => {
    const dims = NODE_DIMENSIONS[node.type];
    return {
      id: node.id,
      width: dims.width,
      height: dims.height,
      // Define ports for multiple handles
      ports: [
        { id: `${node.id}-top`, properties: { 'port.side': 'NORTH' } },
        { id: `${node.id}-bottom`, properties: { 'port.side': 'SOUTH' } },
        { id: `${node.id}-left`, properties: { 'port.side': 'WEST' } },
        { id: `${node.id}-right`, properties: { 'port.side': 'EAST' } },
      ],
    };
  });

  const elkEdges: ElkExtendedEdge[] = edges.map((edge) => ({
    id: edge.id,
    sources: [`${edge.source}-bottom`],
    targets: [`${edge.target}-top`],
  }));

  const graph: ElkNode = {
    id: 'root',
    layoutOptions: {
      ...LAYOUT_CONFIGS[layoutType],
      'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
    },
    children: elkNodes,
    edges: elkEdges,
  };

  try {
    const layoutedGraph = await elk.layout(graph);
    
    const layoutedNodes = (layoutedGraph.children || []).map((node) => ({
      id: node.id,
      x: node.x || 0,
      y: node.y || 0,
      width: node.width || 100,
      height: node.height || 50,
    }));

    const layoutedEdges = edges.map((edge) => ({
      id: edge.id,
      sourceHandle: 'bottom',
      targetHandle: 'top',
    }));

    return {
      nodes: layoutedNodes,
      edges: layoutedEdges,
      width: layoutedGraph.width || 800,
      height: layoutedGraph.height || 600,
    };
  } catch (error) {
    console.error('ELK layout failed:', error);
    // Fallback to original positions
    return {
      nodes: nodes.map((node) => ({
        id: node.id,
        x: node.position.x,
        y: node.position.y,
        ...NODE_DIMENSIONS[node.type],
      })),
      edges: edges.map((edge) => ({ id: edge.id })),
      width: 800,
      height: 600,
    };
  }
}
