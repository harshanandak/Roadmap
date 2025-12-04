'use client'

import { useDependencyHealth } from '@/lib/hooks/use-analytics'
import { MetricCard } from '@/components/analytics/metric-card'
import { AnalyticsPieChart, GaugeChart } from '@/components/analytics/charts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertCircle,
  GitBranch,
  AlertTriangle,
  Link2,
  ArrowRight,
} from 'lucide-react'
import type { AnalyticsScope } from '@/lib/types/analytics'

interface DependencyHealthDashboardProps {
  workspaceId: string
  teamId: string
  scope: AnalyticsScope
}

export function DependencyHealthDashboard({
  workspaceId,
  teamId,
  scope,
}: DependencyHealthDashboardProps) {
  const { data, isLoading, error } = useDependencyHealth(workspaceId, teamId, scope)

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
          title="Total Dependencies"
          value={data.totalDependencies}
          icon={<Link2 className="h-4 w-4" />}
          description="Active connections between items"
        />
        <MetricCard
          title="Blocked Items"
          value={data.blockedCount}
          icon={<AlertTriangle className="h-4 w-4" />}
          trend={
            data.blockedCount > 0
              ? { value: data.blockedCount, direction: 'down' }
              : undefined
          }
          className={data.blockedCount > 5 ? 'border-destructive' : ''}
        />
        <MetricCard
          title="Critical Path Length"
          value={data.criticalPath.length}
          icon={<ArrowRight className="h-4 w-4" />}
          description="Longest dependency chain"
        />
        <GaugeChart
          title="Health Score"
          value={data.healthScore}
          label="healthy"
          size="sm"
        />
      </div>

      {/* Charts and Lists Row */}
      <div className="grid gap-4 md:grid-cols-2">
        <AnalyticsPieChart
          title="Dependency Types"
          data={data.byType}
          description="Distribution of connection types"
        />

        {/* Critical Path Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <GitBranch className="h-4 w-4" />
              Critical Path
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.criticalPath.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">No dependencies found</p>
            ) : (
              <div className="space-y-2">
                {data.criticalPath.items.map((item, index) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <Badge variant="outline" className="w-6 h-6 p-0 justify-center">
                      {index + 1}
                    </Badge>
                    <span className="text-sm truncate">{item.name}</span>
                    {index < data.criticalPath.items.length - 1 && (
                      <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Blocked and Risk Items Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Blocked Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Blocked Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.blockedItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">No blocked items</p>
            ) : (
              <div className="space-y-3">
                {data.blockedItems.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="truncate max-w-[200px]">{item.name}</span>
                    <Badge variant="secondary">
                      {item.blockedByCount} blocker{item.blockedByCount !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Risk Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <AlertCircle className="h-4 w-4 text-red-500" />
              High Risk Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.riskItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">No high-risk items</p>
            ) : (
              <div className="space-y-3">
                {data.riskItems.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="truncate max-w-[200px]">{item.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">
                        {item.dependencyCount} deps
                      </span>
                      <RiskBadge score={item.riskScore} />
                    </div>
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
      <div className="grid gap-4 md:grid-cols-2">
        {[...Array(2)].map((_, i) => (
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
        <GitBranch className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="font-medium">No dependencies found</p>
        <p className="text-sm text-muted-foreground">
          Create dependencies between work items to see health metrics
        </p>
      </CardContent>
    </Card>
  )
}

function RiskBadge({ score }: { score: number }) {
  const variant = score >= 70 ? 'destructive' : score >= 40 ? 'secondary' : 'outline'
  return <Badge variant={variant}>{score}%</Badge>
}
