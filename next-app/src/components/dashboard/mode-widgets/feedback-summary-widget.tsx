'use client'

/**
 * FeedbackSummaryWidget Component
 *
 * Shows customer feedback summary for Growth mode.
 * Displays recent insights with sentiment and vote counts.
 */

import {
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Minus,
  TrendingUp,
  ChevronRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface FeedbackStats {
  total: number
  positive: number
  neutral: number
  negative: number
  topRequests: { id: string; title: string; votes: number }[]
  recentFeedback: { id: string; title: string; sentiment: string; source?: string }[]
}

interface FeedbackSummaryWidgetProps {
  stats: FeedbackStats
  onViewInsight?: (id: string) => void
  onViewAll?: () => void
  className?: string
}

export function FeedbackSummaryWidget({
  stats,
  onViewInsight,
  onViewAll,
  className,
}: FeedbackSummaryWidgetProps) {
  const positivePercent = stats.total > 0 ? (stats.positive / stats.total) * 100 : 0
  const neutralPercent = stats.total > 0 ? (stats.neutral / stats.total) * 100 : 0
  const negativePercent = stats.total > 0 ? (stats.negative / stats.total) * 100 : 0

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-pink-500" />
            <CardTitle className="text-base">Customer Feedback</CardTitle>
          </div>
          {onViewAll && (
            <Button variant="ghost" size="sm" onClick={onViewAll}>
              View All
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Sentiment Distribution */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Sentiment Distribution</span>
            <span className="font-medium">{stats.total} total</span>
          </div>
          <div className="flex h-3 rounded-full overflow-hidden bg-muted">
            <div
              className="bg-green-500"
              style={{ width: `${positivePercent}%` }}
            />
            <div
              className="bg-yellow-500"
              style={{ width: `${neutralPercent}%` }}
            />
            <div
              className="bg-red-500"
              style={{ width: `${negativePercent}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <ThumbsUp className="h-3 w-3 text-green-500" />
              {stats.positive} positive
            </div>
            <div className="flex items-center gap-1">
              <Minus className="h-3 w-3 text-yellow-500" />
              {stats.neutral} neutral
            </div>
            <div className="flex items-center gap-1">
              <ThumbsDown className="h-3 w-3 text-red-500" />
              {stats.negative} negative
            </div>
          </div>
        </div>

        {/* Top Requests */}
        {stats.topRequests.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Top Requests
            </p>
            <div className="space-y-1">
              {stats.topRequests.slice(0, 3).map((request, index) => (
                <div
                  key={request.id}
                  className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted"
                  onClick={() => onViewInsight?.(request.id)}
                >
                  <span className="text-sm font-bold text-muted-foreground">
                    #{index + 1}
                  </span>
                  <p className="flex-1 text-sm truncate">{request.title}</p>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-green-500" />
                    <span className="text-sm font-medium">{request.votes}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Feedback */}
        {stats.recentFeedback.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Recent Feedback
            </p>
            <div className="space-y-1">
              {stats.recentFeedback.slice(0, 3).map((feedback) => (
                <div
                  key={feedback.id}
                  className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted"
                  onClick={() => onViewInsight?.(feedback.id)}
                >
                  {feedback.sentiment === 'positive' && (
                    <ThumbsUp className="h-4 w-4 text-green-500 shrink-0" />
                  )}
                  {feedback.sentiment === 'neutral' && (
                    <Minus className="h-4 w-4 text-yellow-500 shrink-0" />
                  )}
                  {feedback.sentiment === 'negative' && (
                    <ThumbsDown className="h-4 w-4 text-red-500 shrink-0" />
                  )}
                  <p className="flex-1 text-sm truncate">{feedback.title}</p>
                  {feedback.source && (
                    <Badge variant="outline" className="text-xs shrink-0">
                      {feedback.source}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default FeedbackSummaryWidget
