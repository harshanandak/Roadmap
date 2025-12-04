'use client'

import { useTeamPerformance } from '@/lib/hooks/use-analytics'
import { MetricCard } from '@/components/analytics/metric-card'
import {
  AnalyticsPieChart,
  AnalyticsBarChart,
  AnalyticsLineChart,
  GaugeChart,
} from '@/components/analytics/charts'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, Users, CheckCircle2, Clock, AlertTriangle } from 'lucide-react'
import type { AnalyticsScope, DateRange } from '@/lib/types/analytics'

interface TeamPerformanceDashboardProps {
  workspaceId: string
  teamId: string
  scope: AnalyticsScope
  dateRange?: DateRange
}

export function TeamPerformanceDashboard({
  workspaceId,
  teamId,
  scope,
  dateRange,
}: TeamPerformanceDashboardProps) {
  const { data, isLoading, error } = useTeamPerformance(workspaceId, teamId, scope, dateRange)

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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <MetricCard
          title="Total Tasks"
          value={data.totalTasks}
          icon={<CheckCircle2 className="h-4 w-4" />}
          description={scope === 'team' ? 'Across all workspaces' : 'In this workspace'}
        />
        <MetricCard
          title="Overdue"
          value={data.overdueCount}
          icon={<AlertTriangle className="h-4 w-4" />}
          className={data.overdueCount > 0 ? 'border-amber-500' : ''}
          trend={
            data.overdueCount > 0
              ? { value: data.overdueCount, direction: 'down' }
              : undefined
          }
        />
        <MetricCard
          title="Avg Cycle Time"
          value={`${data.avgCycleTimeDays}d`}
          icon={<Clock className="h-4 w-4" />}
          description="From creation to completion"
        />
        <GaugeChart
          title="Completion Rate"
          value={data.completionRate}
          label="done"
          size="sm"
        />
        <MetricCard
          title="Team Members"
          value={data.tasksByAssignee.length}
          icon={<Users className="h-4 w-4" />}
          description="With assigned tasks"
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <AnalyticsPieChart
          title="Tasks by Status"
          data={data.tasksByStatus}
          description="Current task status distribution"
        />
        <AnalyticsBarChart
          title="Tasks by Type"
          data={data.tasksByType}
          description="Research, design, development, etc."
          layout="horizontal"
          colorByValue
        />
        <AnalyticsBarChart
          title="Team Workload"
          data={data.tasksByAssignee}
          description="Tasks per team member"
          layout="horizontal"
        />
      </div>

      {/* Velocity Trend */}
      <AnalyticsLineChart
        title="Velocity Trend"
        data={data.velocityTrend}
        description="Tasks completed per week (last 12 weeks)"
        height={300}
      />
    </div>
  )
}

// Helper components
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-[350px]" />
        ))}
      </div>
      <Skeleton className="h-[350px]" />
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
        <Users className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="font-medium">No tasks found</p>
        <p className="text-sm text-muted-foreground">
          Create tasks to see team performance metrics
        </p>
      </CardContent>
    </Card>
  )
}
