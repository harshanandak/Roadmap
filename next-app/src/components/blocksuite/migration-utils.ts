/**
 * BlockSuite Data Migration Utilities
 *
 * Provides functions for migrating ReactFlow-based mind maps
 * to BlockSuite's native tree format.
 *
 * Phase 3: Data Migration (BlockSuite Integration)
 *
 * Key Features:
 * - Dry run mode (default) for safe previewing
 * - Lost edge tracking from DAG→Tree conversion
 * - JSONB size monitoring for TOAST performance
 * - Validation before migration
 * - Batch processing support
 */

import type { MindMapNode, MindMapEdge } from '@/lib/types/mind-map'
import type {
  BlockSuiteMindmapNode,
  LostEdge,
  MigrationOptions,
  MigrationResult,
  BatchMigrationResult,
  MigrationStatus,
} from './mindmap-types'
import { reactFlowToBlockSuiteTree, getTreeDepth, countTreeNodes } from './mindmap-utils'

/**
 * Default migration options
 * Safety: dryRun defaults to true to prevent accidental writes
 */
export const DEFAULT_MIGRATION_OPTIONS: Required<MigrationOptions> = {
  dryRun: true,
  batchSize: 10,
  maxWarningsPerMap: 50,
  skipLargeMaps: false,
  maxSizeBytes: 100 * 1024, // 100KB
}

/**
 * TOAST threshold for JSONB in PostgreSQL (approximately 2KB)
 * Values larger than this are automatically compressed by PostgreSQL
 */
export const TOAST_THRESHOLD_BYTES = 2048

/**
 * Estimate the size of a JSON object in bytes
 * Uses conservative estimation: JSON.stringify length * 1.1 for UTF-8
 */
export function estimateJSONBSize(obj: unknown): number {
  try {
    const jsonString = JSON.stringify(obj)
    // Multiply by 1.1 to account for UTF-8 multi-byte characters
    return Math.ceil(jsonString.length * 1.1)
  } catch {
    return 0
  }
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

/**
 * Check if JSONB size exceeds recommended threshold
 */
export function checkSizeThreshold(
  sizeBytes: number,
  maxBytes: number = 100 * 1024
): { withinLimit: boolean; warning: string | null } {
  if (sizeBytes > maxBytes) {
    return {
      withinLimit: false,
      warning: `JSONB size (${formatBytes(sizeBytes)}) exceeds maximum (${formatBytes(maxBytes)})`,
    }
  }
  if (sizeBytes > TOAST_THRESHOLD_BYTES) {
    return {
      withinLimit: true,
      warning: `JSONB size (${formatBytes(sizeBytes)}) exceeds TOAST threshold (${formatBytes(TOAST_THRESHOLD_BYTES)}). Data will be compressed automatically.`,
    }
  }
  return { withinLimit: true, warning: null }
}

/**
 * Convert ConversionResult warnings to LostEdge records
 * Parses warning strings to extract structured lost edge data
 */
export function extractLostEdges(warnings: string[], nodes: MindMapNode[]): LostEdge[] {
  const lostEdges: LostEdge[] = []
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))

  for (const warning of warnings) {
    // Parse "Lost edge: "Parent" → "Child" (node already assigned to "OtherParent")"
    const lostEdgeMatch = warning.match(
      /Lost edge: "(.+?)" → "(.+?)" \(node already assigned to "(.+?)"\)/
    )
    if (lostEdgeMatch) {
      const [, sourceTitle, targetTitle] = lostEdgeMatch
      // Find node IDs by title (best effort)
      const sourceNode = nodes.find((n) => n.title === sourceTitle)
      const targetNode = nodes.find((n) => n.title === targetTitle)

      lostEdges.push({
        sourceId: sourceNode?.id || 'unknown',
        targetId: targetNode?.id || 'unknown',
        sourceTitle,
        targetTitle,
        reason: 'multiple_parents',
      })
      continue
    }

    // Parse "Circular reference detected at node "X""
    const circularMatch = warning.match(/Circular reference detected at node "(.+?)"/)
    if (circularMatch) {
      const nodeId = circularMatch[1]
      const node = nodeMap.get(nodeId)
      lostEdges.push({
        sourceId: nodeId,
        targetId: nodeId,
        sourceTitle: node?.title,
        targetTitle: node?.title,
        reason: 'circular_reference',
      })
      continue
    }

    // Parse "Node "X" (id) is not connected to the tree"
    const orphanMatch = warning.match(/Node "(.+?)" \((.+?)\) is not connected/)
    if (orphanMatch) {
      const [, title, nodeId] = orphanMatch
      lostEdges.push({
        sourceId: nodeId,
        targetId: nodeId,
        sourceTitle: title,
        reason: 'orphaned_node',
      })
    }
  }

  return lostEdges
}

/**
 * Validate a mind map before migration
 *
 * Checks:
 * - Has at least one node
 * - No critical data corruption
 * - Estimated size is within limits
 */
export function validateMindMapForMigration(
  nodes: MindMapNode[],
  edges: MindMapEdge[],
  options: Required<MigrationOptions> = DEFAULT_MIGRATION_OPTIONS
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []

  // Check for empty mind map
  if (nodes.length === 0) {
    errors.push('Mind map has no nodes to migrate')
    return { valid: false, errors, warnings }
  }

  // Check for nodes with missing required fields
  const invalidNodes = nodes.filter((n) => !n.id || !n.title)
  if (invalidNodes.length > 0) {
    errors.push(`${invalidNodes.length} node(s) have missing id or title`)
  }

  // Check for edges referencing non-existent nodes
  const nodeIds = new Set(nodes.map((n) => n.id))
  const invalidEdges = edges.filter(
    (e) => !nodeIds.has(e.source_node_id) || !nodeIds.has(e.target_node_id)
  )
  if (invalidEdges.length > 0) {
    warnings.push(`${invalidEdges.length} edge(s) reference non-existent nodes`)
  }

  // Check for duplicate node IDs
  const idCounts = new Map<string, number>()
  for (const node of nodes) {
    idCounts.set(node.id, (idCounts.get(node.id) || 0) + 1)
  }
  const duplicateIds = Array.from(idCounts.entries()).filter(([, count]) => count > 1)
  if (duplicateIds.length > 0) {
    errors.push(`${duplicateIds.length} duplicate node ID(s) found`)
  }

  // Estimate size with test conversion
  const testResult = reactFlowToBlockSuiteTree(nodes, edges)
  if (testResult.tree) {
    const estimatedSize = estimateJSONBSize(testResult.tree)
    const sizeCheck = checkSizeThreshold(estimatedSize, options.maxSizeBytes)

    if (!sizeCheck.withinLimit && options.skipLargeMaps) {
      errors.push(sizeCheck.warning || 'Map exceeds size limit')
    } else if (sizeCheck.warning) {
      warnings.push(sizeCheck.warning)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Migrate a single mind map to BlockSuite format
 *
 * This is the core migration function that converts ReactFlow flat node/edge format
 * to BlockSuite's nested tree structure.
 *
 * @param mindMapId - The mind map ID
 * @param workspaceId - The workspace ID containing the mind map
 * @param nodes - Array of mind map nodes from database
 * @param edges - Array of mind map edges from database
 * @param options - Migration options
 * @returns MigrationResult with tree, lost edges, and stats
 */
export function migrateToBlockSuite(
  mindMapId: string,
  workspaceId: string,
  nodes: MindMapNode[],
  edges: MindMapEdge[],
  options: MigrationOptions = {}
): MigrationResult {
  const startTime = performance.now()
  const opts = { ...DEFAULT_MIGRATION_OPTIONS, ...options }

  // Validate first
  const validation = validateMindMapForMigration(nodes, edges, opts)
  if (!validation.valid) {
    return {
      mindMapId,
      workspaceId,
      status: 'failed',
      nodeCount: nodes.length,
      edgeCount: edges.length,
      treeNodeCount: 0,
      lostEdgeCount: 0,
      warnings: validation.warnings,
      error: validation.errors.join('; '),
      durationMs: Math.round(performance.now() - startTime),
      sizeBytes: 0,
    }
  }

  // Perform conversion using existing utility
  const conversionResult = reactFlowToBlockSuiteTree(nodes, edges)

  if (!conversionResult.tree) {
    return {
      mindMapId,
      workspaceId,
      status: 'failed',
      nodeCount: nodes.length,
      edgeCount: edges.length,
      treeNodeCount: 0,
      lostEdgeCount: 0,
      warnings: conversionResult.warnings,
      error: 'Conversion produced no tree - check for circular references or no root node',
      durationMs: Math.round(performance.now() - startTime),
      sizeBytes: 0,
    }
  }

  // Extract lost edges from warnings
  const lostEdges = extractLostEdges(conversionResult.warnings, nodes)

  // Calculate stats
  const estimatedSize = estimateJSONBSize(conversionResult.tree)
  const treeDepth = getTreeDepth(conversionResult.tree)
  const treeNodeCount = countTreeNodes(conversionResult.tree)

  // Collect all warnings
  const allWarnings = [...validation.warnings, ...conversionResult.warnings]

  // Check size threshold
  const sizeCheck = checkSizeThreshold(estimatedSize, opts.maxSizeBytes)
  if (!sizeCheck.withinLimit && opts.skipLargeMaps) {
    return {
      mindMapId,
      workspaceId,
      status: 'skipped',
      nodeCount: nodes.length,
      edgeCount: edges.length,
      treeNodeCount,
      lostEdgeCount: lostEdges.length,
      warnings: [...allWarnings, sizeCheck.warning || 'Map skipped due to size threshold'],
      error: 'Map skipped due to size threshold',
      durationMs: Math.round(performance.now() - startTime),
      sizeBytes: estimatedSize,
    }
  }

  if (sizeCheck.warning) {
    allWarnings.push(sizeCheck.warning)
  }

  // Check tree depth warning
  if (treeDepth > 15) {
    allWarnings.push(`Tree depth (${treeDepth}) is unusually deep. Consider flattening the structure.`)
  }

  // Determine status based on warnings
  let status: MigrationStatus = opts.dryRun ? 'pending' : 'success'
  if (lostEdges.length > 0 && !opts.dryRun) {
    status = 'warning' // Migrated but with lost edges
  }

  const durationMs = Math.round(performance.now() - startTime)

  return {
    mindMapId,
    workspaceId,
    status,
    nodeCount: nodes.length,
    edgeCount: edges.length,
    treeNodeCount,
    lostEdgeCount: lostEdges.length,
    warnings: allWarnings,
    durationMs,
    sizeBytes: estimatedSize,
  }
}

/**
 * Get the BlockSuite tree from a migration result
 * This is a separate function to avoid storing the tree in the result (for large trees)
 */
export function getBlockSuiteTree(
  nodes: MindMapNode[],
  edges: MindMapEdge[]
): BlockSuiteMindmapNode | null {
  const result = reactFlowToBlockSuiteTree(nodes, edges)
  return result.tree
}

/**
 * Create a summary of migration results for logging/display
 */
export function summarizeMigration(result: MigrationResult): string {
  const lines: string[] = [
    `Migration ${result.status === 'success' || result.status === 'warning' ? 'succeeded' : result.status} (status: ${result.status})`,
    `Stats: ${result.nodeCount} nodes, ${result.edgeCount} edges → ${result.treeNodeCount} tree nodes`,
    `Size: ${formatBytes(result.sizeBytes || 0)}, Duration: ${result.durationMs}ms`,
  ]

  if (result.lostEdgeCount > 0) {
    lines.push(`Lost edges: ${result.lostEdgeCount} (DAG-to-tree conversion)`)
  }

  if (result.warnings.length > 0) {
    lines.push(`Warnings: ${result.warnings.length}`)
  }

  if (result.error) {
    lines.push(`Error: ${result.error}`)
  }

  return lines.join('\n')
}

/**
 * Create a batch migration result from individual results
 */
export function createBatchResult(
  results: MigrationResult[],
  startedAt: string
): BatchMigrationResult {
  const batchId = Date.now().toString()

  let successful = 0
  let failed = 0
  let skipped = 0
  let withWarnings = 0

  for (const result of results) {
    switch (result.status) {
      case 'success':
        successful++
        break
      case 'warning':
        successful++
        withWarnings++
        break
      case 'failed':
        failed++
        break
      case 'skipped':
        skipped++
        break
    }
  }

  return {
    batchId,
    totalMaps: results.length,
    successful,
    failed,
    skipped,
    withWarnings,
    results,
    startedAt,
    completedAt: new Date().toISOString(),
  }
}
