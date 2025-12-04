'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface GaugeChartProps {
  title: string
  value: number // 0-100 percentage
  label?: string
  description?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
  showPercentage?: boolean
  thresholds?: {
    low: number // Below this is red
    medium: number // Below this is yellow, above is green
  }
}

export function GaugeChart({
  title,
  value,
  label,
  description,
  className,
  size = 'md',
  showPercentage = true,
  thresholds = { low: 40, medium: 70 },
}: GaugeChartProps) {
  // Clamp value between 0 and 100
  const clampedValue = Math.min(100, Math.max(0, value))

  // Determine color based on value and thresholds
  const getColor = () => {
    if (clampedValue < thresholds.low) return '#ef4444' // red-500
    if (clampedValue < thresholds.medium) return '#f59e0b' // amber-500
    return '#10b981' // emerald-500
  }

  // Size configurations
  const sizeConfig = {
    sm: { container: 'h-24 w-24', text: 'text-xl', label: 'text-xs' },
    md: { container: 'h-32 w-32', text: 'text-2xl', label: 'text-sm' },
    lg: { container: 'h-40 w-40', text: 'text-3xl', label: 'text-base' },
  }

  const config = sizeConfig[size]

  // SVG arc calculations
  // Using a 270-degree arc (from -135deg to +135deg)
  const radius = 40
  const circumference = 2 * Math.PI * radius
  const arcLength = circumference * 0.75 // 270 degrees
  const strokeDashoffset = arcLength - (clampedValue / 100) * arcLength

  const color = getColor()

  return (
    <Card className={cn('hover:shadow-md transition-shadow', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center">
        <div className={cn('relative', config.container)}>
          <svg
            className="w-full h-full -rotate-[135deg]"
            viewBox="0 0 100 100"
          >
            {/* Background arc */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={arcLength}
              className="text-muted/30"
            />
            {/* Value arc */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={arcLength}
              strokeDashoffset={strokeDashoffset}
              style={{
                transition: 'stroke-dashoffset 0.5s ease-in-out',
              }}
            />
          </svg>
          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {showPercentage && (
              <span
                className={cn('font-bold', config.text)}
                style={{ color }}
              >
                {Math.round(clampedValue)}%
              </span>
            )}
            {label && (
              <span className={cn('text-muted-foreground', config.label)}>
                {label}
              </span>
            )}
          </div>
        </div>
        {/* Legend */}
        <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            <span>&lt;{thresholds.low}%</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <span>{thresholds.low}-{thresholds.medium}%</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>&gt;{thresholds.medium}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
