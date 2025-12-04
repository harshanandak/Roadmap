'use client'

import { useFeatureOverview } from '@/lib/hooks/use-analytics'
import { MetricCard } from '@/components/analytics/metric-card'
import {
  AnalyticsPieChart,
  AnalyticsLineChart,
  GaugeChart,
} from '@/components/analytics/charts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, LayoutGrid, CheckCircle2, Clock, TrendingUp } from 'lucide-react'
import type { AnalyticsScope, DateRange } from '@/lib/types/analytics'

interface FeatureOverviewDashboardProps {
  workspaceId: string
  teamId: string
  scope: AnalyticsScope
  dateRange?: DateRange
}

export function FeatureOverviewDashboard({
  workspaceId,
  teamId,
  scope,
  dateRange,
}: FeatureOverviewDashboardProps) {
  const { data, isLoading, error } = useFeatureOverview(workspaceId, teamId, scope, dateRange)

  if (isLoading) {
    return <DashboardSkeleton />
  }

  if (error) {
    return <DashboardError error={error} />
  }

  if (!data) {
    return <DashboardEmpty />
  }

  // Calculate some derived metrics
  const completedCount = data.byStatus.find((s) => s.name === 'Completed')?.value || 0
  const inProgressCount = data.byStatus.find((s) => s.name === 'In Progress')?.value || 0

  return (
    <div className="space-y-6">
      {/* Metric Cards Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Work Items"
          value={data.totalWorkItems}
          icon={<LayoutGrid className="h-4 w-4" />}
          description={scope === 'team' ? 'Across all workspaces' : 'In this workspace'}
        />
        <MetricCard
          title="Completed"
          value={completedCount}
          icon={<CheckCircle2 className="h-4 w-4" />}
          trend={
            data.totalWorkItems > 0
              ? {
                  value: Math.round((completedCount / data.totalWorkItems) * 100),
                  direction: completedCount > 0 ? 'up' : 'neutral',
                }
              : undefined
          }
        />
        <MetricCard
          title="In Progress"
          value={inProgressCount}
          icon={<Clock className="h-4 w-4" />}
        />
        <GaugeChart
          title="Completion Rate"
          value={data.completionRate}
          label="completed"
          size="sm"
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <AnalyticsPieChart
          title="By Status"
          data={data.byStatus}
          description="Work items grouped by current status"
        />
        <AnalyticsPieChart
          title="By Type"
          data={data.byType}
          description="Features, bugs, enhancements, etc."
        />
        <AnalyticsPieChart
          title="By Phase"
          data={data.byPhase}
          description="Research, planning, execution, review"
        />
      </div>

      {/* Trend and Activity Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <AnalyticsLineChart
          title="Completion Trend"
          data={data.completionTrend}
          description="Items completed per week (last 12 weeks)"
          height={250}
        />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <TrendingUp className="h-4 w-4" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent activity</p>
            ) : (
              <div className="space-y-3">
                {data.recentActivity.slice(0, 5).map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <ActivityIcon type={activity.type} />
                      <span className="truncate max-w-[200px]">{activity.workItemName}</span>
                    </div>
                    <span className="text-muted-foreground">
                      {formatTimeAgo(activity.timestamp)}
                    </span>
                  </div>
                ))}
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-[350px]" />
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
        <LayoutGrid className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="font-medium">No data available</p>
        <p className="text-sm text-muted-foreground">
          Create some work items to see analytics
        </p>
      </CardContent>
    </Card>
  )
}

function ActivityIcon({ type }: { type: string }) {
  switch (type) {
    case 'completed':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />
    case 'blocked':
      return <AlertCircle className="h-4 w-4 text-red-500" />
    default:
      return <Clock className="h-4 w-4 text-blue-500" />
  }
}

function formatTimeAgo(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}
