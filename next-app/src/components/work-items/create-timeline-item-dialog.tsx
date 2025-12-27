'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import {
  PROGRESS_STATES,
  PROGRESS_METADATA,
  TimelineProgress,
  LIFECYCLE_STATUSES,
  LIFECYCLE_STATUS_METADATA,
  LifecycleStatus,
} from '@/lib/constants/work-item-types'

interface CreateTimelineItemDialogProps {
  workItemId: string
  timeline: 'MVP' | 'SHORT' | 'LONG'
  orderIndex: number
}

export function CreateTimelineItemDialog({
  workItemId,
  timeline,
  orderIndex: _orderIndex,
}: CreateTimelineItemDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [difficulty, setDifficulty] = useState<string>('MEDIUM')
  const [estimatedHours, setEstimatedHours] = useState('')
  const [progress, setProgress] = useState<TimelineProgress>(PROGRESS_STATES.NOT_STARTED)
  // Updated 2025-12-13: 'PLANNING' → 'DESIGN' in 4-phase system
  const [lifecycleStatus, setLifecycleStatus] = useState<LifecycleStatus>(LIFECYCLE_STATUSES.DESIGN)

  const router = useRouter()
  const supabase = createClient()

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (!title.trim()) {
        throw new Error('Title is required')
      }

      // Check if a timeline item already exists for this work item + timeline type
      const { data: existingItem } = await supabase
        .from('timeline_items')
        .select('id, title')
        .eq('work_item_id', workItemId)
        .eq('timeline', timeline)
        .maybeSingle()

      if (existingItem) {
        throw new Error(
          `A ${timeline} timeline item already exists for this work item: "${existingItem.title}". Each work item can only have one item per timeline type (MVP, SHORT, LONG).`
        )
      }

      const itemId = `timeline_item_${Date.now()}`

      // Create timeline item - use work_item_id column (NOT feature_id)
      // Note: order_index column doesn't exist in DB, so we don't include it
      const { error } = await supabase.from('timeline_items').insert({
        id: itemId,
        work_item_id: workItemId,
        title: title.trim(),
        description: description.trim() || null,
        timeline,
        difficulty,
        estimated_hours: estimatedHours ? parseInt(estimatedHours) : null,
        status: progress,  // progress maps to status column in DB
        phase: lifecycleStatus,  // lifecycleStatus maps to phase column in DB
      })

      if (error) throw error

      // Reset form
      setTitle('')
      setDescription('')
      setDifficulty('MEDIUM')
      setEstimatedHours('')
      setProgress(PROGRESS_STATES.NOT_STARTED)
      setLifecycleStatus(LIFECYCLE_STATUSES.DESIGN) // Updated 2025-12-13: PLANNING → DESIGN
      setOpen(false)

      // Refresh the page
      router.refresh()
    } catch (error: unknown) {
      console.error('Error creating timeline item:', error)
      // Handle unique constraint violation from database
      const errorObj = error as { code?: string; message?: string }
      if (errorObj.code === '23505' || errorObj.message?.includes('unique_work_item_timeline')) {
        alert(`A ${timeline} timeline item already exists for this work item. Each work item can only have one item per timeline type (MVP, SHORT, LONG).`)
      } else {
        alert(errorObj.message || 'Failed to create timeline item')
      }
    } finally {
      setLoading(false)
    }
  }

  const timelineLabels = {
    MVP: 'MVP',
    SHORT: 'Short Term',
    LONG: 'Long Term',
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleCreate}>
          <DialogHeader>
            <DialogTitle>Add {timelineLabels[timeline]} Item</DialogTitle>
            <DialogDescription>
              Add a new item to the {timelineLabels[timeline]} timeline
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., User login page"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what needs to be done..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="difficulty">Difficulty</Label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger id="difficulty">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EASY">Easy</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HARD">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="estimatedHours">Estimated Hours</Label>
                <Input
                  id="estimatedHours"
                  type="number"
                  min="1"
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(e.target.value)}
                  placeholder="e.g., 8"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="progress">Initial Progress</Label>
                <Select value={progress} onValueChange={(value) => setProgress(value as TimelineProgress)}>
                  <SelectTrigger id="progress">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(PROGRESS_STATES).map((progressValue) => (
                      <SelectItem key={progressValue} value={progressValue}>
                        {PROGRESS_METADATA[progressValue].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="lifecycleStatus">Status</Label>
                <Select value={lifecycleStatus} onValueChange={(value) => setLifecycleStatus(value as LifecycleStatus)}>
                  <SelectTrigger id="lifecycleStatus">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(LIFECYCLE_STATUSES).map((statusValue) => (
                      <SelectItem key={statusValue} value={statusValue}>
                        {LIFECYCLE_STATUS_METADATA[statusValue].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Item'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
