'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { cn } from '@/lib/utils'
import { CHART_COLOR_PALETTE } from '@/lib/types/analytics'
import type { PieChartData } from '@/lib/types/analytics'

export interface AnalyticsPieChartProps {
  title: string
  data: PieChartData[]
  description?: string
  className?: string
  showLegend?: boolean
  innerRadius?: number
  outerRadius?: number
  height?: number
}

// Tooltip payload type
interface TooltipPayloadItem {
  payload: PieChartData
}

// Legend payload type
interface LegendPayloadItem {
  color: string
  value: string
}

// Custom tooltip component - defined outside to avoid recreation during render
function CustomTooltipContent({
  active,
  payload,
  total
}: {
  active?: boolean
  payload?: TooltipPayloadItem[]
  total: number
}) {
  if (active && payload && payload.length) {
    const data = payload[0].payload as PieChartData
    const percentage = total > 0 ? ((data.value / total) * 100).toFixed(1) : 0
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <p className="font-medium">{data.name}</p>
        <p className="text-sm text-muted-foreground">
          {data.value} ({percentage}%)
        </p>
      </div>
    )
  }
  return null
}

// Custom legend render function
function renderLegend(props: { payload?: LegendPayloadItem[] }) {
  const { payload } = props
  if (!payload) return null
  return (
    <ul className="flex flex-wrap justify-center gap-4 pt-4">
      {payload.map((entry: LegendPayloadItem, index: number) => (
        <li key={`legend-${index}`} className="flex items-center gap-1.5 text-sm">
          <span
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.value}</span>
        </li>
      ))}
    </ul>
  )
}

export function AnalyticsPieChart({
  title,
  data,
  description,
  className,
  showLegend = true,
  innerRadius = 60,
  outerRadius = 80,
  height = 300,
}: AnalyticsPieChartProps) {
  // Filter out zero values for cleaner visualization
  const filteredData = data.filter((item) => item.value > 0)

  // Calculate total for percentage display
  const total = filteredData.reduce((sum, item) => sum + item.value, 0)

  return (
    <Card className={cn('hover:shadow-md transition-shadow', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent>
        {filteredData.length === 0 ? (
          <div className="flex h-[200px] items-center justify-center text-muted-foreground">
            No data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie
                data={filteredData}
                cx="50%"
                cy="50%"
                innerRadius={innerRadius}
                outerRadius={outerRadius}
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
              >
                {filteredData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color || CHART_COLOR_PALETTE[index % CHART_COLOR_PALETTE.length]}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltipContent total={total} />} />
              {showLegend && <Legend content={(props) => renderLegend(props as { payload?: LegendPayloadItem[] })} />}
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
