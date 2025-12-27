'use client'

import { NodeProps, Node } from '@xyflow/react'
import { MindMapNodeData, NODE_TYPE_CONFIGS } from '@/lib/types/mind-map'
import { BaseNode } from './base-node'

// Define the node type that ReactFlow v12+ expects
type MindMapNode = Node<MindMapNodeData>

export function SolutionNode(props: NodeProps<MindMapNode>) {
  return <BaseNode {...props} config={NODE_TYPE_CONFIGS.solution} />
}
