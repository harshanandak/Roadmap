'use client'

/**
 * QuickActionsWidget Component
 *
 * Displays mode-specific suggested actions as clickable cards.
 * Actions come from the mode configuration.
 */

import { useRouter } from 'next/navigation'
import {
  Sparkles,
  Bug,
  Zap,
  Lightbulb,
  GitBranch,
  Calendar,
  CalendarCheck,
  Users,
  AlertTriangle,
  MessageSquare,
  BarChart3,
  Star,
  ListTodo,
  Wrench,
  Activity,
  LucideIcon,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { WorkspaceMode } from '@/lib/types/workspace-mode'
import { getModeSuggestedActions, SuggestedAction } from '@/lib/workspace-modes/mode-config'

// ============================================================================
// ICON MAPPING
// ============================================================================

const ACTION_ICONS: Record<string, LucideIcon> = {
  sparkles: Sparkles,
  bug: Bug,
  zap: Zap,
  lightbulb: Lightbulb,
  'git-branch': GitBranch,
  calendar: Calendar,
  'calendar-check': CalendarCheck,
  users: Users,
  'alert-triangle': AlertTriangle,
  'message-square': MessageSquare,
  'bar-chart-3': BarChart3,
  stars: Star,
  'list-todo': ListTodo,
  wrench: Wrench,
  activity: Activity,
}

function getActionIcon(iconName: string): LucideIcon {
  return ACTION_ICONS[iconName] || Sparkles
}

// ============================================================================
// COMPONENT
// ============================================================================

interface QuickActionsWidgetProps {
  mode: WorkspaceMode
  workspaceId: string
  onAction?: (action: SuggestedAction) => void
  className?: string
}

export function QuickActionsWidget({
  mode,
  workspaceId,
  onAction,
  className,
}: QuickActionsWidgetProps) {
  const router = useRouter()
  const actions = getModeSuggestedActions(mode)

  const handleAction = (action: SuggestedAction) => {
    if (onAction) {
      onAction(action)
      return
    }

    switch (action.type) {
      case 'navigate':
        if (action.payload?.startsWith('/')) {
          router.push(action.payload)
        } else if (action.payload?.startsWith('?')) {
          router.push(`/workspaces/${workspaceId}${action.payload}`)
        }
        break
      case 'dialog':
        // Emit custom event for dialog handling
        window.dispatchEvent(
          new CustomEvent('open-dialog', { detail: { dialog: action.payload } })
        )
        break
      case 'command':
        // Emit custom event for command handling
        window.dispatchEvent(
          new CustomEvent('run-command', { detail: { command: action.payload } })
        )
        break
    }
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 sm:grid-cols-2">
          {actions.map((action) => {
            const Icon = getActionIcon(action.icon)
            return (
              <Button
                key={action.id}
                variant="outline"
                className="h-auto justify-start px-3 py-3"
                onClick={() => handleAction(action)}
              >
                <div className="flex items-start gap-3 w-full">
                  <Icon className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{action.label}</span>
                      {action.badge && (
                        <Badge variant="secondary" className="text-xs">
                          {action.badge}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {action.description}
                    </p>
                  </div>
                </div>
              </Button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

export default QuickActionsWidget
