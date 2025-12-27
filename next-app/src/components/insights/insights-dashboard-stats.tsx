'use client'

/**
 * Insights Dashboard Stats Component
 *
 * Displays summary statistics for customer insights:
 * - Total count
 * - By sentiment (positive, negative, neutral, mixed)
 * - By status (new, actionable, addressed)
 *
 * Cards are clickable to filter the insights list.
 */

import { Card, CardContent } from '@/components/ui/card'
import {
  Lightbulb,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Shuffle,
  Sparkles,
  Target,
  CheckCircle,
  Archive,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface InsightStats {
  total: number
  bySentiment: {
    positive: number
    negative: number
    neutral: number
    mixed: number
  }
  byStatus: {
    new: number
    reviewed: number
    actionable: number
    addressed: number
    archived: number
  }
}

interface InsightsDashboardStatsProps {
  stats: InsightStats
  activeFilter?: {
    type: 'sentiment' | 'status'
    value: string
  }
  onFilterChange?: (filter: { type: 'sentiment' | 'status'; value: string } | null) => void
  isLoading?: boolean
  className?: string
}

interface StatCardProps {
  title: string
  value: number
  icon: React.ElementType
  iconColor: string
  bgColor: string
  isActive?: boolean
  onClick?: () => void
}

function StatCard({
  title,
  value,
  icon: Icon,
  iconColor,
  bgColor,
  isActive,
  onClick,
}: StatCardProps) {
  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]',
        isActive && 'ring-2 ring-primary ring-offset-2'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'h-10 w-10 rounded-lg flex items-center justify-center',
              bgColor
            )}
          >
            <Icon className={cn('h-5 w-5', iconColor)} />
          </div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{title}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-muted animate-pulse" />
          <div className="space-y-2">
            <div className="h-6 w-12 bg-muted animate-pulse rounded" />
            <div className="h-3 w-16 bg-muted animate-pulse rounded" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function InsightsDashboardStats({
  stats,
  activeFilter,
  onFilterChange,
  isLoading = false,
  className,
}: InsightsDashboardStatsProps) {
  const handleClick = (type: 'sentiment' | 'status', value: string) => {
    if (activeFilter?.type === type && activeFilter?.value === value) {
      // Toggle off if same filter clicked
      onFilterChange?.(null)
    } else {
      onFilterChange?.({ type, value })
    }
  }

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        {/* Primary Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        {/* Secondary Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Primary Row: Total + Sentiments */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* Total */}
        <StatCard
          title="Total Insights"
          value={stats.total}
          icon={Lightbulb}
          iconColor="text-amber-600"
          bgColor="bg-amber-50 dark:bg-amber-900/30"
          isActive={!activeFilter}
          onClick={() => onFilterChange?.(null)}
        />

        {/* Positive */}
        <StatCard
          title="Positive"
          value={stats.bySentiment.positive}
          icon={ThumbsUp}
          iconColor="text-green-600"
          bgColor="bg-green-50 dark:bg-green-900/30"
          isActive={activeFilter?.type === 'sentiment' && activeFilter?.value === 'positive'}
          onClick={() => handleClick('sentiment', 'positive')}
        />

        {/* Negative */}
        <StatCard
          title="Negative"
          value={stats.bySentiment.negative}
          icon={ThumbsDown}
          iconColor="text-red-600"
          bgColor="bg-red-50 dark:bg-red-900/30"
          isActive={activeFilter?.type === 'sentiment' && activeFilter?.value === 'negative'}
          onClick={() => handleClick('sentiment', 'negative')}
        />

        {/* Neutral */}
        <StatCard
          title="Neutral"
          value={stats.bySentiment.neutral}
          icon={Minus}
          iconColor="text-gray-600"
          bgColor="bg-gray-50 dark:bg-gray-900/30"
          isActive={activeFilter?.type === 'sentiment' && activeFilter?.value === 'neutral'}
          onClick={() => handleClick('sentiment', 'neutral')}
        />

        {/* Mixed */}
        <StatCard
          title="Mixed"
          value={stats.bySentiment.mixed}
          icon={Shuffle}
          iconColor="text-yellow-600"
          bgColor="bg-yellow-50 dark:bg-yellow-900/30"
          isActive={activeFilter?.type === 'sentiment' && activeFilter?.value === 'mixed'}
          onClick={() => handleClick('sentiment', 'mixed')}
        />
      </div>

      {/* Secondary Row: Status */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* New */}
        <StatCard
          title="New"
          value={stats.byStatus.new}
          icon={Sparkles}
          iconColor="text-blue-600"
          bgColor="bg-blue-50 dark:bg-blue-900/30"
          isActive={activeFilter?.type === 'status' && activeFilter?.value === 'new'}
          onClick={() => handleClick('status', 'new')}
        />

        {/* Actionable */}
        <StatCard
          title="Actionable"
          value={stats.byStatus.actionable}
          icon={Target}
          iconColor="text-orange-600"
          bgColor="bg-orange-50 dark:bg-orange-900/30"
          isActive={activeFilter?.type === 'status' && activeFilter?.value === 'actionable'}
          onClick={() => handleClick('status', 'actionable')}
        />

        {/* Addressed */}
        <StatCard
          title="Addressed"
          value={stats.byStatus.addressed}
          icon={CheckCircle}
          iconColor="text-green-600"
          bgColor="bg-green-50 dark:bg-green-900/30"
          isActive={activeFilter?.type === 'status' && activeFilter?.value === 'addressed'}
          onClick={() => handleClick('status', 'addressed')}
        />

        {/* Archived */}
        <StatCard
          title="Archived"
          value={stats.byStatus.archived}
          icon={Archive}
          iconColor="text-gray-500"
          bgColor="bg-gray-50 dark:bg-gray-900/30"
          isActive={activeFilter?.type === 'status' && activeFilter?.value === 'archived'}
          onClick={() => handleClick('status', 'archived')}
        />
      </div>
    </div>
  )
}

// Export type for external use
export type { InsightStats }
