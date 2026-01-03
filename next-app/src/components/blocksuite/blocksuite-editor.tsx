'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { cn } from '@/lib/utils'

// Types for BlockSuite modules (dynamically imported)
type Doc = import('@blocksuite/store').Doc

export interface BlockSuiteEditorProps {
  /** Editor mode: 'page' for document editing, 'edgeless' for canvas/whiteboard */
  mode?: 'page' | 'edgeless'
  /** Additional CSS classes */
  className?: string
  /** Callback when editor is ready with doc */
  onReady?: (doc: Doc) => void
  /** Callback when document content changes */
  onChange?: (doc: Doc) => void
  /** Initial content to load (Yjs snapshot base64 or JSON) */
  initialContent?: string
  /** Document ID for persistence */
  documentId?: string
  /** Whether the editor is read-only */
  readOnly?: boolean
}

/**
 * Safely clears all child nodes from a container element
 * This avoids innerHTML which can be an XSS vector
 */
function clearContainer(container: HTMLElement): void {
  while (container.firstChild) {
    container.removeChild(container.firstChild)
  }
}

/**
 * BlockSuite Editor React Wrapper
 *
 * This component wraps BlockSuite's Web Components for use in React.
 * It handles:
 * - Dynamic imports to avoid SSR issues
 * - Schema and DocCollection initialization
 * - Editor mounting/unmounting lifecycle
 * - Change event forwarding
 *
 * @example
 * ```tsx
 * <BlockSuiteEditor
 *   mode="edgeless"
 *   onReady={(doc) => console.log('Ready!', doc.id)}
 *   onChange={(doc) => console.log('Changed', doc)}
 * />
 * ```
 */
export function BlockSuiteEditor({
  mode = 'edgeless',
  className,
  onReady,
  onChange,
  initialContent,
  documentId,
  readOnly = false,
}: BlockSuiteEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<unknown>(null)
  const docRef = useRef<Doc | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Cleanup function
  const cleanup = useCallback(() => {
    if (editorRef.current && containerRef.current) {
      try {
        // Remove editor from DOM
        const editor = editorRef.current as { remove?: () => void }
        if (typeof editor.remove === 'function') {
          editor.remove()
        } else if (containerRef.current.firstChild) {
          containerRef.current.removeChild(containerRef.current.firstChild)
        }
      } catch (e) {
        console.warn('BlockSuite cleanup warning:', e)
      }
      editorRef.current = null
    }
    docRef.current = null
  }, [])

  useEffect(() => {
    let mounted = true
    let disposable: { dispose: () => void } | null = null

    const initEditor = async () => {
      if (!containerRef.current) return

      try {
        setIsLoading(true)
        setError(null)

        // Dynamic imports to avoid SSR issues
        // BlockSuite uses browser APIs that aren't available during SSR
        const presetsModule = await import('@blocksuite/presets')

        if (!mounted) return

        // Use the createEmptyDoc helper from presets which handles schema setup
        const { createEmptyDoc, EdgelessEditor, PageEditor } = presetsModule

        // Create document with proper initialization
        const { doc, init } = createEmptyDoc()

        // Initialize the document with blocks
        await init()
        docRef.current = doc

        if (!mounted) return

        // Create the appropriate editor
        let editor: unknown

        if (mode === 'edgeless') {
          editor = new EdgelessEditor()
        } else {
          editor = new PageEditor()
        }

        // Set editor properties
        const editorElement = editor as {
          doc: Doc
          mode: string
          readonly: boolean
        }
        editorElement.doc = doc
        editorElement.readonly = readOnly

        // Mount to container
        if (containerRef.current && mounted) {
          // Safely clear any existing content using DOM methods
          clearContainer(containerRef.current)

          // Append the editor element
          containerRef.current.appendChild(editor as Node)
          editorRef.current = editor

          // Set up change listener if doc has slots
          const docWithSlots = doc as Doc & {
            slots?: {
              historyUpdated?: {
                on: (callback: () => void) => { dispose: () => void }
              }
            }
          }
          if (docWithSlots.slots?.historyUpdated) {
            disposable = docWithSlots.slots.historyUpdated.on(() => {
              if (onChange && mounted) {
                onChange(doc)
              }
            })
          }

          // Notify ready
          if (onReady && mounted) {
            onReady(doc)
          }

          setIsLoading(false)
        }
      } catch (e) {
        console.error('Failed to initialize BlockSuite editor:', e)
        if (mounted) {
          setError(e instanceof Error ? e.message : 'Failed to load editor')
          setIsLoading(false)
        }
      }
    }

    initEditor()

    return () => {
      mounted = false
      if (disposable) {
        disposable.dispose()
      }
      cleanup()
    }
  }, [mode, documentId, readOnly, onReady, onChange, cleanup])

  // Handle content updates
  useEffect(() => {
    if (initialContent && docRef.current) {
      // TODO: Implement content loading from Yjs snapshot or JSON
      // This will be implemented in Phase 4 with the Supabase provider
      console.log('Initial content provided, loading not yet implemented')
    }
  }, [initialContent])

  if (error) {
    return (
      <div className={cn('flex items-center justify-center h-full min-h-[400px] bg-destructive/10 rounded-lg', className)}>
        <div className="text-center p-4">
          <p className="text-destructive font-medium">Failed to load editor</p>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Reload Page
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'blocksuite-editor-container w-full h-full min-h-[400px]',
        // Hide the loading state once editor is mounted
        isLoading && 'opacity-0',
        className
      )}
      style={{
        // Ensure the container takes up full space
        display: 'flex',
        flexDirection: 'column',
      }}
    />
  )
}

export default BlockSuiteEditor
