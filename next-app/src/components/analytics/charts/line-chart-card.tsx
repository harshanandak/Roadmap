'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { cn } from '@/lib/utils'
import { CHART_COLORS, CHART_COLOR_PALETTE } from '@/lib/types/analytics'
import type { LineChartData } from '@/lib/types/analytics'

// Format date for x-axis - defined outside component
const formatDate = (dateStr: string) => {
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch {
    return dateStr
  }
}

// Custom tooltip - defined outside of component to avoid recreation during render
interface LineTooltipPayload {
  name: string
  value: number
  color: string
}
interface LineTooltipProps {
  active?: boolean
  payload?: LineTooltipPayload[]
  label?: string
}

function LineChartTooltip({ active, payload, label }: LineTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <p className="font-medium">{formatDate(label || '')}</p>
        {payload.map((entry: LineTooltipPayload, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.value.toLocaleString()}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export interface AnalyticsLineChartProps {
  title: string
  data: LineChartData[]
  description?: string
  className?: string
  dataKey?: string | string[] // Support multiple lines
  color?: string | string[]
  height?: number
  showGrid?: boolean
  showLegend?: boolean
  showDots?: boolean
  areaFill?: boolean
}

export function AnalyticsLineChart({
  title,
  data,
  description,
  className,
  dataKey = 'value',
  color = CHART_COLORS.primary,
  height = 300,
  showGrid = true,
  showLegend = false,
  showDots = true,
  areaFill = false,
}: AnalyticsLineChartProps) {
  // Normalize dataKey and color to arrays for multi-line support
  const dataKeys = Array.isArray(dataKey) ? dataKey : [dataKey]
  const colors = Array.isArray(color) ? color : [color]

  return (
    <Card className={cn('hover:shadow-md transition-shadow', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-[200px] items-center justify-center text-muted-foreground">
            No data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart
              data={data}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              {showGrid && (
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              )}
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fontSize: 12 }}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={<LineChartTooltip />} />
              {showLegend && <Legend />}
              {dataKeys.map((key, index) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={colors[index] || CHART_COLOR_PALETTE[index]}
                  strokeWidth={2}
                  dot={showDots ? { fill: colors[index] || CHART_COLOR_PALETTE[index], strokeWidth: 2 } : false}
                  activeDot={{ r: 6 }}
                  fill={areaFill ? `${colors[index] || CHART_COLOR_PALETTE[index]}20` : 'none'}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
