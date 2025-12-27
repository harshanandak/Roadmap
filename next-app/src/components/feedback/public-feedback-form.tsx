'use client'

/**
 * Public Feedback Form
 *
 * Simplified form for anonymous feedback submission.
 * Features:
 * - No authentication required
 * - Honeypot spam prevention
 * - Form timing validation
 * - Workspace-branded experience
 * - Optional email for follow-up
 */

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Loader2, ThumbsUp, Minus, ThumbsDown, Shuffle, Send, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { generateFormLoadToken } from '@/lib/security/honeypot'
// InsightSentiment type removed - not currently used

// Validation schema
const feedbackSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must be less than 200 characters'),
  description: z
    .string()
    .min(10, 'Please provide more detail (at least 10 characters)')
    .max(2000, 'Description must be less than 2000 characters'),
  name: z.string().max(100).optional(),
  email: z.string().email('Please enter a valid email').optional().or(z.literal('')),
  sentiment: z.enum(['positive', 'neutral', 'negative', 'mixed']),
  // Honeypot fields (not shown to user)
  website: z.string().max(0).optional(),
  _formLoadTime: z.string(),
})

type FeedbackFormValues = z.infer<typeof feedbackSchema>

interface WorkspaceInfo {
  id: string
  name: string
  icon?: string
}

interface PublicFeedbackFormProps {
  workspace: WorkspaceInfo
  onSuccess?: () => void
  onError?: (error: string) => void
  className?: string
}

const sentimentOptions = [
  { value: 'positive', label: 'Positive', icon: ThumbsUp, color: 'text-green-600' },
  { value: 'neutral', label: 'Neutral', icon: Minus, color: 'text-gray-500' },
  { value: 'negative', label: 'Negative', icon: ThumbsDown, color: 'text-red-500' },
  { value: 'mixed', label: 'Mixed', icon: Shuffle, color: 'text-yellow-600' },
] as const

export function PublicFeedbackForm({
  workspace,
  onSuccess,
  onError,
  className,
}: PublicFeedbackFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formLoadTime] = useState(() => generateFormLoadToken())

  const form = useForm<FeedbackFormValues>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      title: '',
      description: '',
      name: '',
      email: '',
      sentiment: 'neutral',
      website: '', // Honeypot - should stay empty
      _formLoadTime: formLoadTime,
    },
  })

  const onSubmit = async (data: FeedbackFormValues) => {
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/public/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspace.id,
          title: data.title,
          description: data.description,
          name: data.name || undefined,
          email: data.email || undefined,
          sentiment: data.sentiment,
          // Spam check data
          website: data.website,
          _formLoadTime: data._formLoadTime,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit feedback')
      }

      onSuccess?.()
    } catch (error: unknown) {
      console.error('Feedback submission error:', error)
      const message = error instanceof Error ? error.message : 'Failed to submit feedback'
      onError?.(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className={cn('w-full max-w-lg', className)}>
      <CardHeader className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 text-2xl">
          {workspace.icon ? (
            <span>{workspace.icon}</span>
          ) : (
            <MessageSquare className="h-6 w-6 text-primary" />
          )}
          <CardTitle>Share Your Feedback</CardTitle>
        </div>
        <CardDescription>
          Help us improve {workspace.name} by sharing your thoughts
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Brief summary of your feedback"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Details *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Tell us more about your experience or suggestion..."
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Sentiment */}
            <FormField
              control={form.control}
              name="sentiment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>How do you feel about this?</FormLabel>
                  <div className="flex flex-wrap gap-2">
                    {sentimentOptions.map((option) => {
                      const Icon = option.icon
                      const isSelected = field.value === option.value
                      return (
                        <Button
                          key={option.value}
                          type="button"
                          variant={isSelected ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => field.onChange(option.value)}
                          className={cn(
                            'gap-1.5',
                            isSelected && 'ring-2 ring-offset-2 ring-primary'
                          )}
                        >
                          <Icon className={cn('h-4 w-4', !isSelected && option.color)} />
                          {option.label}
                        </Button>
                      )
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Optional: Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Name (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormDescription>
                    Leave blank to submit anonymously
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Optional: Email */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email (optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Only if you&apos;d like us to follow up with you
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Honeypot Field - Hidden from users */}
            <div className="absolute -left-[9999px] opacity-0 pointer-events-none" aria-hidden="true">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                {...form.register('website')}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            {/* Hidden form load time */}
            <input type="hidden" {...form.register('_formLoadTime')} />

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit Feedback
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
