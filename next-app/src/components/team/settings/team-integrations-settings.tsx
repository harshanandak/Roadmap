'use client'

/**
 * TeamIntegrationsSettings Component
 *
 * Main settings panel for managing team-level external integrations.
 * Shows available providers and connected integrations.
 */

import { useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Loader2, Search, Plug, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { ProviderCard } from '@/components/integrations/provider-card'
import { IntegrationCard } from '@/components/integrations/integration-card'
import {
  useIntegrations,
  useCreateIntegration,
  useDeleteIntegration,
  useTriggerSync,
} from '@/lib/hooks/use-integrations'
import { INTEGRATION_PROVIDERS, type IntegrationProvider } from '@/lib/types/integrations'

interface TeamIntegrationsSettingsProps {
  team: {
    id: string
    name: string
    plan: string
  }
}

export function TeamIntegrationsSettings({ team }: TeamIntegrationsSettingsProps) {
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState('')
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null)
  const [syncingIntegration, setSyncingIntegration] = useState<string | null>(null)
  const [disconnectingIntegration, setDisconnectingIntegration] = useState<string | null>(null)

  // URL params for success/error messages
  const successMessage = searchParams.get('success')
  const errorMessage = searchParams.get('error')

  // Fetch integrations
  const { data, isLoading, error } = useIntegrations()
  const integrations = data?.integrations || []

  // Mutations
  const createIntegration = useCreateIntegration()
  const deleteIntegration = useDeleteIntegration()
  const triggerSync = useTriggerSync()

  // Get available providers
  const availableProviders = Object.values(INTEGRATION_PROVIDERS)

  // Filter providers by search
  const filteredProviders = availableProviders.filter(
    (provider) =>
      provider.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      provider.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      provider.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Filter connected integrations by search
  const filteredIntegrations = integrations.filter(
    (integration) =>
      integration.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      integration.provider.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Get integration for a provider (if exists)
  const getExistingIntegration = (providerId: string) =>
    integrations.find((int) => int.provider === providerId)

  // Handle connect
  const handleConnect = async (providerId: string) => {
    setConnectingProvider(providerId)
    try {
      await createIntegration.mutateAsync({
        provider: providerId as IntegrationProvider,
      })
    } catch (error) {
      console.error('Failed to connect:', error)
    } finally {
      setConnectingProvider(null)
    }
  }

  // Handle sync
  const handleSync = async (integrationId: string) => {
    setSyncingIntegration(integrationId)
    try {
      await triggerSync.mutateAsync({
        integrationId,
        syncType: 'import',
      })
    } catch (error) {
      console.error('Failed to sync:', error)
    } finally {
      setSyncingIntegration(null)
    }
  }

  // Handle disconnect
  const handleDisconnect = async (integrationId: string) => {
    setDisconnectingIntegration(integrationId)
    try {
      await deleteIntegration.mutateAsync(integrationId)
    } catch (error) {
      console.error('Failed to disconnect:', error)
    } finally {
      setDisconnectingIntegration(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error loading integrations</AlertTitle>
        <AlertDescription>
          {error instanceof Error ? error.message : 'Failed to load integrations'}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Success/Error Messages from OAuth callback */}
      {successMessage && (
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800 dark:text-green-200">Success</AlertTitle>
          <AlertDescription className="text-green-700 dark:text-green-300">
            {successMessage}
          </AlertDescription>
        </Alert>
      )}

      {errorMessage && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Connection Failed</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Plug className="h-5 w-5" />
            <CardTitle>External Integrations</CardTitle>
          </div>
          <CardDescription>
            Connect your team to external tools and services. Integrations enabled here
            can be selectively enabled for individual workspaces.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search integrations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              {integrations.filter((i) => i.status === 'connected').length} connected
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs: Connected / Available */}
      <Tabs defaultValue="connected" className="space-y-4">
        <TabsList>
          <TabsTrigger value="connected">
            Connected ({integrations.filter((i) => i.status === 'connected').length})
          </TabsTrigger>
          <TabsTrigger value="available">
            Available ({availableProviders.length})
          </TabsTrigger>
        </TabsList>

        {/* Connected Integrations */}
        <TabsContent value="connected" className="space-y-4">
          {filteredIntegrations.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Plug className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No integrations connected</h3>
                <p className="text-muted-foreground mb-4">
                  Connect your first integration to get started
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredIntegrations.map((integration) => (
                <IntegrationCard
                  key={integration.id}
                  integration={integration}
                  onSync={handleSync}
                  onDisconnect={handleDisconnect}
                  isSyncing={syncingIntegration === integration.id}
                  isDisconnecting={disconnectingIntegration === integration.id}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Available Providers */}
        <TabsContent value="available" className="space-y-4">
          {/* Group by category */}
          {['development', 'project_management', 'communication', 'documentation', 'design'].map(
            (category) => {
              const categoryProviders = filteredProviders.filter(
                (p) => p.category === category
              )
              if (categoryProviders.length === 0) return null

              return (
                <div key={category} className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    {category.replace('_', ' ')}
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {categoryProviders.map((provider) => (
                      <ProviderCard
                        key={provider.id}
                        provider={provider}
                        existingIntegration={getExistingIntegration(provider.id)}
                        onConnect={handleConnect}
                        isConnecting={connectingProvider === provider.id}
                      />
                    ))}
                  </div>
                </div>
              )
            }
          )}
        </TabsContent>
      </Tabs>

      {/* Pro Plan Notice */}
      {team.plan === 'free' && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Pro Feature</AlertTitle>
          <AlertDescription>
            Some integrations require a Pro plan. Upgrade to unlock all integrations
            and advanced sync features.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
