/**
 * useIntegrations Hook
 *
 * React Query hooks for managing external integrations.
 * Provides data fetching, mutations, and optimistic updates.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/hooks/use-toast'
import type {
  IntegrationDisplay,
  IntegrationProvider,
  WorkspaceIntegrationDisplay,
  CreateIntegrationResponse,
} from '@/lib/types/integrations'

// =============================================================================
// QUERY KEYS
// =============================================================================

export const integrationKeys = {
  all: ['integrations'] as const,
  list: (filters?: { status?: string; provider?: string }) =>
    [...integrationKeys.all, 'list', filters] as const,
  detail: (id: string) => [...integrationKeys.all, 'detail', id] as const,
  workspace: (workspaceId: string) =>
    [...integrationKeys.all, 'workspace', workspaceId] as const,
}

// =============================================================================
// API FUNCTIONS
// =============================================================================

async function fetchIntegrations(filters?: {
  status?: string
  provider?: string
}): Promise<{ integrations: IntegrationDisplay[]; count: number }> {
  const params = new URLSearchParams()
  if (filters?.status) params.set('status', filters.status)
  if (filters?.provider) params.set('provider', filters.provider)

  const url = `/api/integrations${params.toString() ? `?${params}` : ''}`
  const response = await fetch(url)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch integrations')
  }

  return response.json()
}

async function fetchIntegration(id: string): Promise<IntegrationDisplay> {
  const response = await fetch(`/api/integrations/${id}`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch integration')
  }

  return response.json()
}

async function createIntegration(data: {
  provider: IntegrationProvider
  name?: string
  scopes?: string[]
}): Promise<CreateIntegrationResponse> {
  const response = await fetch('/api/integrations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create integration')
  }

  return response.json()
}

async function deleteIntegration(id: string): Promise<void> {
  const response = await fetch(`/api/integrations/${id}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to delete integration')
  }
}

async function triggerSync(
  integrationId: string,
  data: {
    syncType: 'import' | 'export'
    workspaceId?: string
    sourceEntity?: string
    targetEntity?: string
  }
): Promise<{ syncLogId: string; status: string; itemsSynced: number }> {
  const response = await fetch(`/api/integrations/${integrationId}/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to trigger sync')
  }

  return response.json()
}

async function fetchWorkspaceIntegrations(
  workspaceId: string
): Promise<{ integrations: WorkspaceIntegrationDisplay[]; count: number }> {
  const response = await fetch(`/api/workspaces/${workspaceId}/integrations`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch workspace integrations')
  }

  return response.json()
}

async function enableWorkspaceIntegration(
  workspaceId: string,
  data: {
    integrationId: string
    enabledTools?: string[]
    defaultProject?: string
  }
): Promise<{ accessId: string }> {
  const response = await fetch(`/api/workspaces/${workspaceId}/integrations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to enable integration')
  }

  return response.json()
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Fetch all team integrations
 */
export function useIntegrations(filters?: { status?: string; provider?: string }) {
  return useQuery({
    queryKey: integrationKeys.list(filters),
    queryFn: () => fetchIntegrations(filters),
    staleTime: 30000, // 30 seconds
  })
}

/**
 * Fetch a single integration by ID
 */
export function useIntegration(id: string) {
  return useQuery({
    queryKey: integrationKeys.detail(id),
    queryFn: () => fetchIntegration(id),
    enabled: !!id,
  })
}

/**
 * Create a new integration (initiates OAuth)
 */
export function useCreateIntegration() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createIntegration,
    onSuccess: (data) => {
      // Invalidate list to show new/updated integration
      queryClient.invalidateQueries({ queryKey: integrationKeys.list() })

      // Redirect to OAuth if URL provided
      if (data.oauthUrl) {
        window.location.href = data.oauthUrl
      } else {
        // Defensive fallback - shouldn't happen if API returns 503 on failure
        // But handle gracefully just in case
        toast({
          title: 'Unable to start OAuth flow',
          description: 'The integration service is unavailable. Please try again later.',
          variant: 'destructive',
        })
      }
    },
    onError: (error: Error) => {
      // Handle API errors (503 Service Unavailable, etc.)
      toast({
        title: 'Failed to connect integration',
        description: error.message || 'The integration service is unavailable. Please try again later.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Delete/disconnect an integration
 */
export function useDeleteIntegration() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteIntegration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: integrationKeys.all })
    },
  })
}

/**
 * Trigger a sync operation
 */
export function useTriggerSync() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      integrationId,
      ...data
    }: {
      integrationId: string
      syncType: 'import' | 'export'
      workspaceId?: string
      sourceEntity?: string
      targetEntity?: string
    }) => triggerSync(integrationId, data),
    onSuccess: (_, variables) => {
      // Invalidate integration detail to refresh sync logs
      queryClient.invalidateQueries({
        queryKey: integrationKeys.detail(variables.integrationId),
      })
    },
  })
}

/**
 * Fetch integrations enabled for a workspace
 */
export function useWorkspaceIntegrations(workspaceId: string) {
  return useQuery({
    queryKey: integrationKeys.workspace(workspaceId),
    queryFn: () => fetchWorkspaceIntegrations(workspaceId),
    enabled: !!workspaceId,
    staleTime: 30000,
  })
}

/**
 * Enable an integration for a workspace
 */
export function useEnableWorkspaceIntegration(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      integrationId: string
      enabledTools?: string[]
      defaultProject?: string
    }) => enableWorkspaceIntegration(workspaceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: integrationKeys.workspace(workspaceId),
      })
    },
  })
}
