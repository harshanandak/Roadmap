'use client'

/**
 * Public Vote Card Component
 *
 * A public-facing card for voting on insights.
 * Displays sanitized insight data (no PII) and voting controls.
 *
 * Adapts to workspace voting settings:
 * - Instant voting (email collected but not verified)
 * - Verified voting (magic link sent to email)
 */

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  ThumbsUp,
  ThumbsDown,
  Loader2,
  CheckCircle,
  Mail,
  Quote,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { InsightSentiment } from '@/lib/types/customer-insight'

// Sanitized insight for public display
interface PublicInsight {
  id: string
  title: string
  quote_preview?: string // Truncated, no PII
  sentiment: InsightSentiment
  tags: string[]
  upvote_count: number
  downvote_count: number
}

interface VotingSettings {
  enabled: boolean
  requireEmailVerification: boolean
  allowAnonymous: boolean
}

interface PublicVoteCardProps {
  insight: PublicInsight
  workspaceName: string
  votingSettings: VotingSettings
  onVoteSuccess?: (voteType: 'up' | 'down') => void
  className?: string
}

const sentimentColors: Record<InsightSentiment, string> = {
  positive: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  neutral: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  negative: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  mixed: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
}

export function PublicVoteCard({
  insight,
  workspaceName,
  votingSettings,
  onVoteSuccess,
  className,
}: PublicVoteCardProps) {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [votedType, setVotedType] = useState<'up' | 'down' | null>(null)
  const [verificationSent, setVerificationSent] = useState(false)

  // Handle vote submission
  const handleVote = async (voteType: 'up' | 'down') => {
    if (!votingSettings.allowAnonymous && !email) {
      setError('Please enter your email to vote')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/public/insights/${insight.id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vote_type: voteType,
          email: email || undefined,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to vote')
      }

      if (result.verification_required) {
        // Email verification needed
        setVerificationSent(true)
      } else {
        // Vote counted immediately
        setVotedType(voteType)
        onVoteSuccess?.(voteType)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to vote'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Already voted
  if (votedType) {
    return (
      <Card className={cn('w-full max-w-md text-center', className)}>
        <CardContent className="pt-8 pb-6">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <h3 className="text-lg font-semibold mb-2">Thanks for voting!</h3>
          <p className="text-sm text-muted-foreground">
            Your {votedType === 'up' ? 'upvote' : 'downvote'} has been recorded.
          </p>
        </CardContent>
      </Card>
    )
  }

  // Verification email sent
  if (verificationSent) {
    return (
      <Card className={cn('w-full max-w-md text-center', className)}>
        <CardContent className="pt-8 pb-6">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Mail className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <h3 className="text-lg font-semibold mb-2">Check your email</h3>
          <p className="text-sm text-muted-foreground">
            We&apos;ve sent a verification link to <strong>{email}</strong>.
            Click the link to confirm your vote.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('w-full max-w-md', className)}>
      <CardHeader className="text-center">
        <CardDescription className="text-xs uppercase tracking-wider">
          {workspaceName}
        </CardDescription>
        <CardTitle className="text-xl">{insight.title}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Quote preview (if available) */}
        {insight.quote_preview && (
          <div className="flex gap-2 p-3 bg-muted/50 rounded-lg">
            <Quote className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground italic">
              &quot;{insight.quote_preview}&quot;
            </p>
          </div>
        )}

        {/* Sentiment & Tags */}
        <div className="flex flex-wrap gap-2 justify-center">
          <Badge className={sentimentColors[insight.sentiment]}>
            {insight.sentiment}
          </Badge>
          {insight.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>

        {/* Current vote counts */}
        <div className="flex justify-center gap-6 py-2">
          <div className="flex items-center gap-1.5 text-green-600">
            <ThumbsUp className="h-5 w-5" />
            <span className="font-medium">{insight.upvote_count}</span>
          </div>
          <div className="flex items-center gap-1.5 text-red-500">
            <ThumbsDown className="h-5 w-5" />
            <span className="font-medium">{insight.downvote_count}</span>
          </div>
        </div>

        {/* Email input (if required) */}
        {!votingSettings.allowAnonymous && (
          <div className="space-y-2">
            <Label htmlFor="vote-email">Your Email</Label>
            <Input
              id="vote-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
            />
            {votingSettings.requireEmailVerification && (
              <p className="text-xs text-muted-foreground">
                We&apos;ll send a verification link to confirm your vote.
              </p>
            )}
          </div>
        )}

        {/* Vote buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 gap-2 border-green-200 hover:bg-green-50 hover:text-green-700 hover:border-green-300"
            onClick={() => handleVote('up')}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ThumbsUp className="h-4 w-4" />
            )}
            Upvote
          </Button>
          <Button
            variant="outline"
            className="flex-1 gap-2 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
            onClick={() => handleVote('down')}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ThumbsDown className="h-4 w-4" />
            )}
            Downvote
          </Button>
        </div>

        {/* Error message */}
        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}

        {/* Anonymous voting note */}
        {votingSettings.allowAnonymous && !email && (
          <p className="text-xs text-muted-foreground text-center">
            Voting anonymously. Add your email if you&apos;d like to be notified of updates.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
