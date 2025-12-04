'use client'

import { useStrategyAlignment } from '@/lib/hooks/use-analytics'
import { MetricCard } from '@/components/analytics/metric-card'
import { AnalyticsPieChart, GaugeChart } from '@/components/analytics/charts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, Target, Link2Off, Flag, TrendingUp } from 'lucide-react'
import type { AnalyticsScope } from '@/lib/types/analytics'

interface StrategyAlignmentDashboardProps {
  workspaceId: string
  teamId: string
  scope: AnalyticsScope
}

export function StrategyAlignmentDashboard({
  workspaceId,
  teamId,
  scope,
}: StrategyAlignmentDashboardProps) {
  const { data, isLoading, error } = useStrategyAlignment(workspaceId, teamId, scope)

  if (isLoading) {
    return <DashboardSkeleton />
  }

  if (error) {
    return <DashboardError error={error} />
  }

  if (!data) {
    return <DashboardEmpty />
  }

  return (
    <div className="space-y-6">
      {/* Metric Cards Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Strategies"
          value={data.totalStrategies}
          icon={<Target className="h-4 w-4" />}
          description="Pillars, OKRs, and initiatives"
        />
        <MetricCard
          title="Aligned Items"
          value={data.alignedWorkItemCount}
          icon={<Flag className="h-4 w-4" />}
          description="Work items linked to strategy"
          trend={{
            value: data.alignmentRate,
            direction: data.alignmentRate >= 50 ? 'up' : 'down',
          }}
        />
        <MetricCard
          title="Unaligned Items"
          value={data.unalignedWorkItemCount}
          icon={<Link2Off className="h-4 w-4" />}
          className={data.unalignedWorkItemCount > 10 ? 'border-amber-500' : ''}
        />
        <GaugeChart
          title="Alignment Rate"
          value={data.alignmentRate}
          label="aligned"
          size="sm"
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        <AnalyticsPieChart
          title="Strategies by Type"
          data={data.byType}
          description="Pillars, objectives, key results, initiatives"
        />
        <AnalyticsPieChart
          title="Strategies by Status"
          data={data.byStatus}
          description="Draft, active, completed, etc."
        />
      </div>

      {/* Progress by Pillar and Unaligned Items Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Progress by Pillar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <TrendingUp className="h-4 w-4" />
              Progress by Pillar
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.progressByPillar.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pillars defined</p>
            ) : (
              <div className="space-y-4">
                {data.progressByPillar.map((pillar) => (
                  <div key={pillar.id} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium truncate max-w-[200px]">
                        {pillar.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{pillar.workItemCount} items</Badge>
                        <span className="text-muted-foreground">{pillar.progress}%</span>
                      </div>
                    </div>
                    <Progress value={pillar.progress} className="h-2" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Unaligned Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <Link2Off className="h-4 w-4 text-amber-500" />
              Unaligned Work Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.unalignedItems.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-green-600 font-medium">All items aligned!</p>
                <p className="text-xs text-muted-foreground">
                  Great job keeping work aligned to strategy
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.unalignedItems.slice(0, 8).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="truncate max-w-[200px]">{item.name}</span>
                    <Badge variant="secondary">{formatLabel(item.type)}</Badge>
                  </div>
                ))}
                {data.unalignedItems.length > 8 && (
                  <p className="text-xs text-muted-foreground text-center">
                    +{data.unalignedItems.length - 8} more items
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Helper components
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <Skeleton key={i} className="h-[350px]" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <Skeleton key={i} className="h-[300px]" />
        ))}
      </div>
    </div>
  )
}

function DashboardError({ error }: { error: Error }) {
  return (
    <Card className="border-destructive">
      <CardContent className="flex items-center gap-3 py-6">
        <AlertCircle className="h-5 w-5 text-destructive" />
        <div>
          <p className="font-medium">Failed to load dashboard</p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function DashboardEmpty() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <Target className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="font-medium">No strategies found</p>
        <p className="text-sm text-muted-foreground">
          Create strategic pillars and OKRs to track alignment
        </p>
      </CardContent>
    </Card>
  )
}

function formatLabel(str: string): string {
  return str
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
