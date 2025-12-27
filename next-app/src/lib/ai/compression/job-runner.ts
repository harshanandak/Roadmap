/**
 * Compression Job Runner
 *
 * Orchestrates the knowledge compression pipeline:
 * - L2: Document summarization
 * - L3: Topic clustering
 * - L4: Concept extraction
 *
 * Supports:
 * - Full refresh (process all documents)
 * - Incremental updates (process specific documents)
 * - Job status tracking and progress reporting
 * - Error handling and retry logic
 */

import { createClient } from '@/lib/supabase/server'
import { batchSummarizeDocuments } from './l2-summarizer'
import { clusterTopics } from './l3-topic-clustering'
import { batchExtractConcepts } from './l4-concept-extractor'
import type {
  CompressionJob,
  CompressionJobType,
  CompressionJobStatus,
  CompressionJobResult,
} from '@/lib/types/collective-intelligence'

// =============================================================================
// TYPES
// =============================================================================

export interface RunCompressionJobOptions {
  teamId: string
  workspaceId?: string
  jobType: CompressionJobType
  documentIds?: string[] // Specific documents to process (null = all)
  topicIds?: string[] // Specific topics to update (null = all)
  triggeredBy?: string
  onProgress?: (progress: number, message: string) => void
}

export interface CompressionJobProgress {
  jobId: string
  status: CompressionJobStatus
  progress: number
  currentStep: string
  itemsProcessed: number
  itemsTotal: number
}

// =============================================================================
// JOB RUNNER
// =============================================================================

/**
 * Run a compression job
 */
export async function runCompressionJob(
  options: RunCompressionJobOptions
): Promise<CompressionJob> {
  const {
    teamId,
    workspaceId,
    jobType,
    documentIds,
    topicIds,
    triggeredBy,
    onProgress,
  } = options

  const supabase = await createClient()

  // Create job record
  const { data: job, error: createError } = await supabase
    .from('compression_jobs')
    .insert({
      team_id: teamId,
      workspace_id: workspaceId,
      job_type: jobType,
      status: 'pending',
      document_ids: documentIds,
      topic_ids: topicIds,
      progress: 0,
      items_processed: 0,
      items_total: 0,
      triggered_by: triggeredBy,
    })
    .select()
    .single()

  if (createError || !job) {
    throw new Error(`Failed to create job: ${createError?.message}`)
  }

  const jobId = job.id

  try {
    // Update status to running
    await updateJobStatus(supabase, jobId, 'running', 0, 'Starting job...')
    onProgress?.(0, 'Starting job...')

    const startTime = Date.now()
    let result: CompressionJobResult = {}

    switch (jobType) {
      case 'l2_summary':
        result = await runL2Summarization(
          supabase,
          jobId,
          teamId,
          workspaceId,
          documentIds,
          onProgress
        )
        break

      case 'l3_clustering':
        result = await runL3Clustering(
          supabase,
          jobId,
          teamId,
          workspaceId,
          onProgress
        )
        break

      case 'l4_extraction':
        result = await runL4Extraction(
          supabase,
          jobId,
          teamId,
          workspaceId,
          documentIds,
          onProgress
        )
        break

      case 'full_refresh':
        result = await runFullRefresh(
          supabase,
          jobId,
          teamId,
          workspaceId,
          onProgress
        )
        break

      default:
        throw new Error(`Unknown job type: ${jobType}`)
    }

    const durationMs = Date.now() - startTime

    // Update job as completed
    const { data: completedJob } = await supabase
      .from('compression_jobs')
      .update({
        status: 'completed',
        progress: 100,
        current_step: 'Complete',
        result,
        completed_at: new Date().toISOString(),
        duration_ms: durationMs,
      })
      .eq('id', jobId)
      .select()
      .single()

    onProgress?.(100, 'Job completed successfully')

    return transformJob(completedJob || job)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Update job as failed
    await supabase
      .from('compression_jobs')
      .update({
        status: 'failed',
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId)

    onProgress?.(0, `Job failed: ${errorMessage}`)

    throw error
  }
}

// =============================================================================
// L2 SUMMARIZATION
// =============================================================================

async function runL2Summarization(
  supabase: Awaited<ReturnType<typeof createClient>>,
  jobId: string,
  teamId: string,
  workspaceId: string | undefined,
  documentIds: string[] | undefined,
  onProgress?: (progress: number, message: string) => void
): Promise<CompressionJobResult> {
  // Fetch documents to process
  let query = supabase
    .from('knowledge_documents')
    .select('id, name, extracted_text')
    .eq('team_id', teamId)
    .eq('status', 'ready')
    .not('extracted_text', 'is', null)

  if (workspaceId) {
    query = query.eq('workspace_id', workspaceId)
  }

  if (documentIds && documentIds.length > 0) {
    query = query.in('id', documentIds)
  }

  const { data: documents, error: fetchError } = await query

  if (fetchError) {
    throw new Error(`Failed to fetch documents: ${fetchError.message}`)
  }

  if (!documents || documents.length === 0) {
    return { summariesCreated: 0 }
  }

  await updateJobStatus(supabase, jobId, 'running', 5, `Processing ${documents.length} documents...`)
  onProgress?.(5, `Processing ${documents.length} documents...`)

  // Get existing topics for context
  const { data: existingTopics } = await supabase
    .from('knowledge_topics')
    .select('name')
    .eq('team_id', teamId)

  const topicNames = existingTopics?.map((t) => t.name) || []

  // Process documents
  const docsToProcess = documents.map((d) => ({
    documentId: d.id,
    documentName: d.name,
    content: d.extracted_text || '',
  }))

  const { successful, failed } = await batchSummarizeDocuments(
    docsToProcess,
    topicNames,
    async (completed, total) => {
      const progress = 5 + Math.round((completed / total) * 90)
      await updateJobStatus(supabase, jobId, 'running', progress, `Summarized ${completed}/${total} documents`)
      onProgress?.(progress, `Summarized ${completed}/${total} documents`)
    }
  )

  return {
    summariesCreated: successful,
    errors: failed > 0 ? [`${failed} documents failed to summarize`] : undefined,
  }
}

// =============================================================================
// L3 CLUSTERING
// =============================================================================

async function runL3Clustering(
  supabase: Awaited<ReturnType<typeof createClient>>,
  jobId: string,
  teamId: string,
  workspaceId: string | undefined,
  onProgress?: (progress: number, message: string) => void
): Promise<CompressionJobResult> {
  await updateJobStatus(supabase, jobId, 'running', 10, 'Analyzing document similarities...')
  onProgress?.(10, 'Analyzing document similarities...')

  const result = await clusterTopics({
    teamId,
    workspaceId,
    similarityThreshold: 0.7,
    minDocumentsPerCluster: 2,
  })

  if (!result.success) {
    throw new Error(result.error || 'Topic clustering failed')
  }

  await updateJobStatus(supabase, jobId, 'running', 90, `Created ${result.topicsCreated} topics, updated ${result.topicsUpdated}`)
  onProgress?.(90, `Created ${result.topicsCreated} topics, updated ${result.topicsUpdated}`)

  return {
    topicsCreated: result.topicsCreated,
    topicsUpdated: result.topicsUpdated,
  }
}

// =============================================================================
// L4 EXTRACTION
// =============================================================================

async function runL4Extraction(
  supabase: Awaited<ReturnType<typeof createClient>>,
  jobId: string,
  teamId: string,
  workspaceId: string | undefined,
  documentIds: string[] | undefined,
  onProgress?: (progress: number, message: string) => void
): Promise<CompressionJobResult> {
  // Fetch documents to process
  let query = supabase
    .from('knowledge_documents')
    .select('id, name, extracted_text')
    .eq('team_id', teamId)
    .eq('status', 'ready')
    .not('extracted_text', 'is', null)

  if (workspaceId) {
    query = query.eq('workspace_id', workspaceId)
  }

  if (documentIds && documentIds.length > 0) {
    query = query.in('id', documentIds)
  }

  const { data: documents, error: fetchError } = await query

  if (fetchError) {
    throw new Error(`Failed to fetch documents: ${fetchError.message}`)
  }

  if (!documents || documents.length === 0) {
    return { conceptsExtracted: 0, relationshipsCreated: 0 }
  }

  await updateJobStatus(supabase, jobId, 'running', 5, `Extracting concepts from ${documents.length} documents...`)
  onProgress?.(5, `Extracting concepts from ${documents.length} documents...`)

  // Process documents
  const docsToProcess = documents.map((d) => ({
    documentId: d.id,
    documentName: d.name,
    content: d.extracted_text || '',
  }))

  const result = await batchExtractConcepts(
    docsToProcess,
    teamId,
    workspaceId,
    async (completed, total) => {
      const progress = 5 + Math.round((completed / total) * 90)
      await updateJobStatus(supabase, jobId, 'running', progress, `Processed ${completed}/${total} documents`)
      onProgress?.(progress, `Processed ${completed}/${total} documents`)
    }
  )

  return {
    conceptsExtracted: result.totalConceptsCreated,
    relationshipsCreated: result.totalRelationshipsCreated,
    errors: result.failed > 0 ? [`${result.failed} documents failed`] : undefined,
  }
}

// =============================================================================
// FULL REFRESH
// =============================================================================

async function runFullRefresh(
  supabase: Awaited<ReturnType<typeof createClient>>,
  jobId: string,
  teamId: string,
  workspaceId: string | undefined,
  onProgress?: (progress: number, message: string) => void
): Promise<CompressionJobResult> {
  const result: CompressionJobResult = {}

  // Step 1: L2 Summarization (0-40%)
  await updateJobStatus(supabase, jobId, 'running', 0, 'Step 1/3: Generating document summaries...')
  onProgress?.(0, 'Step 1/3: Generating document summaries...')

  const l2Result = await runL2Summarization(
    supabase,
    jobId,
    teamId,
    workspaceId,
    undefined,
    (progress, message) => {
      const scaledProgress = Math.round(progress * 0.4)
      onProgress?.(scaledProgress, message)
    }
  )

  result.summariesCreated = l2Result.summariesCreated

  // Step 2: L3 Topic Clustering (40-70%)
  await updateJobStatus(supabase, jobId, 'running', 40, 'Step 2/3: Clustering topics...')
  onProgress?.(40, 'Step 2/3: Clustering topics...')

  const l3Result = await runL3Clustering(
    supabase,
    jobId,
    teamId,
    workspaceId,
    (progress, message) => {
      const scaledProgress = 40 + Math.round((progress - 10) * 0.3 / 80)
      onProgress?.(scaledProgress, message)
    }
  )

  result.topicsCreated = l3Result.topicsCreated
  result.topicsUpdated = l3Result.topicsUpdated

  // Step 3: L4 Concept Extraction (70-100%)
  await updateJobStatus(supabase, jobId, 'running', 70, 'Step 3/3: Extracting knowledge graph...')
  onProgress?.(70, 'Step 3/3: Extracting knowledge graph...')

  const l4Result = await runL4Extraction(
    supabase,
    jobId,
    teamId,
    workspaceId,
    undefined,
    (progress, message) => {
      const scaledProgress = 70 + Math.round((progress - 5) * 0.3 / 90)
      onProgress?.(scaledProgress, message)
    }
  )

  result.conceptsExtracted = l4Result.conceptsExtracted
  result.relationshipsCreated = l4Result.relationshipsCreated

  // Combine errors
  const allErrors = [
    ...(l2Result.errors || []),
    ...(l3Result.errors || []),
    ...(l4Result.errors || []),
  ]

  if (allErrors.length > 0) {
    result.errors = allErrors
  }

  return result
}

// =============================================================================
// HELPERS
// =============================================================================

async function updateJobStatus(
  supabase: Awaited<ReturnType<typeof createClient>>,
  jobId: string,
  status: CompressionJobStatus,
  progress: number,
  currentStep: string
): Promise<void> {
  await supabase
    .from('compression_jobs')
    .update({
      status,
      progress,
      current_step: currentStep,
      started_at: status === 'running' ? new Date().toISOString() : undefined,
    })
    .eq('id', jobId)
}

function transformJob(data: Record<string, unknown>): CompressionJob {
  return {
    id: data.id as string,
    teamId: data.team_id as string,
    workspaceId: data.workspace_id as string | null,
    jobType: data.job_type as CompressionJobType,
    status: data.status as CompressionJobStatus,
    documentIds: data.document_ids as string[] | null,
    topicIds: data.topic_ids as string[] | null,
    progress: data.progress as number,
    itemsProcessed: data.items_processed as number,
    itemsTotal: data.items_total as number,
    currentStep: data.current_step as string | null,
    result: data.result as CompressionJobResult | null,
    errorMessage: data.error_message as string | null,
    startedAt: data.started_at as string | null,
    completedAt: data.completed_at as string | null,
    durationMs: data.duration_ms as number | null,
    triggeredBy: data.triggered_by as string | null,
    createdAt: data.created_at as string,
  }
}

// =============================================================================
// JOB MANAGEMENT
// =============================================================================

/**
 * Get job status
 */
export async function getJobStatus(jobId: string): Promise<CompressionJob | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('compression_jobs')
    .select('*')
    .eq('id', jobId)
    .single()

  if (error || !data) {
    return null
  }

  return transformJob(data)
}

/**
 * List jobs for a team
 */
export async function listJobs(
  teamId: string,
  options: {
    workspaceId?: string
    status?: CompressionJobStatus
    limit?: number
  } = {}
): Promise<CompressionJob[]> {
  const { workspaceId, status, limit = 20 } = options
  const supabase = await createClient()

  let query = supabase
    .from('compression_jobs')
    .select('*')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (workspaceId) {
    query = query.eq('workspace_id', workspaceId)
  }

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error || !data) {
    return []
  }

  return data.map(transformJob)
}

/**
 * Cancel a running job
 */
export async function cancelJob(jobId: string): Promise<boolean> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('compression_jobs')
    .update({
      status: 'failed',
      error_message: 'Job cancelled by user',
      completed_at: new Date().toISOString(),
    })
    .eq('id', jobId)
    .eq('status', 'running')

  return !error
}
