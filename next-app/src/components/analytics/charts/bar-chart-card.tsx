'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts'
import { cn } from '@/lib/utils'
import { CHART_COLOR_PALETTE, CHART_COLORS } from '@/lib/types/analytics'
import type { BarChartData } from '@/lib/types/analytics'

// Custom tooltip - defined outside of component to avoid recreation during render
interface BarTooltipPayload {
  value: number
  name: string
}
interface BarTooltipProps {
  active?: boolean
  payload?: BarTooltipPayload[]
  label?: string
}

function BarChartTooltip({ active, payload, label }: BarTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <p className="font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">
          {payload[0].value.toLocaleString()}
        </p>
      </div>
    )
  }
  return null
}

export interface AnalyticsBarChartProps {
  title: string
  data: BarChartData[]
  description?: string
  className?: string
  dataKey?: string
  color?: string
  height?: number
  layout?: 'horizontal' | 'vertical'
  showGrid?: boolean
  showLegend?: boolean
  colorByValue?: boolean // Use different colors for each bar
}

export function AnalyticsBarChart({
  title,
  data,
  description,
  className,
  dataKey = 'value',
  color = CHART_COLORS.primary,
  height = 300,
  layout = 'vertical',
  showGrid = true,
  showLegend = false,
  colorByValue = false,
}: AnalyticsBarChartProps) {
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
            <BarChart
              data={data}
              layout={layout}
              margin={{
                top: 5,
                right: 30,
                left: layout === 'vertical' ? 80 : 20,
                bottom: 5,
              }}
            >
              {showGrid && (
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              )}
              {layout === 'vertical' ? (
                <>
                  <XAxis type="number" />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={75}
                    tick={{ fontSize: 12 }}
                  />
                </>
              ) : (
                <>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis />
                </>
              )}
              <Tooltip content={<BarChartTooltip />} />
              {showLegend && <Legend />}
              <Bar
                dataKey={dataKey}
                fill={color}
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              >
                {colorByValue &&
                  data.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={CHART_COLOR_PALETTE[index % CHART_COLOR_PALETTE.length]}
                    />
                  ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
