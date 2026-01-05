import { z } from 'zod'

/**
 * Zod Schemas for BlockSuite Component Validation
 *
 * These schemas provide runtime validation for component props,
 * ensuring type safety and preventing invalid data from being processed.
 */

/**
 * Editor mode schema
 */
export const EditorModeSchema = z.enum(['page', 'edgeless'])

/**
 * BlockSuiteEditor props schema
 * Validates all incoming props at runtime
 */
export const BlockSuiteEditorPropsSchema = z.object({
  /** Editor mode: 'page' for document editing, 'edgeless' for canvas/whiteboard */
  mode: EditorModeSchema.optional().default('edgeless'),

  /** Additional CSS classes */
  className: z.string().optional(),

  /** Callback when editor is ready - any function is valid */
  onReady: z.unknown().optional(),

  /** Callback when document content changes - any function is valid */
  onChange: z.unknown().optional(),

  /**
   * Document ID for persistence
   * Must be alphanumeric with hyphens/underscores, no special characters
   */
  documentId: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true
        // Allow alphanumeric, hyphens, underscores, max 100 chars
        const idRegex = /^[a-zA-Z0-9_-]{1,100}$/
        return idRegex.test(val)
      },
      { message: 'documentId must be alphanumeric with hyphens/underscores only (max 100 chars)' }
    ),

  /** Whether the editor is read-only */
  readOnly: z.boolean().optional().default(false),
})

/**
 * Inferred type from the schema
 */
export type ValidatedBlockSuiteEditorProps = z.infer<typeof BlockSuiteEditorPropsSchema>

/**
 * Mind map tree node schema for validation
 */
export interface MindMapTreeNodeType {
  text: string
  children?: MindMapTreeNodeType[]
  data?: Record<string, unknown>
}

export const MindMapTreeNodeSchema: z.ZodType<MindMapTreeNodeType> = z.lazy(() =>
  z.object({
    text: z.string().min(1, 'Node text is required'),
    children: z.array(MindMapTreeNodeSchema).optional(),
    data: z.record(z.string(), z.unknown()).optional(),
  })
)

/**
 * Mind map layout type schema
 */
export const MindMapLayoutTypeSchema = z.enum(['left', 'right', 'balance'])

/**
 * Mind map style schema
 */
export const MindMapStyleSchema = z.enum(['default', 'style1', 'style2', 'style3', 'style4'])

/**
 * MindMapEditor props schema
 */
export const MindMapEditorPropsSchema = z.object({
  initialTree: MindMapTreeNodeSchema.optional(),
  layout: MindMapLayoutTypeSchema.optional().default('balance'),
  style: MindMapStyleSchema.optional().default('default'),
  onTreeChange: z.unknown().optional(),
  onNodeSelect: z.unknown().optional(),
  readOnly: z.boolean().optional().default(false),
})

/**
 * Document metadata schema for storage validation
 */
export const DocumentMetadataSchema = z.object({
  title: z.string().max(255).optional(),
  type: z.enum(['mindmap', 'document', 'canvas']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  custom: z.record(z.string(), z.unknown()).optional(),
})

/**
 * BlockSuite document schema for database storage
 */
export const BlockSuiteDocumentSchema = z.object({
  id: z.string().min(1).max(100),
  team_id: z.string().min(1).max(100),
  workspace_id: z.string().max(100).nullable(),
  yjs_snapshot: z.string().min(1),
  document_type: z.enum(['mindmap', 'document', 'canvas']),
  metadata: DocumentMetadataSchema,
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

/**
 * Validate props and return parsed result or throw error
 */
export function validateEditorProps(props: unknown): ValidatedBlockSuiteEditorProps {
  return BlockSuiteEditorPropsSchema.parse(props)
}

/**
 * Safe validation that returns result object instead of throwing
 */
export function safeValidateEditorProps(props: unknown) {
  return BlockSuiteEditorPropsSchema.safeParse(props)
}

// ============================================================
// BlockSuite MindMap Canvas Schemas (v0.18.7)
// ============================================================

/**
 * BlockSuite MindmapStyle enum schema
 * Maps to @blocksuite/affine-model MindmapStyle: ONE=1, TWO=2, THREE=3, FOUR=4
 */
export const BlockSuiteMindmapStyleSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
])

/**
 * BlockSuite LayoutType enum schema
 * Maps to @blocksuite/affine-model LayoutType: RIGHT=0, LEFT=1, BALANCE=2
 */
export const BlockSuiteLayoutTypeSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
])

/**
 * BlockSuite mindmap node schema (recursive tree structure)
 */
export interface BlockSuiteMindmapNodeType {
  text: string
  children?: BlockSuiteMindmapNodeType[]
  xywh?: string
  layoutType?: 'left' | 'right'
}

export const BlockSuiteMindmapNodeSchema: z.ZodType<BlockSuiteMindmapNodeType> = z.lazy(() =>
  z.object({
    text: z.string().min(1, 'Node text is required').max(1000, 'Node text too long'),
    children: z.array(BlockSuiteMindmapNodeSchema).optional(),
    xywh: z.string().regex(/^-?\d+,-?\d+,\d+,\d+$/, 'Invalid xywh format').optional(),
    layoutType: z.enum(['left', 'right']).optional(),
  })
)

/**
 * MindMapCanvas component props schema
 * Validates all incoming props at runtime for security
 */
export const MindMapCanvasPropsSchema = z.object({
  /** Document ID for persistence */
  documentId: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true
        // Allow alphanumeric, hyphens, underscores, max 100 chars
        const idRegex = /^[a-zA-Z0-9_-]{1,100}$/
        return idRegex.test(val)
      },
      { message: 'documentId must be alphanumeric with hyphens/underscores only (max 100 chars)' }
    ),

  /** Initial tree structure to render */
  initialTree: BlockSuiteMindmapNodeSchema.optional(),

  /** Visual style preset (1-4) */
  style: BlockSuiteMindmapStyleSchema.optional().default(4),

  /** Layout direction (0=RIGHT, 1=LEFT, 2=BALANCE) */
  layout: BlockSuiteLayoutTypeSchema.optional().default(2),

  /** Callback when tree structure changes */
  onTreeChange: z.unknown().optional(),

  /** Callback when a node is selected */
  onNodeSelect: z.unknown().optional(),

  /** Whether the canvas is read-only */
  readOnly: z.boolean().optional().default(false),

  /** Additional CSS classes */
  className: z.string().optional(),
})

/**
 * Inferred type from MindMapCanvasPropsSchema
 */
export type ValidatedMindMapCanvasProps = z.infer<typeof MindMapCanvasPropsSchema>

/**
 * Validate MindMapCanvas props and return parsed result or throw error
 */
export function validateMindMapCanvasProps(props: unknown): ValidatedMindMapCanvasProps {
  return MindMapCanvasPropsSchema.parse(props)
}

/**
 * Safe validation for MindMapCanvas props that returns result object instead of throwing
 */
export function safeValidateMindMapCanvasProps(props: unknown) {
  return MindMapCanvasPropsSchema.safeParse(props)
}
