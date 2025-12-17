/**
 * StoryTreeView Component
 * Visualizes a tree of related stories branched from the same root.
 * - Uses SVG for rendering a Git-like graph
 * - Compresses linear chains of nodes to simplify the view
 * - Shows titles only on leaf nodes
 */
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { SavedStory } from '../types';
import { cn } from '../utils';

interface StoryTreeViewProps {
  currentStoryId: string;
  stories: SavedStory[];
  onSelectStory: (id: string) => void;
  className?: string;
  onClose?: () => void;
}

// Internal tree node structure
interface TreeNode {
  id: string; // unique node id
  depth: number; // visual depth (Y axis)
  x: number; // visual column (X axis)
  children: TreeNode[];
  storyIds: string[]; // Stories passing through
  isLeaf: boolean;
  isBranching: boolean;
  isRoot: boolean;
  isCurrent: boolean;
  label?: string; // Title for leaf nodes
}

export function StoryTreeView({
  currentStoryId,
  stories,
  onSelectStory,
  className,
  onClose
}: StoryTreeViewProps) {
  
  // 1. Filter relevant stories
  const relevantStories = useMemo(() => {
    const current = stories.find(s => s.id === currentStoryId);
    if (!current) return [];
    const rootId = current.rootId || current.id;
    return stories.filter(s => (s.rootId || s.id) === rootId);
  }, [currentStoryId, stories]);

  // 2. Build the visual graph
  const { nodes, edges, width, height } = useMemo(() => {
    if (relevantStories.length === 0) return { nodes: [], edges: [], width: 0, height: 0 };

    // --- A. Build raw tree structure ---
    const rawRootId = 'root_node';
    const rawNodes = new Map<string, { 
      id: string, 
      text: string, 
      children: Set<string>, 
      storyIds: Set<string>,
      depth: number 
    }>();

    // Initialize root
    rawNodes.set(rawRootId, { id: rawRootId, text: 'Start', children: new Set(), storyIds: new Set(), depth: 0 });

    // Process stories to build raw tree
    relevantStories.forEach(story => {
      let parentId = rawRootId;
      story.lines.forEach((line, index) => {
        // Create a unique ID for this line in this specific context
        // We need to identify shared paths. 
        // A simple hash of content + depth is usually enough for this scale.
        // But exact matching is better. We need to find if parent already has a child with this text.
        
        const parent = rawNodes.get(parentId)!;
        parent.storyIds.add(story.id);

        let existingChildId: string | undefined;
        for (const childId of parent.children) {
          if (rawNodes.get(childId)?.text === line) {
            existingChildId = childId;
            break;
          }
        }

        if (existingChildId) {
          parentId = existingChildId;
          rawNodes.get(parentId)!.storyIds.add(story.id);
        } else {
          // New node
          const newId = `node_${Math.random().toString(36).substr(2, 9)}`;
          rawNodes.set(newId, {
            id: newId,
            text: line,
            children: new Set(),
            storyIds: new Set([story.id]),
            depth: index + 1
          });
          parent.children.add(newId);
          parentId = newId;
        }
      });
    });

    // --- B. Identify Display Nodes (Compression) ---
    // We want to show: Root, Branching Nodes, Leaf Nodes, and Current Path Nodes (optional, but let's stick to user request: skip non-branching)
    // Actually, user said: "if there are too many... skip those. display every branching node."
    // We will keep: Root, Branching (>1 children), Leaves (0 children), and maybe the node active in current story to show progress?
    // To match the "Git Graph" look, we need to preserve topology.
    
    // Let's traverse and build a "GraphNode" map.
    // We will assign X coordinates (columns) based on branches.
    
    const displayNodes: TreeNode[] = [];
    const displayEdges: { from: TreeNode, to: TreeNode, type: 'straight' | 'curve' }[] = [];
    
    // Assign Columns (X) - Simple heuristic
    // DFS traversal. First child keeps parent X. Subsequent children get new X.
    // We need to track available columns.
    
    const nodeXMap = new Map<string, number>();
    const nextAvailableXPerDepth: number[] = []; // Not strictly layered, just columns.
    
    // Helper to get raw node
    const getRaw = (id: string) => rawNodes.get(id)!;

    // Recursive layout
    // We'll perform a layout on the RAW tree first to determine X, then compress vertical space.
    
    let globalMaxX = 0;

    const assignX = (nodeId: string, x: number) => {
      nodeXMap.set(nodeId, x);
      globalMaxX = Math.max(globalMaxX, x);
      
      const node = getRaw(nodeId);
      const children = Array.from(node.children);
      
      if (children.length === 0) return;

      // Primary child (heaviest? or first?) - let's pick first
      // It inherits column X
      assignX(children[0], x);

      // Other children get new columns
      // For a compact tree, we want to shift right.
      for (let i = 1; i < children.length; i++) {
        // Simple logic: x + 1. But need to check if occupied?
        // Since it's a tree, x + 1 relative to parent's branch start is usually fine for a simple view.
        // But to avoid overlap, we might need a global counter or per-depth check.
        // Let's just increment global X for new branches to ensure no overlap.
        // Actually, "globalMaxX + 1" is safest for a new branch.
        const newBranchX = globalMaxX + 1;
        assignX(children[i], newBranchX);
      }
    };

    assignX(rawRootId, 0);

    // --- C. Compress & Build Display List ---
    // We will traverse again. 
    // If a node is NOT (Root OR Branching OR Leaf), and its parent was also NOT special (part of a chain), we might merge?
    // User request: "skip those".
    // Strategy: We will iterate the raw tree. If a node is "boring" (1 child, 1 parent), we skip adding it to displayNodes, BUT we effectively lengthen the edge.
    // Wait, if we skip nodes, the Y-axis (depth) shrinks.
    
    const isImportant = (id: string) => {
      const node = getRaw(id);
      if (id === rawRootId) return true;
      if (node.children.size !== 1) return true; // Branching (size > 1) or Leaf (size 0)
      // Also keep the node if it's the specific target of a story ending?
      // Actually leaves cover endings.
      return false;
    };

    // We need to remap Y coordinates. 
    // We'll increment displayY only when we emit a node.
    
    const idToDisplayNode = new Map<string, TreeNode>();
    
    const buildDisplayTree = (rawId: string, currentDisplayParent: TreeNode | null, currentY: number) => {
      const rawNode = getRaw(rawId);
      const important = isImportant(rawId);
      
      let nextParent = currentDisplayParent;
      let nextY = currentY;

      if (important) {
        // Create Display Node
        const displayNode: TreeNode = {
            id: rawId,
            depth: currentY,
            x: nodeXMap.get(rawId) || 0,
            children: [],
            storyIds: Array.from(rawNode.storyIds),
            isLeaf: rawNode.children.size === 0,
            isBranching: rawNode.children.size > 1,
            isRoot: rawId === rawRootId,
            isCurrent: rawNode.storyIds.has(currentStoryId),
            // Find story title if leaf
            label: rawNode.children.size === 0 
                ? relevantStories.find(s => {
                    // It's this story if it ends here. 
                    // Simple check: does this node's text match last line of story?
                    const lastLine = s.lines[s.lines.length - 1];
                    return lastLine === rawNode.text && rawNode.storyIds.has(s.id);
                  })?.title 
                : undefined
        };
        
        displayNodes.push(displayNode);
        idToDisplayNode.set(rawId, displayNode);
        
        if (currentDisplayParent) {
            currentDisplayParent.children.push(displayNode);
            displayEdges.push({ 
                from: currentDisplayParent, 
                to: displayNode,
                type: (displayNode.x !== currentDisplayParent.x) ? 'curve' : 'straight'
            });
        }
        
        nextParent = displayNode;
        nextY = currentY + 1;
      }

      // Recurse
      Array.from(rawNode.children).forEach(childId => {
        buildDisplayTree(childId, nextParent, nextY);
      });
    };

    buildDisplayTree(rawRootId, null, 0);

    // Calculate dimensions
    const maxX = Math.max(...displayNodes.map(n => n.x));
    const maxY = Math.max(...displayNodes.map(n => n.depth));
    
    // Scale for rendering
    const X_GAP = 50;
    const Y_GAP = 80;
    const PADDING = 60; // Extra padding for labels

    return {
        nodes: displayNodes,
        edges: displayEdges,
        width: Math.max(300, (maxX * X_GAP) + (PADDING * 4)), // Ensure min width
        height: Math.max(400, (maxY * Y_GAP) + PADDING)
    };

  }, [relevantStories, currentStoryId]);


  if (!relevantStories.length) return null;

  const X_GAP = 40;
  const Y_GAP = 60;
  const START_X = 40;
  const START_Y = 40;

  return (
    <div className={cn("flex flex-col h-full bg-background border-r border-border", className)}>
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20">
        <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Story Map</h3>
        {onClose && (
            <button onClick={onClose} className="p-1 hover:bg-muted rounded-full">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
        )}
      </div>

      {/* Graph Area */}
      <div className="flex-1 overflow-auto relative custom-scrollbar bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]">
         <div style={{ width: width, height: height, minWidth: '100%' }} className="relative">
            <svg 
                width="100%" 
                height="100%"
                style={{ minWidth: width, minHeight: height }}
                className="block"
            >
                {/* Connections */}
                {edges.map((edge, i) => {
                    const x1 = START_X + (edge.from.x * X_GAP);
                    const y1 = START_Y + (edge.from.depth * Y_GAP);
                    const x2 = START_X + (edge.to.x * X_GAP);
                    const y2 = START_Y + (edge.to.depth * Y_GAP);
                    
                    const isCurrentPath = edge.to.storyIds.includes(currentStoryId) && edge.from.storyIds.includes(currentStoryId);
                    
                    // Bezier Curve Logic
                    // If straight vertical
                    let d = '';
                    if (x1 === x2) {
                        d = `M ${x1} ${y1} L ${x2} ${y2}`;
                    } else {
                        // Curve
                        const cp1y = y1 + (Y_GAP / 2);
                        const cp2y = y2 - (Y_GAP / 2);
                        d = `M ${x1} ${y1} C ${x1} ${cp1y}, ${x2} ${cp2y}, ${x2} ${y2}`;
                    }

                    return (
                        <path
                            key={`edge-${i}`}
                            d={d}
                            fill="none"
                            stroke={isCurrentPath ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"}
                            strokeWidth={isCurrentPath ? 3 : 2}
                            strokeOpacity={isCurrentPath ? 1 : 0.3}
                            strokeLinecap="round"
                        />
                    );
                })}

                {/* Nodes */}
                {nodes.map((node) => {
                    const cx = START_X + (node.x * X_GAP);
                    const cy = START_Y + (node.depth * Y_GAP);
                    const isSelected = node.storyIds.includes(currentStoryId);
                    
                    // Check if this node is the exact tip of the current story
                    // Since we compress, the 'tip' might be inside a compressed segment, 
                    // but usually the tip is a leaf or we made it a node.
                    // Actually, if we are in the middle of a segment, the graph shows us at the end of that segment?
                    // Let's simplified: just highlight the path.
                    
                    // Interaction: Click to switch
                    // We need to attach click handler.
                    // Since it's SVG, we can use <g> or just circle.
                    // For better click target, we use a transparent larger circle.
                    
                    return (
                        <g 
                            key={`node-${node.id}`} 
                            onClick={() => onSelectStory(node.storyIds[0])}
                            className="cursor-pointer group"
                        >
                            {/* Larger hit area */}
                            <circle cx={cx} cy={cy} r={15} fill="transparent" />
                            
                            {/* Visible Node */}
                            <circle 
                                cx={cx} 
                                cy={cy} 
                                r={isSelected ? 6 : 4} 
                                fill={isSelected ? "hsl(var(--background))" : "hsl(var(--background))"}
                                stroke={isSelected ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"}
                                strokeWidth={isSelected ? 3 : 2}
                                className="transition-all duration-300"
                            />
                            
                            {/* Hover Effect */}
                             <circle 
                                cx={cx} 
                                cy={cy} 
                                r={10} 
                                stroke="hsl(var(--primary))"
                                strokeWidth={2}
                                strokeOpacity={0}
                                fill="none"
                                className="group-hover:stroke-opacity-30 transition-all duration-300"
                            />
                        </g>
                    );
                })}
            </svg>

            {/* Labels (HTML for better text rendering) */}
            {nodes.filter(n => n.label).map(node => {
                 const left = START_X + (node.x * X_GAP) + 16;
                 const top = START_Y + (node.depth * Y_GAP) - 10;
                 const isSelected = node.storyIds.includes(currentStoryId);
                 
                 return (
                    <div
                        key={`label-${node.id}`}
                        className={cn(
                            "absolute text-xs px-2 py-1 rounded-md border backdrop-blur-sm whitespace-nowrap cursor-pointer transition-all max-w-[150px] truncate",
                            isSelected 
                                ? "bg-primary/10 border-primary/30 text-primary font-medium z-10" 
                                : "bg-background/80 border-border text-muted-foreground hover:bg-background hover:text-foreground z-0"
                        )}
                        style={{ left, top }}
                        onClick={() => onSelectStory(node.storyIds[0])}
                    >
                        {node.label}
                    </div>
                 );
            })}
         </div>
      </div>
    </div>
  );
}
