'use client'

/**
 * Feedback Thank You Component
 *
 * Shown after successful feedback submission.
 * Workspace-branded confirmation with optional next actions.
 */

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, RefreshCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WorkspaceInfo {
  id: string
  name: string
  icon?: string
}

interface FeedbackThankYouProps {
  workspace: WorkspaceInfo
  onSubmitAnother?: () => void
  showSubmitAnother?: boolean
  className?: string
}

export function FeedbackThankYou({
  workspace,
  onSubmitAnother,
  showSubmitAnother = true,
  className,
}: FeedbackThankYouProps) {
  return (
    <Card className={cn('w-full max-w-lg text-center', className)}>
      <CardHeader className="space-y-4">
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <CardTitle className="text-2xl">Thank You!</CardTitle>
        <CardDescription className="text-base">
          Your feedback has been submitted to {workspace.name}.
          We really appreciate you taking the time to share your thoughts with us.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            Our team will review your feedback and use it to improve our product.
            If you provided an email, we may follow up with you directly.
          </p>
        </div>

        {showSubmitAnother && onSubmitAnother && (
          <div className="pt-4">
            <Button
              variant="outline"
              onClick={onSubmitAnother}
              className="gap-2"
            >
              <RefreshCcw className="h-4 w-4" />
              Submit More Feedback
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
