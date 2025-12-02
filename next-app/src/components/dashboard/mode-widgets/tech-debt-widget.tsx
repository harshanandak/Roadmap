'use client'

/**
 * TechDebtWidget Component
 *
 * Shows technical debt items for Maintenance mode.
 * Displays tech debt work items grouped by category.
 */

import { Wrench, Code, TestTube, FileText, Clock, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface TechDebtItem {
  id: string
  name: string
  category: 'code' | 'test' | 'docs' | 'deps' | 'other'
  priority: string
  effort?: 'low' | 'medium' | 'high'
  age?: number // days since created
}

interface TechDebtStats {
  total: number
  resolved: number
  items: TechDebtItem[]
}

interface TechDebtWidgetProps {
  stats: TechDebtStats
  onViewItem?: (id: string) => void
  onViewAll?: () => void
  className?: string
}

const CATEGORY_CONFIG = {
  code: { label: 'Code Quality', icon: Code, color: '#6366f1' },
  test: { label: 'Test Coverage', icon: TestTube, color: '#10b981' },
  docs: { label: 'Documentation', icon: FileText, color: '#f59e0b' },
  deps: { label: 'Dependencies', icon: Wrench, color: '#ec4899' },
  other: { label: 'Other', icon: Wrench, color: '#6b7280' },
}

export function TechDebtWidget({
  stats,
  onViewItem,
  onViewAll,
  className,
}: TechDebtWidgetProps) {
  const progressPercent =
    stats.total > 0 ? ((stats.resolved / stats.total) * 100) : 0

  // Group items by category
  const itemsByCategory = stats.items.reduce(
    (acc, item) => {
      const cat = item.category || 'other'
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(item)
      return acc
    },
    {} as Record<string, TechDebtItem[]>
  )

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-slate-500" />
            <CardTitle className="text-base">Technical Debt</CardTitle>
          </div>
          {onViewAll && (
            <Button variant="ghost" size="sm" onClick={onViewAll}>
              View All
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Resolution Progress</span>
            <span className="font-medium">
              {stats.resolved} / {stats.total} resolved
            </span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        {/* Category Breakdown */}
        <div className="space-y-3">
          {Object.entries(itemsByCategory).map(([category, items]) => {
            const config = CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG]
            const Icon = config?.icon || Wrench
            return (
              <div key={category} className="space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  <Icon
                    className="h-4 w-4"
                    style={{ color: config?.color || '#6b7280' }}
                  />
                  <span className="font-medium">{config?.label || category}</span>
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {items.length}
                  </Badge>
                </div>
                <div className="pl-6 space-y-1">
                  {items.slice(0, 2).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted"
                      onClick={() => onViewItem?.(item.id)}
                    >
                      <p className="flex-1 text-sm truncate">{item.name}</p>
                      <div className="flex items-center gap-2 shrink-0">
                        {item.age !== undefined && item.age > 30 && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {item.age}d
                          </div>
                        )}
                        {item.effort && (
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-xs',
                              item.effort === 'low' && 'border-green-500 text-green-500',
                              item.effort === 'medium' && 'border-yellow-500 text-yellow-500',
                              item.effort === 'high' && 'border-red-500 text-red-500'
                            )}
                          >
                            {item.effort}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                  {items.length > 2 && (
                    <p className="text-xs text-muted-foreground pl-2">
                      +{items.length - 2} more
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

export default TechDebtWidget
