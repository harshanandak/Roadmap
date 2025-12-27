'use client'

/**
 * ProviderCard Component
 *
 * Displays an integration provider with connect button.
 * Shows provider info, available tools, and OAuth connection.
 */

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Github,
  Trello,
  MessageSquare,
  FileText,
  Palette,
  Loader2,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react'
import type { IntegrationProviderMeta, IntegrationDisplay } from '@/lib/types/integrations'

interface ProviderCardProps {
  provider: IntegrationProviderMeta
  existingIntegration?: IntegrationDisplay
  onConnect: (providerId: string) => void
  isConnecting?: boolean
}

/**
 * Get icon component for a provider
 */
function getProviderIcon(providerId: string) {
  const icons: Record<string, React.ReactNode> = {
    github: <Github className="h-6 w-6" />,
    jira: <Trello className="h-6 w-6" />, // Using Trello as Jira placeholder
    linear: <Trello className="h-6 w-6" />,
    notion: <FileText className="h-6 w-6" />,
    slack: <MessageSquare className="h-6 w-6" />,
    figma: <Palette className="h-6 w-6" />,
  }

  return icons[providerId] || <ExternalLink className="h-6 w-6" />
}

/**
 * Get category badge color
 */
function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    development: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    project_management: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    communication: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    documentation: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    design: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
    analytics: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    support: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
    crm: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  }

  return colors[category] || 'bg-gray-100 text-gray-800'
}

export function ProviderCard({
  provider,
  existingIntegration,
  onConnect,
  isConnecting,
}: ProviderCardProps) {
  const isConnected = existingIntegration?.status === 'connected'
  const isPending = existingIntegration?.status === 'pending'
  const hasError = existingIntegration?.status === 'error'

  return (
    <Card className={`relative ${isConnected ? 'border-green-500 dark:border-green-600' : ''}`}>
      {isConnected && (
        <div className="absolute -top-2 -right-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <div className="bg-green-500 rounded-full p-1">
                  <CheckCircle2 className="h-4 w-4 text-white" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Connected</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-lg"
              style={{ backgroundColor: `${provider.color}20` }}
            >
              {getProviderIcon(provider.id)}
            </div>
            <div>
              <CardTitle className="text-lg">{provider.name}</CardTitle>
              <Badge
                variant="secondary"
                className={`mt-1 text-xs ${getCategoryColor(provider.category)}`}
              >
                {provider.category.replace('_', ' ')}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <CardDescription className="text-sm">
          {provider.description}
        </CardDescription>

        {/* Available Tools Preview */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Available Tools
          </p>
          <div className="flex flex-wrap gap-1">
            {provider.availableTools.slice(0, 4).map((tool) => (
              <Badge key={tool} variant="outline" className="text-xs">
                {tool.replace(/_/g, ' ')}
              </Badge>
            ))}
            {provider.availableTools.length > 4 && (
              <Badge variant="outline" className="text-xs">
                +{provider.availableTools.length - 4} more
              </Badge>
            )}
          </div>
        </div>

        {/* Connection Status & Actions */}
        <div className="pt-2">
          {isConnected ? (
            <div className="flex items-center justify-between">
              <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                Connected as {existingIntegration?.providerAccountName || 'unknown'}
              </span>
              <Button variant="outline" size="sm" asChild>
                <a href={provider.docUrl} target="_blank" rel="noopener noreferrer">
                  Docs
                  <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              </Button>
            </div>
          ) : isPending ? (
            <Button disabled className="w-full">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Waiting for authorization...
            </Button>
          ) : hasError ? (
            <div className="space-y-2">
              <p className="text-sm text-red-600 dark:text-red-400">
                Connection failed: {existingIntegration?.lastError}
              </p>
              <Button
                onClick={() => onConnect(provider.id)}
                disabled={isConnecting}
                variant="outline"
                className="w-full"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Reconnecting...
                  </>
                ) : (
                  'Reconnect'
                )}
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => onConnect(provider.id)}
              disabled={isConnecting}
              className="w-full"
              style={{
                backgroundColor: provider.color,
                borderColor: provider.color,
              }}
            >
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  Connect {provider.name}
                  <ExternalLink className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
