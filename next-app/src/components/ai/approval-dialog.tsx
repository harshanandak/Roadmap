/**
 * ApprovalDialog Component
 *
 * Modal dialog for reviewing and approving/rejecting pending AI actions.
 * Supports both single and batch approval workflows.
 */

'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  Clock,
  Shield,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ToolPreviewCard, type ToolPreviewData } from './tool-preview-card'

export interface PendingAction {
  id: string
  toolName: string
  displayName: string
  category: string
  params: Record<string, unknown>
  preview: ToolPreviewData['preview']
  requiresApproval: boolean
  isReversible: boolean
  createdAt: string
}

interface ApprovalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pendingActions: PendingAction[]
  onApprove: (actionId: string) => Promise<void>
  onApproveAll: (actionIds: string[]) => Promise<void>
  onReject: (actionId: string, reason?: string) => Promise<void>
  isProcessing?: boolean
}

export function ApprovalDialog({
  open,
  onOpenChange,
  pendingActions,
  onApprove,
  onApproveAll,
  onReject,
  isProcessing = false,
}: ApprovalDialogProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [approvingId, setApprovingId] = useState<string | null>(null)

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const toggleAll = () => {
    if (selectedIds.size === pendingActions.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(pendingActions.map(a => a.id)))
    }
  }

  const handleApprove = async (id: string) => {
    setApprovingId(id)
    try {
      await onApprove(id)
    } finally {
      setApprovingId(null)
    }
  }

  const handleApproveSelected = async () => {
    if (selectedIds.size === 0) return
    await onApproveAll(Array.from(selectedIds))
    setSelectedIds(new Set())
  }

  const handleReject = async (id: string) => {
    setRejectingId(id)
    try {
      await onReject(id, rejectReason || undefined)
      setRejectReason('')
      setRejectingId(null)
    } catch {
      setRejectingId(null)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-amber-500" />
            Pending Approvals
          </DialogTitle>
          <DialogDescription>
            Review and approve AI actions before they execute. These actions require human confirmation.
          </DialogDescription>
        </DialogHeader>

        {pendingActions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mb-3" />
            <p className="text-lg font-medium">All caught up!</p>
            <p className="text-sm text-muted-foreground">
              No pending actions require your approval.
            </p>
          </div>
        ) : (
          <>
            {/* Batch Selection Header */}
            {pendingActions.length > 1 && (
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="select-all"
                    checked={selectedIds.size === pendingActions.length}
                    onCheckedChange={toggleAll}
                  />
                  <Label htmlFor="select-all" className="text-sm cursor-pointer">
                    Select all ({pendingActions.length} actions)
                  </Label>
                </div>
                {selectedIds.size > 0 && (
                  <Button
                    size="sm"
                    onClick={handleApproveSelected}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                    )}
                    Approve {selectedIds.size} selected
                  </Button>
                )}
              </div>
            )}

            {/* Actions List */}
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-3 py-2">
                {pendingActions.map((action) => {
                  const isExpanded = expandedId === action.id
                  const isApproving = approvingId === action.id
                  const isRejecting = rejectingId === action.id

                  return (
                    <div
                      key={action.id}
                      className={cn(
                        'rounded-lg border transition-colors',
                        selectedIds.has(action.id) && 'border-primary bg-primary/5'
                      )}
                    >
                      {/* Collapsed View */}
                      <div className="flex items-center gap-3 p-3">
                        {pendingActions.length > 1 && (
                          <Checkbox
                            checked={selectedIds.has(action.id)}
                            onCheckedChange={() => toggleSelection(action.id)}
                          />
                        )}
                        <div
                          className="flex-1 cursor-pointer"
                          onClick={() => setExpandedId(isExpanded ? null : action.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{action.displayName}</span>
                              <Badge variant="outline" className="text-xs">
                                {action.category}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-3.5 w-3.5" />
                              {formatDate(action.createdAt)}
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {action.preview.description}
                          </p>
                        </div>
                      </div>

                      {/* Expanded View */}
                      {isExpanded && (
                        <div className="border-t px-3 pb-3 pt-3">
                          <ToolPreviewCard
                            preview={{
                              toolName: action.toolName,
                              displayName: action.displayName,
                              category: action.category,
                              requiresApproval: action.requiresApproval,
                              isReversible: action.isReversible,
                              preview: action.preview,
                            }}
                            showActions={false}
                            className="border-0 shadow-none"
                          />

                          <Separator className="my-3" />

                          {/* Reject with Reason */}
                          {rejectingId === action.id && (
                            <div className="mb-3 space-y-2">
                              <Label htmlFor="reject-reason" className="text-sm">
                                Rejection reason (optional)
                              </Label>
                              <Textarea
                                id="reject-reason"
                                placeholder="Why are you rejecting this action?"
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                rows={2}
                              />
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex gap-2">
                            {rejectingId === action.id ? (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setRejectingId(null)}
                                  className="flex-1"
                                >
                                  Cancel
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleReject(action.id)}
                                  disabled={isProcessing}
                                  className="flex-1"
                                >
                                  {isProcessing ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  ) : (
                                    <XCircle className="mr-2 h-4 w-4" />
                                  )}
                                  Confirm Reject
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setRejectingId(action.id)}
                                  disabled={isProcessing || isApproving}
                                  className="flex-1"
                                >
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Reject
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleApprove(action.id)}
                                  disabled={isProcessing || isRejecting}
                                  className="flex-1"
                                >
                                  {isApproving ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                  )}
                                  Approve
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </>
        )}

        <DialogFooter className="border-t pt-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4" />
            Approved actions will execute immediately
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ApprovalDialog
