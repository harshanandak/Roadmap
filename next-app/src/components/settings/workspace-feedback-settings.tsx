'use client'

/**
 * Workspace Feedback Settings
 *
 * Admin panel for configuring public feedback & voting settings:
 * - Toggle public feedback on/off
 * - Widget customization
 * - Voting verification (team's choice)
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Vote,
  Code,
  ExternalLink,
  Copy,
  Check,
  Loader2,
  Globe,
  Shield,
  Settings,
  Palette,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { FeedbackWidgetEmbed } from '@/components/feedback/feedback-widget-embed'

interface WidgetSettings {
  enabled: boolean
  theme: 'light' | 'dark' | 'auto'
  primaryColor: string
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  showRating: boolean
  requireEmail: boolean
}

interface VotingSettings {
  enabled: boolean
  requireEmailVerification: boolean
  allowAnonymous: boolean
}

interface WorkspaceFeedbackSettingsProps {
  workspaceId: string
  workspaceName: string
  teamId: string
  className?: string
}

export function WorkspaceFeedbackSettings({
  workspaceId,
  workspaceName,
  teamId: _teamId,
  className,
}: WorkspaceFeedbackSettingsProps) {
  const { toast } = useToast()

  // State
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [publicFeedbackEnabled, setPublicFeedbackEnabled] = useState(true)
  const [widgetSettings, setWidgetSettings] = useState<WidgetSettings>({
    enabled: true,
    theme: 'auto',
    primaryColor: '#3B82F6',
    position: 'bottom-right',
    showRating: true,
    requireEmail: false,
  })
  const [votingSettings, setVotingSettings] = useState<VotingSettings>({
    enabled: true,
    requireEmailVerification: false,
    allowAnonymous: true,
  })
  const [showDisableDialog, setShowDisableDialog] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [copied, setCopied] = useState(false)

  // Fetch current settings
  useEffect(() => {
    async function fetchSettings() {
      try {
        const response = await fetch(`/api/workspaces/${workspaceId}`)
        if (response.ok) {
          const data = await response.json()
          setPublicFeedbackEnabled(data.data?.public_feedback_enabled ?? true)
          if (data.data?.widget_settings) {
            setWidgetSettings(data.data.widget_settings)
          }
          if (data.data?.voting_settings) {
            setVotingSettings(data.data.voting_settings)
          }
        }
      } catch (err) {
        console.error('Error fetching settings:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSettings()
  }, [workspaceId])

  // Save settings
  const saveSettings = async () => {
    setIsSaving(true)

    try {
      const response = await fetch(`/api/workspaces/${workspaceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          public_feedback_enabled: publicFeedbackEnabled,
          widget_settings: widgetSettings,
          voting_settings: votingSettings,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save settings')
      }

      toast({
        title: 'Settings saved',
        description: 'Your feedback settings have been updated',
      })
      setHasChanges(false)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save settings'
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Update widget setting
  const updateWidget = <K extends keyof WidgetSettings>(key: K, value: WidgetSettings[K]) => {
    setWidgetSettings((prev) => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  // Update voting setting
  const updateVoting = <K extends keyof VotingSettings>(key: K, value: VotingSettings[K]) => {
    setVotingSettings((prev) => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  // Toggle public feedback
  const handlePublicFeedbackToggle = (enabled: boolean) => {
    if (!enabled) {
      // Show confirmation before disabling
      setShowDisableDialog(true)
    } else {
      setPublicFeedbackEnabled(true)
      setHasChanges(true)
    }
  }

  const confirmDisable = () => {
    setPublicFeedbackEnabled(false)
    setShowDisableDialog(false)
    setHasChanges(true)
  }

  // Get public feedback URL
  const feedbackUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/feedback/${workspaceId}`
    : `/feedback/${workspaceId}`

  // Copy URL to clipboard
  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(feedbackUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Public Feedback
              </CardTitle>
              <CardDescription>
                Allow external users to submit feedback for {workspaceName}
              </CardDescription>
            </div>
            <Switch
              checked={publicFeedbackEnabled}
              onCheckedChange={handlePublicFeedbackToggle}
            />
          </div>
        </CardHeader>

        {publicFeedbackEnabled && (
          <CardContent>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <code className="text-sm flex-1 truncate">{feedbackUrl}</code>
              <Button variant="ghost" size="sm" onClick={copyUrl}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(feedbackUrl, '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {publicFeedbackEnabled && (
        <Tabs defaultValue="voting" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="voting" className="gap-1.5">
              <Vote className="h-4 w-4" />
              Voting
            </TabsTrigger>
            <TabsTrigger value="widget" className="gap-1.5">
              <Code className="h-4 w-4" />
              Widget
            </TabsTrigger>
            <TabsTrigger value="embed" className="gap-1.5">
              <Palette className="h-4 w-4" />
              Embed Code
            </TabsTrigger>
          </TabsList>

          {/* Voting Settings */}
          <TabsContent value="voting">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Voting Verification
                </CardTitle>
                <CardDescription>
                  Choose how users vote on shared insights. Your team decides the level of verification.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Enable/Disable Voting */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable Public Voting</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow external users to vote on shared insights
                    </p>
                  </div>
                  <Switch
                    checked={votingSettings.enabled}
                    onCheckedChange={(v) => updateVoting('enabled', v)}
                  />
                </div>

                {votingSettings.enabled && (
                  <>
                    <hr />

                    {/* Email Verification */}
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Require Email Verification</Label>
                        <p className="text-sm text-muted-foreground">
                          Send a magic link to verify votes (more secure, more friction)
                        </p>
                      </div>
                      <Switch
                        checked={votingSettings.requireEmailVerification}
                        onCheckedChange={(v) => updateVoting('requireEmailVerification', v)}
                      />
                    </div>

                    {/* Anonymous Voting */}
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Allow Anonymous Voting</Label>
                        <p className="text-sm text-muted-foreground">
                          Users can vote without providing an email
                        </p>
                      </div>
                      <Switch
                        checked={votingSettings.allowAnonymous}
                        onCheckedChange={(v) => updateVoting('allowAnonymous', v)}
                      />
                    </div>

                    {/* Summary */}
                    <div className="p-3 bg-muted/50 rounded-lg text-sm">
                      <p className="font-medium mb-1">Current Configuration:</p>
                      <ul className="text-muted-foreground space-y-1">
                        <li>
                          {votingSettings.allowAnonymous
                            ? '✓ Anonymous voting allowed'
                            : '✗ Email required to vote'}
                        </li>
                        <li>
                          {votingSettings.requireEmailVerification
                            ? '✓ Email verification via magic link'
                            : '✓ Instant voting (no verification)'}
                        </li>
                      </ul>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Widget Settings */}
          <TabsContent value="widget">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Widget Customization
                </CardTitle>
                <CardDescription>
                  Customize the appearance of the embeddable feedback widget
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Enable/Disable Widget */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable Widget</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow embedding the feedback widget on external sites
                    </p>
                  </div>
                  <Switch
                    checked={widgetSettings.enabled}
                    onCheckedChange={(v) => updateWidget('enabled', v)}
                  />
                </div>

                {widgetSettings.enabled && (
                  <>
                    <hr />

                    <div className="grid grid-cols-2 gap-4">
                      {/* Theme */}
                      <div className="space-y-2">
                        <Label>Theme</Label>
                        <Select
                          value={widgetSettings.theme}
                          onValueChange={(v) => updateWidget('theme', v as WidgetSettings['theme'])}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="auto">Auto (System)</SelectItem>
                            <SelectItem value="light">Light</SelectItem>
                            <SelectItem value="dark">Dark</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Position */}
                      <div className="space-y-2">
                        <Label>Position</Label>
                        <Select
                          value={widgetSettings.position}
                          onValueChange={(v) => updateWidget('position', v as WidgetSettings['position'])}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bottom-right">Bottom Right</SelectItem>
                            <SelectItem value="bottom-left">Bottom Left</SelectItem>
                            <SelectItem value="top-right">Top Right</SelectItem>
                            <SelectItem value="top-left">Top Left</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Primary Color */}
                      <div className="space-y-2">
                        <Label>Primary Color</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={widgetSettings.primaryColor}
                            onChange={(e) => updateWidget('primaryColor', e.target.value)}
                            className="w-12 h-9 p-1"
                          />
                          <Input
                            value={widgetSettings.primaryColor}
                            onChange={(e) => updateWidget('primaryColor', e.target.value)}
                            className="flex-1"
                          />
                        </div>
                      </div>
                    </div>

                    <hr />

                    {/* Require Email */}
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Require Email</Label>
                        <p className="text-sm text-muted-foreground">
                          Make email a required field in the widget
                        </p>
                      </div>
                      <Switch
                        checked={widgetSettings.requireEmail}
                        onCheckedChange={(v) => updateWidget('requireEmail', v)}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Embed Code */}
          <TabsContent value="embed">
            <FeedbackWidgetEmbed
              workspaceId={workspaceId}
              workspaceName={workspaceName}
              initialSettings={widgetSettings}
              onSettingsChange={(settings) => {
                // Preserve 'enabled' field from parent state (not managed by embed component)
                setWidgetSettings({ ...settings, enabled: widgetSettings.enabled })
                setHasChanges(true)
              }}
            />
          </TabsContent>
        </Tabs>
      )}

      {/* Save Button */}
      {hasChanges && (
        <div className="flex justify-end sticky bottom-4">
          <Button onClick={saveSettings} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      )}

      {/* Disable Confirmation Dialog */}
      <AlertDialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable Public Feedback?</AlertDialogTitle>
            <AlertDialogDescription>
              Disabling public feedback will:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Hide the public feedback page</li>
                <li>Disable the embeddable widget</li>
                <li>Prevent new public submissions</li>
              </ul>
              <p className="mt-2">Existing feedback will be preserved.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDisable}>
              Disable
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
