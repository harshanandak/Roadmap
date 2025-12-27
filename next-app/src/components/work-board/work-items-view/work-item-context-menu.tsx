'use client'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Calendar,
  Eye,
} from 'lucide-react'

interface WorkItem {
  id: string
  name: string
  type: string
  status: string | null
  [key: string]: unknown
}

interface WorkItemContextMenuProps {
  workItem: WorkItem
  hasTimelines: boolean
  onEdit?: () => void
  onDelete?: () => void
  onConvertToTimeline?: () => void
  onViewDetails?: () => void
}

export function WorkItemContextMenu({
  hasTimelines,
  onEdit,
  onDelete,
  onConvertToTimeline,
  onViewDetails,
}: WorkItemContextMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[160px]">
        {onViewDetails && (
          <DropdownMenuItem onClick={onViewDetails}>
            <Eye className="mr-2 h-4 w-4" />
            View Details
          </DropdownMenuItem>
        )}

        {onEdit && (
          <DropdownMenuItem onClick={onEdit}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
        )}

        {/* Show "Convert to Timeline" only for standard items (no timelines) */}
        {!hasTimelines && onConvertToTimeline && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onConvertToTimeline}>
              <Calendar className="mr-2 h-4 w-4" />
              Add Timeline
            </DropdownMenuItem>
          </>
        )}

        {onDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export type { WorkItemContextMenuProps }
