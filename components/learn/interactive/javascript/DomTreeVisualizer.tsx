'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  ChevronDown,
  TreeDeciduous,
  RotateCcw,
  Expand,
  Minimize,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// Types for DOM tree visualization
export interface DomTreeNode {
  tagName: string;
  attributes: Record<string, string>;
  children: DomTreeNode[];
  textContent?: string;
  id: string;
}

export interface DomTreeVisualizerProps {
  /** HTML string to parse and visualize */
  html?: string;
  /** CSS selector to highlight specific elements */
  highlightSelector?: string;
  /** Whether to show element attributes */
  showAttributes?: boolean;
  /** Whether the tree is interactive (clickable) */
  interactive?: boolean;
  /** Callback when a node is selected */
  onNodeSelect?: (node: DomTreeNode | null) => void;
}

// Default HTML for demonstration
const defaultHtml = `<html>
  <head>
    <title>My Website</title>
    <meta charset="UTF-8" />
  </head>
  <body>
    <header class="main-header">
      <nav id="main-nav">
        <ul>
          <li><a href="/">Home</a></li>
          <li><a href="/about">About</a></li>
        </ul>
      </nav>
    </header>
    <main>
      <article>
        <h1>Welcome!</h1>
        <p class="intro">This is a paragraph.</p>
      </article>
    </main>
    <footer>
      <p>© 2024</p>
    </footer>
  </body>
</html>`;

// Color mapping for different element types
const elementColors: Record<string, { bg: string; text: string; border: string }> = {
  html: { bg: 'bg-purple-500/10', text: 'text-purple-500', border: 'border-purple-500/30' },
  head: { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/30' },
  body: { bg: 'bg-green-500/10', text: 'text-green-500', border: 'border-green-500/30' },
  header: { bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-500/30' },
  nav: { bg: 'bg-cyan-500/10', text: 'text-cyan-500', border: 'border-cyan-500/30' },
  main: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/30' },
  footer: { bg: 'bg-slate-500/10', text: 'text-slate-500', border: 'border-slate-500/30' },
  article: { bg: 'bg-indigo-500/10', text: 'text-indigo-500', border: 'border-indigo-500/30' },
  section: { bg: 'bg-violet-500/10', text: 'text-violet-500', border: 'border-violet-500/30' },
  div: { bg: 'bg-zinc-500/10', text: 'text-zinc-500', border: 'border-zinc-500/30' },
  '#text': { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/30' },
};

const defaultColors = { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/30' };


/**
 * Parse HTML string into a DOM tree structure
 * Requirements: 2.5
 */
function parseHtmlToTree(html: string): DomTreeNode[] {
  const nodes: DomTreeNode[] = [];
  let idCounter = 0;

  const generateId = () => `dom-node-${idCounter++}`;

  // Clean up the HTML
  const cleanHtml = html.trim();
  if (!cleanHtml) return nodes;

  // Simple regex-based parser for demonstration
  // Handles: <tag attr="value">content</tag>, <tag />, and text nodes
  const tagRegex = /<(\w+)([^>]*)>([\s\S]*?)<\/\1>|<(\w+)([^>]*)\s*\/?>|([^<]+)/g;
  let match;

  while ((match = tagRegex.exec(cleanHtml)) !== null) {
    if (match[1]) {
      // Opening and closing tag pair
      const tagName = match[1].toLowerCase();
      const attrString = match[2] || '';
      const innerContent = match[3] || '';

      const attributes = parseAttributes(attrString);
      const children = parseHtmlToTree(innerContent);

      nodes.push({
        tagName,
        attributes,
        children,
        id: generateId(),
      });
    } else if (match[4]) {
      // Self-closing tag
      const tagName = match[4].toLowerCase();
      const attrString = match[5] || '';
      const attributes = parseAttributes(attrString);

      nodes.push({
        tagName,
        attributes,
        children: [],
        id: generateId(),
      });
    } else if (match[6]) {
      // Text content
      const text = match[6].trim();
      if (text) {
        nodes.push({
          tagName: '#text',
          attributes: {},
          children: [],
          textContent: text,
          id: generateId(),
        });
      }
    }
  }

  return nodes;
}

/**
 * Parse attribute string into key-value pairs
 */
function parseAttributes(attrString: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  const attrRegex = /(\w+[-\w]*)(?:=["']([^"']*)["'])?/g;
  let match;

  while ((match = attrRegex.exec(attrString)) !== null) {
    const name = match[1];
    const value = match[2] || '';
    attributes[name] = value;
  }

  return attributes;
}

/**
 * Collect all node IDs from a tree
 */
function collectAllIds(nodes: DomTreeNode[]): Set<string> {
  const ids = new Set<string>();
  const traverse = (nodeList: DomTreeNode[]) => {
    nodeList.forEach((node) => {
      ids.add(node.id);
      traverse(node.children);
    });
  };
  traverse(nodes);
  return ids;
}

/**
 * Find a node by ID in the tree
 */
function findNodeById(nodes: DomTreeNode[], id: string): DomTreeNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findNodeById(node.children, id);
    if (found) return found;
  }
  return null;
}

/**
 * Check if a node matches a simple CSS selector
 */
function matchesSelector(node: DomTreeNode, selector: string): boolean {
  if (!selector) return false;
  
  // ID selector
  if (selector.startsWith('#')) {
    return node.attributes.id === selector.slice(1);
  }
  
  // Class selector
  if (selector.startsWith('.')) {
    const classes = (node.attributes.class || '').split(' ');
    return classes.includes(selector.slice(1));
  }
  
  // Tag selector
  return node.tagName.toLowerCase() === selector.toLowerCase();
}

/**
 * Count total nodes in tree
 */
function countNodes(nodes: DomTreeNode[]): number {
  return nodes.reduce((count, node) => count + 1 + countNodes(node.children), 0);
}


/**
 * DomTreeVisualizer Component
 * Interactive visualization of HTML as a DOM tree structure
 * Requirements: 2.5
 */
export function DomTreeVisualizer({
  html = defaultHtml,
  highlightSelector,
  showAttributes = true,
  interactive = true,
  onNodeSelect,
}: DomTreeVisualizerProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => {
    // Initially expand first few levels
    const tree = parseHtmlToTree(html);
    const initialExpanded = new Set<string>();
    const expandLevel = (nodes: DomTreeNode[], depth: number) => {
      if (depth > 2) return;
      nodes.forEach((node) => {
        initialExpanded.add(node.id);
        expandLevel(node.children, depth + 1);
      });
    };
    expandLevel(tree, 0);
    return initialExpanded;
  });
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const domTree = useMemo(() => parseHtmlToTree(html), [html]);
  const totalNodes = useMemo(() => countNodes(domTree), [domTree]);

  const toggleNode = useCallback((nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  const handleNodeSelect = useCallback((nodeId: string) => {
    if (!interactive) return;
    setSelectedNode(nodeId);
    const node = findNodeById(domTree, nodeId);
    onNodeSelect?.(node);
  }, [interactive, domTree, onNodeSelect]);

  const expandAll = useCallback(() => {
    setExpandedNodes(collectAllIds(domTree));
  }, [domTree]);

  const collapseAll = useCallback(() => {
    setExpandedNodes(new Set());
  }, []);

  const handleReset = useCallback(() => {
    setSelectedNode(null);
    setSearchQuery('');
    // Reset to initial expanded state
    const initialExpanded = new Set<string>();
    const expandLevel = (nodes: DomTreeNode[], depth: number) => {
      if (depth > 2) return;
      nodes.forEach((node) => {
        initialExpanded.add(node.id);
        expandLevel(node.children, depth + 1);
      });
    };
    expandLevel(domTree, 0);
    setExpandedNodes(initialExpanded);
    onNodeSelect?.(null);
  }, [domTree, onNodeSelect]);

  const selectedNodeData = selectedNode ? findNodeById(domTree, selectedNode) : null;

  return (
    <Card className="w-full max-w-4xl mx-auto my-8 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-secondary/30">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <TreeDeciduous className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">DOM Tree Visualizer</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={expandAll} className="gap-1">
              <Expand className="w-3 h-3" />
              Expand All
            </Button>
            <Button variant="outline" size="sm" onClick={collapseAll} className="gap-1">
              <Minimize className="w-3 h-3" />
              Collapse
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset} className="gap-1">
              <RotateCcw className="w-3 h-3" />
              Reset
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Explore how HTML is represented as a tree structure in the browser
        </p>
      </div>

      {/* Search */}
      <div className="px-6 py-3 border-b border-border bg-secondary/10">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by tag, class (.class), or id (#id)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      <div className="grid md:grid-cols-5 gap-0">
        {/* Tree View */}
        <div className="md:col-span-3 p-4 border-r border-border">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Document Tree
            </span>
            <span className="text-xs text-muted-foreground">
              {totalNodes} nodes
            </span>
          </div>
          <div
            className="font-mono text-sm overflow-auto bg-zinc-950/50 rounded-lg p-3"
            style={{ maxHeight: 400 }}
          >
            {domTree.map((node) => (
              <TreeNode
                key={node.id}
                node={node}
                depth={0}
                expandedNodes={expandedNodes}
                selectedNode={selectedNode}
                highlightSelector={highlightSelector || searchQuery}
                showAttributes={showAttributes}
                interactive={interactive}
                onToggle={toggleNode}
                onSelect={handleNodeSelect}
              />
            ))}
          </div>
        </div>

        {/* Details Panel */}
        <div className="md:col-span-2 p-4 bg-secondary/10">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            Element Details
          </span>
          <AnimatePresence mode="wait">
            {selectedNodeData ? (
              <NodeDetails key={selectedNode} node={selectedNodeData} />
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12 text-muted-foreground text-sm"
              >
                <TreeDeciduous className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Click on an element to see its details</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Legend */}
      <div className="px-6 py-3 border-t border-border bg-secondary/20">
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-blue-500/20 border border-blue-500/50" />
            Element
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-amber-500/20 border border-amber-500/50" />
            Text
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-purple-500/20 border border-purple-500/50" />
            Attribute
          </span>
        </div>
      </div>
    </Card>
  );
}


/**
 * Individual tree node component
 */
interface TreeNodeProps {
  node: DomTreeNode;
  depth: number;
  expandedNodes: Set<string>;
  selectedNode: string | null;
  highlightSelector?: string;
  showAttributes: boolean;
  interactive: boolean;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
}

function TreeNode({
  node,
  depth,
  expandedNodes,
  selectedNode,
  highlightSelector,
  showAttributes,
  interactive,
  onToggle,
  onSelect,
}: TreeNodeProps) {
  const isExpanded = expandedNodes.has(node.id);
  const isSelected = node.id === selectedNode;
  const isHighlighted = highlightSelector ? matchesSelector(node, highlightSelector) : false;
  const hasChildren = node.children.length > 0;
  const isTextNode = node.tagName === '#text';
  const colors = elementColors[node.tagName] || defaultColors;

  if (isTextNode) {
    return (
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className={cn(
          'py-1 rounded px-2 transition-colors my-0.5',
          interactive && 'cursor-pointer',
          isSelected ? 'bg-amber-500/20 ring-1 ring-amber-500/50' : interactive && 'hover:bg-amber-500/10'
        )}
        style={{ marginLeft: `${depth * 20 + 24}px` }}
        onClick={() => interactive && onSelect(node.id)}
      >
        <span className="text-amber-500 text-xs">
          &quot;{node.textContent}&quot;
        </span>
      </motion.div>
    );
  }

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className={cn(
          'py-1 rounded px-2 transition-colors flex items-center my-0.5',
          interactive && 'cursor-pointer',
          isSelected ? `${colors.bg} ring-1 ${colors.border}` : interactive && `hover:${colors.bg}`,
          isHighlighted && 'ring-2 ring-yellow-500 ring-offset-1 ring-offset-background'
        )}
        style={{ marginLeft: `${depth * 20}px` }}
        onClick={() => interactive && onSelect(node.id)}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle(node.id);
            }}
            className="w-5 h-5 flex items-center justify-center mr-1 hover:bg-white/10 rounded"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            )}
          </button>
        ) : (
          <span className="w-5 mr-1" />
        )}
        
        <span className={cn('font-medium', colors.text)}>
          &lt;{node.tagName}
        </span>
        
        {showAttributes && Object.keys(node.attributes).length > 0 && (
          <span className="text-purple-400 ml-1">
            {Object.entries(node.attributes)
              .slice(0, 2)
              .map(([key, value]) => (
                <span key={key} className="text-xs">
                  {' '}
                  <span className="text-purple-300">{key}</span>
                  {value && (
                    <>
                      <span className="text-zinc-500">=</span>
                      <span className="text-green-400">&quot;{value}&quot;</span>
                    </>
                  )}
                </span>
              ))}
            {Object.keys(node.attributes).length > 2 && (
              <span className="text-zinc-500 text-xs"> ...</span>
            )}
          </span>
        )}
        
        <span className={cn(colors.text)}>&gt;</span>
        
        {!hasChildren && (
          <span className={cn('text-zinc-500', colors.text)}>
            &lt;/{node.tagName}&gt;
          </span>
        )}
      </motion.div>

      <AnimatePresence>
        {isExpanded && hasChildren && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
          >
            {node.children.map((child) => (
              <TreeNode
                key={child.id}
                node={child}
                depth={depth + 1}
                expandedNodes={expandedNodes}
                selectedNode={selectedNode}
                highlightSelector={highlightSelector}
                showAttributes={showAttributes}
                interactive={interactive}
                onToggle={onToggle}
                onSelect={onSelect}
              />
            ))}
            <div
              className={cn('py-0.5 text-xs', colors.text)}
              style={{ marginLeft: `${depth * 20 + 24}px` }}
            >
              &lt;/{node.tagName}&gt;
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


/**
 * Node details panel component
 */
function NodeDetails({ node }: { node: DomTreeNode }) {
  const isTextNode = node.tagName === '#text';
  const colors = elementColors[node.tagName] || defaultColors;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="mt-4 space-y-4"
    >
      {/* Node Type Badge */}
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'px-2 py-1 rounded text-xs font-medium',
            isTextNode
              ? 'bg-amber-500/20 text-amber-500'
              : `${colors.bg} ${colors.text}`
          )}
        >
          {isTextNode ? 'Text Node' : 'Element Node'}
        </span>
      </div>

      {isTextNode ? (
        <div>
          <h5 className="text-xs font-medium text-muted-foreground mb-2">
            Text Content
          </h5>
          <p className="text-sm bg-zinc-900/50 p-3 rounded-lg border border-border">
            {node.textContent}
          </p>
        </div>
      ) : (
        <>
          {/* Tag Name */}
          <div>
            <h5 className="text-xs font-medium text-muted-foreground mb-2">
              Tag Name
            </h5>
            <code className={cn('text-sm px-3 py-1.5 rounded-lg block', colors.bg, colors.text)}>
              &lt;{node.tagName}&gt;
            </code>
          </div>

          {/* Attributes */}
          {Object.keys(node.attributes).length > 0 && (
            <div>
              <h5 className="text-xs font-medium text-muted-foreground mb-2">
                Attributes ({Object.keys(node.attributes).length})
              </h5>
              <div className="space-y-1.5">
                {Object.entries(node.attributes).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-center gap-2 text-sm bg-zinc-900/50 px-3 py-1.5 rounded-lg border border-border"
                  >
                    <span className="text-purple-400 font-medium">{key}</span>
                    {value && (
                      <>
                        <span className="text-zinc-500">=</span>
                        <span className="text-green-400">&quot;{value}&quot;</span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Children Summary */}
          <div>
            <h5 className="text-xs font-medium text-muted-foreground mb-2">
              Children
            </h5>
            <div className="text-sm bg-zinc-900/50 px-3 py-2 rounded-lg border border-border">
              {node.children.length === 0 ? (
                <span className="text-muted-foreground">No children</span>
              ) : (
                <div className="space-y-1">
                  <p>{node.children.length} child node{node.children.length !== 1 && 's'}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {node.children.slice(0, 5).map((child, i) => (
                      <span
                        key={i}
                        className={cn(
                          'text-xs px-1.5 py-0.5 rounded',
                          child.tagName === '#text'
                            ? 'bg-amber-500/20 text-amber-500'
                            : 'bg-blue-500/20 text-blue-500'
                        )}
                      >
                        {child.tagName === '#text' ? '"..."' : `<${child.tagName}>`}
                      </span>
                    ))}
                    {node.children.length > 5 && (
                      <span className="text-xs text-muted-foreground">
                        +{node.children.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* DOM Methods Hint */}
          <div className="pt-2 border-t border-border">
            <h5 className="text-xs font-medium text-muted-foreground mb-2">
              Access with JavaScript
            </h5>
            <div className="space-y-1 text-xs font-mono">
              {node.attributes.id && (
                <code className="block bg-zinc-900/50 px-2 py-1 rounded text-green-400">
                  document.getElementById(&apos;{node.attributes.id}&apos;)
                </code>
              )}
              {node.attributes.class && (
                <code className="block bg-zinc-900/50 px-2 py-1 rounded text-green-400">
                  document.querySelector(&apos;.{node.attributes.class.split(' ')[0]}&apos;)
                </code>
              )}
              <code className="block bg-zinc-900/50 px-2 py-1 rounded text-green-400">
                document.querySelector(&apos;{node.tagName}&apos;)
              </code>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}

// Export for testing
export { parseHtmlToTree, parseAttributes, matchesSelector, findNodeById, defaultHtml };
export default DomTreeVisualizer;
