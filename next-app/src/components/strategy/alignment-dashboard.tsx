'use client'

/**
 * Alignment Dashboard Component
 *
 * Displays 4 visualizations for strategy alignment analytics:
 * 1. Strategy Distribution (PieChart) - byType
 * 2. Progress by Type (BarChart horizontal) - avgProgress per type
 * 3. Alignment Coverage (RadialBarChart) - coverage percentage
 * 4. Top Aligned Strategies (Table) - most aligned strategies
 *
 * Uses Recharts for visualizations and the useStrategyStats hook.
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts'
import { cn } from '@/lib/utils'
import {
  STRATEGY_TYPE_COLORS,
  getStrategyTypeLabel,
  getStrategyTypeShortLabel,
  type StrategyType,
} from '@/lib/types/strategy'
import type { StrategyStatsResponse } from '@/lib/hooks/use-strategies'
import {
  Target,
  Flag,
  TrendingUp,
  Lightbulb,
  Link2,
  AlertCircle,
} from 'lucide-react'

interface AlignmentDashboardProps {
  stats: StrategyStatsResponse['data'] | undefined
  isLoading: boolean
  error?: Error | null
  className?: string
}

// Type icon mapping
const typeIcons: Record<string, React.ElementType> = {
  pillar: Flag,
  objective: Target,
  key_result: TrendingUp,
  initiative: Lightbulb,
}

// Recharts tooltip/legend prop types
interface TooltipPayloadItem {
  value: number
  payload: Record<string, unknown>
}

interface TooltipProps {
  active?: boolean
  payload?: TooltipPayloadItem[]
  label?: string
}

interface LegendPayloadItem {
  value: string
  color: string
}

interface LegendProps {
  payload?: LegendPayloadItem[]
}

/**
 * Custom tooltip for pie chart
 */
function PieTooltip({ active, payload }: TooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0].payload as { name: string; value: number }
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <p className="font-medium">{data.name}</p>
        <p className="text-sm text-muted-foreground">
          {data.value} {data.value === 1 ? 'strategy' : 'strategies'}
        </p>
      </div>
    )
  }
  return null
}

/**
 * Custom tooltip for bar chart
 */
function BarTooltip({ active, payload, label }: TooltipProps) {
  if (active && payload && payload.length) {
    const itemPayload = payload[0].payload as { count: number }
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <p className="font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">
          Avg Progress: {payload[0].value}%
        </p>
        <p className="text-xs text-muted-foreground">
          ({itemPayload.count} {itemPayload.count === 1 ? 'strategy' : 'strategies'})
        </p>
      </div>
    )
  }
  return null
}

/**
 * Custom legend for pie chart
 */
function PieLegend({ payload }: LegendProps) {
  if (!payload) return null
  return (
    <ul className="flex flex-wrap justify-center gap-3 pt-2">
      {payload.map((entry, index: number) => (
        <li key={`legend-${index}`} className="flex items-center gap-1.5 text-xs">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.value}</span>
        </li>
      ))}
    </ul>
  )
}

/**
 * 1. Strategy Distribution Pie Chart
 */
function DistributionChart({ data }: { data: Record<string, number> }) {
  const chartData = Object.entries(data)
    .filter(([, value]) => value > 0)
    .map(([type, value]) => ({
      name: getStrategyTypeLabel(type as StrategyType),
      value,
      color: STRATEGY_TYPE_COLORS[type as StrategyType],
    }))

  const total = chartData.reduce((sum, item) => sum + item.value, 0)

  if (chartData.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-muted-foreground">
        No strategies yet
      </div>
    )
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={70}
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<PieTooltip />} />
          <Legend content={<PieLegend />} />
        </PieChart>
      </ResponsiveContainer>
      <p className="text-center text-sm text-muted-foreground mt-2">
        {total} total {total === 1 ? 'strategy' : 'strategies'}
      </p>
    </div>
  )
}

/**
 * 2. Progress by Type Bar Chart
 */
function ProgressByTypeChart({ data }: { data: Array<{ type: string; avgProgress: number; count: number }> }) {
  const chartData = data.map(item => ({
    name: getStrategyTypeShortLabel(item.type as StrategyType),
    value: item.avgProgress,
    count: item.count,
    fill: STRATEGY_TYPE_COLORS[item.type as keyof typeof STRATEGY_TYPE_COLORS],
  }))

  if (chartData.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-muted-foreground">
        No progress data
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
        <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
        <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={55} />
        <Tooltip content={<BarTooltip />} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={30}>
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.fill}
              fillOpacity={entry.value >= 70 ? 1 : entry.value >= 40 ? 0.8 : 0.6}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

/**
 * 3. Alignment Coverage Radial Chart
 */
function CoverageChart({ data }: { data: { workItemsTotal: number; workItemsWithAny: number; coveragePercent: number } }) {
  const chartData = [
    {
      name: 'Coverage',
      value: data.coveragePercent,
      fill: data.coveragePercent >= 80 ? '#10b981' : data.coveragePercent >= 50 ? '#f59e0b' : '#ef4444',
    },
  ]

  return (
    <div>
      <ResponsiveContainer width="100%" height={180}>
        <RadialBarChart
          cx="50%"
          cy="50%"
          innerRadius="60%"
          outerRadius="80%"
          barSize={15}
          data={chartData}
          startAngle={180}
          endAngle={0}
        >
          <RadialBar
            background
            dataKey="value"
            cornerRadius={10}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="text-center -mt-8">
        <p className="text-3xl font-bold" style={{ color: chartData[0].fill }}>
          {data.coveragePercent}%
        </p>
        <p className="text-sm text-muted-foreground">
          {data.workItemsWithAny} of {data.workItemsTotal} aligned
        </p>
        {data.coveragePercent < 80 && (
          <div className="flex items-center justify-center gap-1 mt-1 text-xs text-amber-600 dark:text-amber-400">
            <AlertCircle className="h-3 w-3" />
            <span>Target: 80%</span>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * 4. Top Aligned Strategies Table
 */
function TopStrategiesTable({ data }: { data: Array<{ id: string; title: string; type: string; alignedCount: number }> }) {
  if (data.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-muted-foreground">
        No aligned strategies yet
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {data.map((strategy, index) => {
        const TypeIcon = typeIcons[strategy.type] || Target
        return (
          <div
            key={strategy.id}
            className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-medium text-muted-foreground w-5">
                #{index + 1}
              </span>
              <div
                className="p-1 rounded"
                style={{
                  backgroundColor: `${STRATEGY_TYPE_COLORS[strategy.type as keyof typeof STRATEGY_TYPE_COLORS]}20`,
                }}
              >
                <TypeIcon
                  className="h-3.5 w-3.5"
                  style={{
                    color: STRATEGY_TYPE_COLORS[strategy.type as keyof typeof STRATEGY_TYPE_COLORS],
                  }}
                />
              </div>
              <p className="text-sm font-medium truncate">{strategy.title}</p>
            </div>
            <Badge variant="outline" className="shrink-0 gap-1">
              <Link2 className="h-3 w-3" />
              {strategy.alignedCount}
            </Badge>
          </div>
        )
      })}
    </div>
  )
}

/**
 * Loading skeleton for charts
 */
function ChartSkeleton() {
  return (
    <div className="flex h-[200px] items-center justify-center">
      <Skeleton className="h-32 w-32 rounded-full" />
    </div>
  )
}

/**
 * Main Alignment Dashboard Component
 */
export function AlignmentDashboard({
  stats,
  isLoading,
  error,
  className,
}: AlignmentDashboardProps) {
  if (error) {
    return (
      <Card className={cn('border-destructive', className)}>
        <CardHeader>
          <CardTitle className="text-destructive">Error Loading Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn('grid gap-4 md:grid-cols-2', className)}>
      {/* Strategy Distribution */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Strategy Distribution</CardTitle>
          <CardDescription>Breakdown by strategy type</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <ChartSkeleton />
          ) : (
            <DistributionChart data={stats?.byType || {}} />
          )}
        </CardContent>
      </Card>

      {/* Progress by Type */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Progress by Type</CardTitle>
          <CardDescription>Average progress for each strategy level</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <ChartSkeleton />
          ) : (
            <ProgressByTypeChart data={stats?.progressByType || []} />
          )}
        </CardContent>
      </Card>

      {/* Alignment Coverage */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Alignment Coverage</CardTitle>
          <CardDescription>Work items linked to strategies</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <ChartSkeleton />
          ) : (
            <CoverageChart
              data={stats?.alignmentCoverage || {
                workItemsTotal: 0,
                workItemsWithPrimary: 0,
                workItemsWithAny: 0,
                coveragePercent: 0,
              }}
            />
          )}
        </CardContent>
      </Card>

      {/* Top Aligned Strategies */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Top Aligned Strategies</CardTitle>
          <CardDescription>Strategies with most linked work items</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <TopStrategiesTable data={stats?.topStrategiesByAlignment || []} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
