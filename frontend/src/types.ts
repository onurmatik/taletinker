/**
 * Core type definitions for the TaleTinker application.
 * Defines the structure for story nodes, user choices, and application state.
 */

export interface StoryNode {
  id: string;
  text: string;
  parentId: string | null;
  childrenIds: string[];
  createdAt: number;
  isCustom?: boolean; // If true, it was user input
  alternatives?: string[]; // Other choices available at this step
}

export interface Choice {
  id: string;
  text: string;
  type: 'ai' | 'custom';
}

export interface StoryState {
  nodes: Record<string, StoryNode>;
  currentPath: string[]; // Array of node IDs representing the current linear story
  currentNodeId: string | null;
  isEnded: boolean;
}
