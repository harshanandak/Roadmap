/**
 * ToolPreviewCard Component
 *
 * Displays a preview of what an AI tool will do before execution.
 * Shows the action type, affected entities, and any warnings.
 */

'use client'

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  AlertTriangle,
  Shield,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ToolPreviewData {
  toolName: string
  displayName: string
  category: string
  requiresApproval: boolean
  isReversible: boolean
  preview: {
    action: 'create' | 'update' | 'delete' | 'analyze'
    entityType: string
    data: Record<string, unknown>
    description: string
    affectedItems?: Array<{ id: string; name: string; type: string }>
    warnings?: string[]
  }
}

interface ToolPreviewCardProps {
  preview: ToolPreviewData
  onApprove?: () => void
  onReject?: () => void
  isApproving?: boolean
  isRejecting?: boolean
  showActions?: boolean
  className?: string
}

const actionIcons = {
  create: Plus,
  update: Pencil,
  delete: Trash2,
  analyze: Search,
}

const actionColors = {
  create: 'bg-green-500/10 text-green-600 border-green-500/20',
  update: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  delete: 'bg-red-500/10 text-red-600 border-red-500/20',
  analyze: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
}

const categoryColors: Record<string, string> = {
  creation: 'bg-emerald-500/10 text-emerald-700',
  analysis: 'bg-violet-500/10 text-violet-700',
  optimization: 'bg-amber-500/10 text-amber-700',
  strategy: 'bg-sky-500/10 text-sky-700',
}

export function ToolPreviewCard({
  preview,
  onApprove,
  onReject,
  isApproving = false,
  isRejecting = false,
  showActions = true,
  className,
}: ToolPreviewCardProps) {
  const ActionIcon = actionIcons[preview.preview.action] || Search
  const actionColor = actionColors[preview.preview.action] || actionColors.analyze
  const categoryColor = categoryColors[preview.category] || 'bg-gray-500/10 text-gray-700'

  const isProcessing = isApproving || isRejecting

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={cn('rounded-lg border p-2', actionColor)}>
              <ActionIcon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">{preview.displayName}</CardTitle>
              <CardDescription className="mt-0.5">
                {preview.preview.description}
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant="outline" className={cn('text-xs', categoryColor)}>
              {preview.category}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        {/* Action Details */}
        <div className="rounded-lg border bg-muted/30 p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <span className="capitalize">{preview.preview.action}</span>
            <span className="text-muted-foreground">→</span>
            <span className="text-muted-foreground">{preview.preview.entityType}</span>
          </div>

          {/* Preview Data */}
          {Object.keys(preview.preview.data).length > 0 && (
            <div className="space-y-1 text-sm">
              {Object.entries(preview.preview.data).map(([key, value]) => (
                <div key={key} className="flex gap-2">
                  <span className="font-medium text-muted-foreground capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}:
                  </span>
                  <span className="text-foreground">
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Affected Items */}
        {preview.preview.affectedItems && preview.preview.affectedItems.length > 0 && (
          <div className="mt-3">
            <div className="mb-2 text-sm font-medium">
              Affected Items ({preview.preview.affectedItems.length})
            </div>
            <div className="flex flex-wrap gap-2">
              {preview.preview.affectedItems.slice(0, 5).map((item) => (
                <Badge key={item.id} variant="secondary" className="text-xs">
                  {item.name}
                </Badge>
              ))}
              {preview.preview.affectedItems.length > 5 && (
                <Badge variant="outline" className="text-xs">
                  +{preview.preview.affectedItems.length - 5} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Warnings */}
        {preview.preview.warnings && preview.preview.warnings.length > 0 && (
          <div className="mt-3 space-y-2">
            {preview.preview.warnings.map((warning, index) => (
              <Alert key={index} variant="destructive" className="py-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-sm">{warning}</AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        <Separator className="my-3" />

        {/* Metadata Badges */}
        <div className="flex flex-wrap gap-2">
          {preview.requiresApproval && (
            <Badge variant="outline" className="text-xs gap-1">
              <Shield className="h-3 w-3" />
              Requires Approval
            </Badge>
          )}
          {preview.isReversible && (
            <Badge variant="outline" className="text-xs gap-1 text-green-600">
              <RotateCcw className="h-3 w-3" />
              Reversible
            </Badge>
          )}
          {!preview.isReversible && (
            <Badge variant="outline" className="text-xs gap-1 text-amber-600">
              <AlertTriangle className="h-3 w-3" />
              Permanent
            </Badge>
          )}
        </div>
      </CardContent>

      {showActions && (onApprove || onReject) && (
        <CardFooter className="border-t bg-muted/30 px-4 py-3">
          <div className="flex w-full gap-2">
            {onReject && (
              <Button
                variant="outline"
                size="sm"
                onClick={onReject}
                disabled={isProcessing}
                className="flex-1"
              >
                {isRejecting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="mr-2 h-4 w-4" />
                )}
                Reject
              </Button>
            )}
            {onApprove && (
              <Button
                size="sm"
                onClick={onApprove}
                disabled={isProcessing}
                className="flex-1"
              >
                {isApproving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                Approve
              </Button>
            )}
          </div>
        </CardFooter>
      )}
    </Card>
  )
}

export default ToolPreviewCard
