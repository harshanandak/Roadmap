/**
 * BlockSuite MindMap TypeScript Types
 *
 * Types for BlockSuite v0.18.7 mindmap integration.
 * These types map to the internal BlockSuite mindmap APIs.
 */

/**
 * BlockSuite MindmapStyle enum values
 * Maps to @blocksuite/affine-model MindmapStyle
 */
export enum BlockSuiteMindmapStyle {
  ONE = 1,
  TWO = 2,
  THREE = 3,
  FOUR = 4,
}

/**
 * BlockSuite LayoutType enum values
 * Maps to @blocksuite/affine-model LayoutType
 */
export enum BlockSuiteLayoutType {
  RIGHT = 0,
  LEFT = 1,
  BALANCE = 2,
}

/**
 * Node structure for BlockSuite mindmap tree
 * Used with surface.addElement({ type: 'mindmap', children: tree })
 */
export interface BlockSuiteMindmapNode {
  /** Display text for the node */
  text: string
  /** Child nodes in the tree */
  children?: BlockSuiteMindmapNode[]
  /** Position and size: "x,y,width,height" format */
  xywh?: string
  /** Layout direction override for this branch */
  layoutType?: 'left' | 'right'
}

/**
 * Extended node with metadata for our application
 * Preserves semantic node type information
 */
export interface BlockSuiteMindmapNodeWithMeta extends BlockSuiteMindmapNode {
  /** Original semantic node type from our app */
  nodeType?: 'idea' | 'problem' | 'solution' | 'feature' | 'question'
  /** Original node ID for tracking */
  originalId?: string
  /** Custom metadata */
  data?: Record<string, unknown>
}

/**
 * MindMapCanvas component props
 */
export interface MindMapCanvasProps {
  /** Document ID for persistence (optional) */
  documentId?: string
  /** Initial tree structure to render */
  initialTree?: BlockSuiteMindmapNode
  /** Visual style preset (1-4) */
  style?: BlockSuiteMindmapStyle
  /** Layout direction */
  layout?: BlockSuiteLayoutType
  /** Callback when tree structure changes */
  onTreeChange?: (tree: BlockSuiteMindmapNode) => void
  /** Callback when a node is selected */
  onNodeSelect?: (nodeId: string, text: string) => void
  /** Whether the canvas is read-only */
  readOnly?: boolean
  /** Additional CSS classes */
  className?: string
}

/**
 * Result of converting ReactFlow data to BlockSuite format
 */
export interface ConversionResult {
  /** Root node of the tree */
  tree: BlockSuiteMindmapNode | null
  /** Nodes that couldn't be placed in the tree (orphaned) */
  orphanedNodes: string[]
  /** Any warnings during conversion */
  warnings: string[]
}

/**
 * Mindmap element returned from surface.getElementById()
 */
export interface MindmapElementRef {
  /** Element ID in the surface */
  id: string
  /** Current style */
  style: BlockSuiteMindmapStyle
  /** Tree structure access */
  tree?: {
    element: {
      xywh: string
    }
  }
}

/**
 * Surface block model interface (partial)
 * Represents the surface in edgeless mode
 */
export interface SurfaceBlockModelRef {
  /** Add a new element to the surface */
  addElement: (props: {
    type: 'mindmap' | 'shape' | 'connector' | 'brush' | 'text' | 'frame' | 'group'
    children?: BlockSuiteMindmapNode
    style?: BlockSuiteMindmapStyle
    [key: string]: unknown
  }) => string
  /** Get element by ID */
  getElementById: (id: string) => MindmapElementRef | null
}

/**
 * Default sample tree for testing
 */
export const DEFAULT_SAMPLE_TREE: BlockSuiteMindmapNode = {
  text: 'Central Idea',
  children: [
    {
      text: 'Branch 1',
      children: [
        { text: 'Leaf 1.1' },
        { text: 'Leaf 1.2' },
      ],
    },
    {
      text: 'Branch 2',
      children: [
        { text: 'Leaf 2.1' },
      ],
    },
    {
      text: 'Branch 3',
    },
  ],
}
