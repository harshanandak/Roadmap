'use client'

/**
 * BlockersWidget Component
 *
 * Shows blocking issues for Launch mode.
 * Displays work items that are blocked or have blockers.
 */

import { AlertTriangle, ChevronRight, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface BlockerItem {
  id: string
  name: string
  type: string
  priority: string
  blockedBy?: string
  daysBlocked?: number
}

interface BlockersWidgetProps {
  blockers: BlockerItem[]
  onViewBlocker?: (id: string) => void
  onViewAll?: () => void
  className?: string
}

export function BlockersWidget({
  blockers,
  onViewBlocker,
  onViewAll,
  className,
}: BlockersWidgetProps) {
  const criticalBlockers = blockers.filter((b) => b.priority === 'critical')
  const highBlockers = blockers.filter((b) => b.priority === 'high')
  const otherBlockers = blockers.filter(
    (b) => b.priority !== 'critical' && b.priority !== 'high'
  )

  return (
    <Card className={cn('border-orange-200 dark:border-orange-900', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <CardTitle className="text-base">Blockers</CardTitle>
            {blockers.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {blockers.length}
              </Badge>
            )}
          </div>
          {onViewAll && blockers.length > 0 && (
            <Button variant="ghost" size="sm" onClick={onViewAll}>
              View All
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {blockers.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>No blockers! You&apos;re clear for launch.</p>
          </div>
        ) : (
          <ScrollArea className="h-[200px]">
            <div className="space-y-2">
              {/* Critical Blockers */}
              {criticalBlockers.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-destructive uppercase tracking-wide">
                    Critical
                  </p>
                  {criticalBlockers.map((blocker) => (
                    <BlockerRow
                      key={blocker.id}
                      blocker={blocker}
                      onClick={onViewBlocker}
                      variant="critical"
                    />
                  ))}
                </div>
              )}

              {/* High Priority Blockers */}
              {highBlockers.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-orange-500 uppercase tracking-wide">
                    High Priority
                  </p>
                  {highBlockers.map((blocker) => (
                    <BlockerRow
                      key={blocker.id}
                      blocker={blocker}
                      onClick={onViewBlocker}
                      variant="high"
                    />
                  ))}
                </div>
              )}

              {/* Other Blockers */}
              {otherBlockers.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Other
                  </p>
                  {otherBlockers.map((blocker) => (
                    <BlockerRow
                      key={blocker.id}
                      blocker={blocker}
                      onClick={onViewBlocker}
                    />
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}

function BlockerRow({
  blocker,
  onClick,
  variant,
}: {
  blocker: BlockerItem
  onClick?: (id: string) => void
  variant?: 'critical' | 'high'
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors',
        variant === 'critical' && 'bg-destructive/10 hover:bg-destructive/20',
        variant === 'high' && 'bg-orange-500/10 hover:bg-orange-500/20',
        !variant && 'bg-muted/50 hover:bg-muted'
      )}
      onClick={() => onClick?.(blocker.id)}
    >
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{blocker.name}</p>
        {blocker.blockedBy && (
          <p className="text-xs text-muted-foreground truncate">
            Blocked by: {blocker.blockedBy}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {blocker.daysBlocked !== undefined && blocker.daysBlocked > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {blocker.daysBlocked}d
          </div>
        )}
        <Badge variant="outline" className="capitalize">
          {blocker.type}
        </Badge>
      </div>
    </div>
  )
}

export default BlockersWidget
