/**
 * Knowledge Base Hooks
 *
 * React Query hooks for the collective intelligence system:
 * - useKnowledgeGraph: Get knowledge graph data
 * - useCompressedContext: Get compressed context for queries
 * - useTopics: Get topic clusters
 * - useCompressionJobs: Manage compression jobs
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  KnowledgeGraph,
  CompressedContext,
  CompressionJob,
  CompressionJobType,
  CompressionJobStatus,
  TopicDisplay,
} from '@/lib/types/collective-intelligence'

// =============================================================================
// API FUNCTIONS
// =============================================================================

async function fetchKnowledgeGraph(
  workspaceId?: string,
  limit?: number
): Promise<{ graph: KnowledgeGraph }> {
  const params = new URLSearchParams()
  if (workspaceId) params.set('workspaceId', workspaceId)
  if (limit) params.set('limit', limit.toString())

  const response = await fetch(`/api/knowledge/graph?${params}`)
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch knowledge graph')
  }
  return response.json()
}

async function fetchCompressedContext(
  query: string,
  workspaceId?: string,
  maxTokens?: number
): Promise<{ context: CompressedContext; queryId: string; durationMs: number }> {
  const response = await fetch('/api/knowledge/context', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, workspaceId, maxTokens }),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch compressed context')
  }
  return response.json()
}

async function fetchTopics(
  workspaceId?: string,
  includeDocuments?: boolean
): Promise<{ topics: TopicDisplay[] }> {
  const params = new URLSearchParams()
  if (workspaceId) params.set('workspaceId', workspaceId)
  if (includeDocuments) params.set('includeDocuments', 'true')

  const response = await fetch(`/api/knowledge/topics?${params}`)
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch topics')
  }
  return response.json()
}

async function fetchCompressionJobs(
  workspaceId?: string,
  status?: CompressionJobStatus,
  limit?: number
): Promise<{ jobs: CompressionJob[] }> {
  const params = new URLSearchParams()
  if (workspaceId) params.set('workspaceId', workspaceId)
  if (status) params.set('status', status)
  if (limit) params.set('limit', limit.toString())

  const response = await fetch(`/api/knowledge/compression?${params}`)
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch compression jobs')
  }
  return response.json()
}

async function fetchJobStatus(jobId: string): Promise<{ job: CompressionJob }> {
  const response = await fetch(`/api/knowledge/compression/${jobId}`)
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch job status')
  }
  return response.json()
}

async function triggerCompressionJob(
  jobType: CompressionJobType,
  workspaceId?: string,
  documentIds?: string[]
): Promise<{ job: CompressionJob; message: string }> {
  const response = await fetch('/api/knowledge/compression', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobType, workspaceId, documentIds }),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to start compression job')
  }
  return response.json()
}

async function cancelCompressionJob(jobId: string): Promise<{ success: boolean }> {
  const response = await fetch(`/api/knowledge/compression/${jobId}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to cancel job')
  }
  return response.json()
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Get knowledge graph data
 */
export function useKnowledgeGraph(workspaceId?: string, limit: number = 50) {
  return useQuery({
    queryKey: ['knowledge-graph', workspaceId, limit],
    queryFn: () => fetchKnowledgeGraph(workspaceId, limit),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Get compressed context for a query
 */
export function useCompressedContext(
  query: string,
  workspaceId?: string,
  maxTokens: number = 2000,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['compressed-context', query, workspaceId, maxTokens],
    queryFn: () => fetchCompressedContext(query, workspaceId, maxTokens),
    enabled: enabled && query.length > 0,
    staleTime: 60 * 1000, // 1 minute
  })
}

/**
 * Get topic clusters
 */
export function useTopics(workspaceId?: string, includeDocuments: boolean = false) {
  return useQuery({
    queryKey: ['knowledge-topics', workspaceId, includeDocuments],
    queryFn: () => fetchTopics(workspaceId, includeDocuments),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Get compression jobs
 */
export function useCompressionJobs(
  workspaceId?: string,
  status?: CompressionJobStatus,
  limit: number = 20
) {
  return useQuery({
    queryKey: ['compression-jobs', workspaceId, status, limit],
    queryFn: () => fetchCompressionJobs(workspaceId, status, limit),
    staleTime: 30 * 1000, // 30 seconds
  })
}

/**
 * Get single job status with polling
 */
export function useJobStatus(jobId: string | null, pollInterval?: number) {
  return useQuery({
    queryKey: ['compression-job', jobId],
    queryFn: () => fetchJobStatus(jobId!),
    enabled: !!jobId,
    refetchInterval: pollInterval,
    staleTime: 5 * 1000, // 5 seconds
  })
}

/**
 * Trigger a compression job
 */
export function useTriggerCompression() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      jobType,
      workspaceId,
      documentIds,
    }: {
      jobType: CompressionJobType
      workspaceId?: string
      documentIds?: string[]
    }) => triggerCompressionJob(jobType, workspaceId, documentIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compression-jobs'] })
    },
  })
}

/**
 * Cancel a compression job
 */
export function useCancelCompression() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (jobId: string) => cancelCompressionJob(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compression-jobs'] })
    },
  })
}

/**
 * Hook to poll active jobs
 */
export function useActiveJobs(workspaceId?: string) {
  const { data, isLoading, error, refetch } = useCompressionJobs(workspaceId, 'running')

  // Poll every 3 seconds if there are running jobs
  const runningJobs = data?.jobs || []
  const hasRunningJobs = runningJobs.length > 0

  useQuery({
    queryKey: ['compression-jobs-poll', workspaceId],
    queryFn: async () => {
      await refetch()
      return null
    },
    enabled: hasRunningJobs,
    refetchInterval: hasRunningJobs ? 3000 : false,
  })

  return {
    runningJobs,
    isLoading,
    error,
    hasRunningJobs,
  }
}
