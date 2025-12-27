'use client'

/**
 * Canvas View Wrapper
 *
 * Wraps the UnifiedCanvas component for integration into workspace views
 * Handles data fetching, mutations, and state management
 */

import { useState, useCallback } from 'react'
import { UnifiedCanvas } from './unified-canvas'
import { ConvertNoteDialog } from './convert-note-dialog'
import { createClient } from '@/lib/supabase/client'
import { Tables } from '@/lib/supabase/database.types'
import { useRouter } from 'next/navigation'

type WorkItem = Tables<'work_items'>

interface LinkedItem {
  id: string
  source_item_id: string
  target_item_id: string
  relationship_type: string
}

interface CanvasViewWrapperProps {
  workspaceId: string
  teamId: string
  initialWorkItems: WorkItem[]
  initialLinkedItems: LinkedItem[]
}

export function CanvasViewWrapper({
  workspaceId,
  teamId,
  initialWorkItems,
  initialLinkedItems,
}: CanvasViewWrapperProps) {
  const router = useRouter()
  const supabase = createClient()

  const [convertNoteDialogOpen, setConvertNoteDialogOpen] = useState(false)
  const [selectedNote, _setSelectedNote] = useState<WorkItem | null>(null)

  // Update work item position
  const handleWorkItemUpdate = useCallback(
    async (update: Partial<WorkItem>) => {
      try {
        const { error } = await supabase
          .from('work_items')
          .update(update)
          .eq('id', update.id!)
          .eq('team_id', teamId)

        if (error) {
          console.error('[CanvasViewWrapper] Failed to update work item:', error)
          throw error
        }
      } catch (error) {
        console.error('[CanvasViewWrapper] Error updating work item:', error)
      }
    },
    [supabase, teamId]
  )

  // Create link between work items
  const handleLinkCreate = useCallback(
    async (link: { source_item_id: string; target_item_id: string; link_type: string }) => {
      try {
        const { error } = await supabase.from('linked_items').insert({
          id: Date.now().toString(),
          team_id: teamId,
          ...link,
        })

        if (error) {
          console.error('[CanvasViewWrapper] Failed to create link:', error)
          throw error
        }

        router.refresh()
      } catch (error) {
        console.error('[CanvasViewWrapper] Error creating link:', error)
      }
    },
    [supabase, teamId, router]
  )

  // Delete link
  const handleLinkDelete = useCallback(
    async (linkId: string) => {
      try {
        const { error } = await supabase
          .from('linked_items')
          .delete()
          .eq('id', linkId)
          .eq('team_id', teamId)

        if (error) {
          console.error('[CanvasViewWrapper] Failed to delete link:', error)
          throw error
        }

        router.refresh()
      } catch (error) {
        console.error('[CanvasViewWrapper] Error deleting link:', error)
      }
    },
    [supabase, teamId, router]
  )

  // Convert note to work item
  const handleNoteConvert = useCallback(
    async (workItemData: {
      type: string
      name: string
      purpose: string
      priority: string
      tags: string[]
      acceptanceCriteria: string[]
      estimatedHours?: number
    }) => {
      if (!selectedNote) return

      try {
        // Update the existing note to become a proper work item
        const { error } = await supabase
          .from('work_items')
          .update({
            type: workItemData.type,
            name: workItemData.name,
            purpose: workItemData.purpose,
            priority: workItemData.priority,
            acceptance_criteria: workItemData.acceptanceCriteria,
            estimated_hours: workItemData.estimatedHours,
            is_note: false,
            is_placeholder: false,
            note_type: null,
            note_content: null,
          })
          .eq('id', selectedNote.id)
          .eq('team_id', teamId)

        if (error) {
          console.error('[CanvasViewWrapper] Failed to convert note:', error)
          throw error
        }

        // Create tags if needed
        if (workItemData.tags.length > 0) {
          for (const tagName of workItemData.tags) {
            // Check if tag exists
            const { data: existingTag } = await supabase
              .from('tags')
              .select('id')
              .eq('name', tagName)
              .eq('team_id', teamId)
              .single()

            let tagId: string

            if (existingTag) {
              tagId = existingTag.id
            } else {
              // Create new tag
              const { data: newTag, error: tagError } = await supabase
                .from('tags')
                .insert({
                  id: Date.now().toString(),
                  team_id: teamId,
                  name: tagName,
                  color: '#3b82f6',
                })
                .select('id')
                .single()

              if (tagError) {
                console.error('[CanvasViewWrapper] Failed to create tag:', tagError)
                continue
              }

              tagId = newTag!.id
            }

            // Link tag to work item
            await supabase.from('work_item_tags').insert({
              work_item_id: selectedNote.id,
              tag_id: tagId,
            })
          }
        }

        router.refresh()
      } catch (error) {
        console.error('[CanvasViewWrapper] Error converting note:', error)
        throw error
      }
    },
    [supabase, teamId, selectedNote, router]
  )

  // Get workspace context for AI analysis
  const workspaceContext = {
    existingTypes: Array.from(new Set(initialWorkItems.map((item) => item.type))),
    existingTags: [], // TODO: Fetch tags from workspace
  }

  return (
    <>
      <UnifiedCanvas
        workspaceId={workspaceId}
        teamId={teamId}
        workItems={initialWorkItems}
        linkedItems={initialLinkedItems}
        onWorkItemUpdate={handleWorkItemUpdate}
        onLinkCreate={handleLinkCreate}
        onLinkDelete={handleLinkDelete}
        className="w-full h-full"
      />

      {selectedNote && (
        <ConvertNoteDialog
          open={convertNoteDialogOpen}
          onOpenChange={setConvertNoteDialogOpen}
          noteContent={selectedNote.note_content || ''}
          workspaceContext={workspaceContext}
          onConvert={handleNoteConvert}
        />
      )}
    </>
  )
}
