'use client'

/**
 * IntegrationCard Component
 *
 * Displays a connected integration with status, sync info, and actions.
 */

import { useState } from 'react'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import {
  Github,
  Trello,
  MessageSquare,
  FileText,
  Palette,
  MoreVertical,
  RefreshCw,
  Trash2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { IntegrationDisplay, IntegrationStatus } from '@/lib/types/integrations'
import { INTEGRATION_PROVIDERS } from '@/lib/types/integrations'

interface IntegrationCardProps {
  integration: IntegrationDisplay
  onSync: (id: string) => void
  onDisconnect: (id: string) => void
  isSyncing?: boolean
  isDisconnecting?: boolean
}

/**
 * Get icon component for a provider
 */
function getProviderIcon(providerId: string) {
  const icons: Record<string, React.ReactNode> = {
    github: <Github className="h-5 w-5" />,
    jira: <Trello className="h-5 w-5" />,
    linear: <Trello className="h-5 w-5" />,
    notion: <FileText className="h-5 w-5" />,
    slack: <MessageSquare className="h-5 w-5" />,
    figma: <Palette className="h-5 w-5" />,
  }

  return icons[providerId] || <ExternalLink className="h-5 w-5" />
}

/**
 * Get status badge config
 */
function getStatusConfig(status: IntegrationStatus) {
  const configs: Record<IntegrationStatus, { color: string; icon: React.ReactNode; label: string }> = {
    connected: {
      color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      icon: <CheckCircle2 className="h-3 w-3" />,
      label: 'Connected',
    },
    pending: {
      color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      icon: <Clock className="h-3 w-3" />,
      label: 'Pending',
    },
    expired: {
      color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      icon: <AlertCircle className="h-3 w-3" />,
      label: 'Expired',
    },
    disconnected: {
      color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
      icon: <AlertCircle className="h-3 w-3" />,
      label: 'Disconnected',
    },
    error: {
      color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      icon: <AlertCircle className="h-3 w-3" />,
      label: 'Error',
    },
  }

  return configs[status] || configs.disconnected
}

export function IntegrationCard({
  integration,
  onSync,
  onDisconnect,
  isSyncing,
  isDisconnecting,
}: IntegrationCardProps) {
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false)

  const provider = INTEGRATION_PROVIDERS[integration.provider]
  const statusConfig = getStatusConfig(integration.status)
  const providerColor = provider?.color || '#6B7280'

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className="p-2 rounded-lg"
                style={{ backgroundColor: `${providerColor}20` }}
              >
                {getProviderIcon(integration.provider)}
              </div>
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  {integration.name}
                  <Badge
                    variant="secondary"
                    className={`text-xs ${statusConfig.color}`}
                  >
                    {statusConfig.icon}
                    <span className="ml-1">{statusConfig.label}</span>
                  </Badge>
                </CardTitle>
                <CardDescription className="text-sm">
                  {integration.providerAccountName || integration.provider}
                </CardDescription>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => onSync(integration.id)}
                  disabled={isSyncing || integration.status !== 'connected'}
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Syncing...' : 'Sync Now'}
                </DropdownMenuItem>
                {provider?.docUrl && (
                  <DropdownMenuItem asChild>
                    <a href={provider.docUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View Docs
                    </a>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setShowDisconnectDialog(true)}
                  className="text-red-600 dark:text-red-400"
                  disabled={isDisconnecting}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Disconnect
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Scopes */}
          <div className="flex flex-wrap gap-1">
            {integration.scopes.slice(0, 3).map((scope) => (
              <Badge key={scope} variant="outline" className="text-xs">
                {scope}
              </Badge>
            ))}
            {integration.scopes.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{integration.scopes.length - 3} more
              </Badge>
            )}
          </div>

          {/* Last Sync Info */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {integration.lastSyncAt ? (
                <>
                  Last synced{' '}
                  {formatDistanceToNow(new Date(integration.lastSyncAt), {
                    addSuffix: true,
                  })}
                </>
              ) : (
                'Never synced'
              )}
            </span>
            <span className="text-xs">
              Connected {formatDistanceToNow(new Date(integration.createdAt), { addSuffix: true })}
            </span>
          </div>

          {/* Error Message */}
          {integration.lastError && (
            <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 p-2 rounded">
              {integration.lastError}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Disconnect Confirmation Dialog */}
      <AlertDialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect {integration.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the connection to {integration.providerAccountName || integration.provider}.
              You&apos;ll need to reconnect to use this integration again.
              Any workspace-level tool access will also be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDisconnect(integration.id)
                setShowDisconnectDialog(false)
              }}
              className="bg-red-600 hover:bg-red-700"
              disabled={isDisconnecting}
            >
              {isDisconnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Disconnecting...
                </>
              ) : (
                'Disconnect'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
