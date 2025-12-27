'use client'

/**
 * Knowledge Dashboard
 *
 * Displays the collective intelligence system:
 * - Knowledge graph visualization
 * - Topic clusters
 * - Compression job management
 * - Stats overview
 */

import { useState } from 'react'
import { Brain, Network, FolderTree, Zap, RefreshCw, CheckCircle2, XCircle, Loader2, Play, BarChart3 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import {
  useKnowledgeGraph,
  useTopics,
  useCompressionJobs,
  useTriggerCompression,
  useActiveJobs,
} from '@/lib/hooks/use-knowledge'
import type { CompressionJob, CompressionJobType, KnowledgeGraphNode, KnowledgeGraphEdge } from '@/lib/types/collective-intelligence'
import { CONCEPT_TYPE_LABELS, RELATIONSHIP_LABELS, TOPIC_CATEGORY_LABELS } from '@/lib/types/collective-intelligence'

interface KnowledgeDashboardProps {
  workspaceId?: string
}

export function KnowledgeDashboard({ workspaceId }: KnowledgeDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview')

  const { data: graphData, isLoading: graphLoading } = useKnowledgeGraph(workspaceId)
  const { data: topicsData, isLoading: topicsLoading } = useTopics(workspaceId, true)
  const { data: jobsData, isLoading: jobsLoading, refetch: refetchJobs } = useCompressionJobs(workspaceId)
  const { runningJobs: _runningJobs, hasRunningJobs } = useActiveJobs(workspaceId)
  const triggerMutation = useTriggerCompression()

  const graph = graphData?.graph
  const topics = topicsData?.topics || []
  const jobs = jobsData?.jobs || []

  const handleTriggerCompression = async (jobType: CompressionJobType) => {
    try {
      await triggerMutation.mutateAsync({ jobType, workspaceId })
      refetchJobs()
    } catch (error) {
      console.error('Failed to trigger compression:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-purple-500" />
            Knowledge Base
          </h2>
          <p className="text-muted-foreground">
            Collective intelligence from your documents
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasRunningJobs && (
            <Badge variant="secondary" className="animate-pulse">
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Processing...
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleTriggerCompression('full_refresh')}
            disabled={triggerMutation.isPending || hasRunningJobs}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${triggerMutation.isPending ? 'animate-spin' : ''}`} />
            Refresh Knowledge
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatsCard
          title="Concepts"
          value={graph?.stats.totalConcepts || 0}
          icon={<Network className="h-4 w-4" />}
          description="Knowledge graph nodes"
          loading={graphLoading}
        />
        <StatsCard
          title="Relationships"
          value={graph?.stats.totalRelationships || 0}
          icon={<Zap className="h-4 w-4" />}
          description="Concept connections"
          loading={graphLoading}
        />
        <StatsCard
          title="Topics"
          value={topics.length}
          icon={<FolderTree className="h-4 w-4" />}
          description="Document clusters"
          loading={topicsLoading}
        />
        <StatsCard
          title="Jobs"
          value={jobs.filter((j) => j.status === 'completed').length}
          icon={<BarChart3 className="h-4 w-4" />}
          description="Compression runs"
          loading={jobsLoading}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="graph">Knowledge Graph</TabsTrigger>
          <TabsTrigger value="topics">Topics</TabsTrigger>
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <OverviewTab graph={graph} topics={topics} />
        </TabsContent>

        <TabsContent value="graph" className="space-y-4">
          <GraphTab graph={graph} loading={graphLoading} />
        </TabsContent>

        <TabsContent value="topics" className="space-y-4">
          <TopicsTab topics={topics} loading={topicsLoading} />
        </TabsContent>

        <TabsContent value="jobs" className="space-y-4">
          <JobsTab
            jobs={jobs}
            loading={jobsLoading}
            onTrigger={handleTriggerCompression}
            isPending={triggerMutation.isPending}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// =============================================================================
// STATS CARD
// =============================================================================

function StatsCard({
  title,
  value,
  icon,
  description,
  loading,
}: {
  title: string
  value: number
  icon: React.ReactNode
  description: string
  loading?: boolean
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {loading ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            <p className="text-xs text-muted-foreground">{description}</p>
          </>
        )}
      </CardContent>
    </Card>
  )
}

// =============================================================================
// OVERVIEW TAB
// =============================================================================

function OverviewTab({
  graph,
  topics,
}: {
  graph?: { concepts: KnowledgeGraphNode[]; relationships: KnowledgeGraphEdge[]; stats: Record<string, unknown> }
  topics: Array<{ id: string; name: string; category: string | null; documentCount: number }>
}) {
  const topConcepts = graph?.concepts.slice(0, 5) || []
  const topTopics = topics.slice(0, 5)

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Top Concepts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Top Concepts</CardTitle>
          <CardDescription>Most frequently mentioned concepts</CardDescription>
        </CardHeader>
        <CardContent>
          {topConcepts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No concepts yet. Run a full refresh to build the knowledge graph.</p>
          ) : (
            <div className="space-y-3">
              {topConcepts.map((concept) => (
                <div key={concept.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{concept.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {CONCEPT_TYPE_LABELS[concept.conceptType] || concept.conceptType}
                    </p>
                  </div>
                  <Badge variant="secondary">{concept.mentionCount} mentions</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Topics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Topic Clusters</CardTitle>
          <CardDescription>Cross-document themes</CardDescription>
        </CardHeader>
        <CardContent>
          {topTopics.length === 0 ? (
            <p className="text-sm text-muted-foreground">No topics yet. Upload documents and run compression.</p>
          ) : (
            <div className="space-y-3">
              {topTopics.map((topic) => (
                <div key={topic.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{topic.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {topic.category ? TOPIC_CATEGORY_LABELS[topic.category as keyof typeof TOPIC_CATEGORY_LABELS] : 'Uncategorized'}
                    </p>
                  </div>
                  <Badge variant="outline">{topic.documentCount} docs</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// =============================================================================
// GRAPH TAB
// =============================================================================

function GraphTab({
  graph,
  loading,
}: {
  graph?: { concepts: KnowledgeGraphNode[]; relationships: KnowledgeGraphEdge[]; stats: Record<string, unknown> }
  loading?: boolean
}) {
  if (loading) {
    return (
      <Card className="flex items-center justify-center h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </Card>
    )
  }

  if (!graph || graph.concepts.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center h-[400px] text-center">
        <Network className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="font-semibold">No Knowledge Graph Yet</h3>
        <p className="text-sm text-muted-foreground max-w-md mt-2">
          Upload documents to your knowledge base and run a compression job to build the knowledge graph.
        </p>
      </Card>
    )
  }

  // Simple list view of concepts and relationships
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Concepts ({graph.concepts.length})</CardTitle>
        </CardHeader>
        <CardContent className="max-h-[400px] overflow-y-auto">
          <div className="space-y-2">
            {graph.concepts.map((concept) => (
              <div key={concept.id} className="p-2 rounded-lg bg-muted/50">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{concept.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {CONCEPT_TYPE_LABELS[concept.conceptType]}
                  </Badge>
                </div>
                {concept.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {concept.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Relationships ({graph.relationships.length})</CardTitle>
        </CardHeader>
        <CardContent className="max-h-[400px] overflow-y-auto">
          <div className="space-y-2">
            {graph.relationships.map((rel, i) => {
              const source = graph.concepts.find((c) => c.id === rel.sourceConceptId)
              const target = graph.concepts.find((c) => c.id === rel.targetConceptId)
              return (
                <div key={i} className="p-2 rounded-lg bg-muted/50 text-sm">
                  <span className="font-medium">{source?.name || 'Unknown'}</span>
                  <span className="mx-2 text-muted-foreground">→</span>
                  <Badge variant="secondary" className="mx-1">
                    {RELATIONSHIP_LABELS[rel.relationshipType]}
                  </Badge>
                  <span className="mx-2 text-muted-foreground">→</span>
                  <span className="font-medium">{target?.name || 'Unknown'}</span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// =============================================================================
// TOPICS TAB
// =============================================================================

function TopicsTab({
  topics,
  loading,
}: {
  topics: Array<{
    id: string
    name: string
    description: string | null
    summary: string | null
    category: string | null
    keywords: string[]
    documentCount: number
    documents?: Array<{ id: string; name: string; relevanceScore: number }>
  }>
  loading?: boolean
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (topics.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center h-[200px] text-center">
        <FolderTree className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="font-semibold">No Topics Yet</h3>
        <p className="text-sm text-muted-foreground">
          Topics are automatically generated when you have 2+ documents.
        </p>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {topics.map((topic) => (
        <Card key={topic.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{topic.name}</CardTitle>
              <Badge>
                {topic.category ? TOPIC_CATEGORY_LABELS[topic.category as keyof typeof TOPIC_CATEGORY_LABELS] : 'Other'}
              </Badge>
            </div>
            {topic.description && (
              <CardDescription>{topic.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {topic.summary && (
              <p className="text-sm text-muted-foreground line-clamp-3">{topic.summary}</p>
            )}

            {topic.keywords.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {topic.keywords.slice(0, 5).map((kw) => (
                  <Badge key={kw} variant="outline" className="text-xs">
                    {kw}
                  </Badge>
                ))}
              </div>
            )}

            {topic.documents && topic.documents.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-2">Documents ({topic.documents.length})</p>
                <div className="space-y-1">
                  {topic.documents.slice(0, 3).map((doc) => (
                    <div key={doc.id} className="text-xs text-muted-foreground flex justify-between">
                      <span className="truncate">{doc.name}</span>
                      <span>{Math.round(doc.relevanceScore * 100)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// =============================================================================
// JOBS TAB
// =============================================================================

function JobsTab({
  jobs,
  loading,
  onTrigger,
  isPending,
}: {
  jobs: CompressionJob[]
  loading?: boolean
  onTrigger: (jobType: CompressionJobType) => void
  isPending?: boolean
}) {
  const jobTypes: { type: CompressionJobType; label: string; description: string }[] = [
    { type: 'l2_summary', label: 'Generate Summaries', description: 'Create L2 document summaries' },
    { type: 'l3_clustering', label: 'Cluster Topics', description: 'Group documents into topics' },
    { type: 'l4_extraction', label: 'Extract Concepts', description: 'Build knowledge graph' },
    { type: 'full_refresh', label: 'Full Refresh', description: 'Run all compression steps' },
  ]

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Run Compression</CardTitle>
          <CardDescription>Trigger knowledge compression jobs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-4">
            {jobTypes.map(({ type, label, description }) => (
              <Button
                key={type}
                variant="outline"
                className="h-auto flex-col items-start p-4"
                onClick={() => onTrigger(type)}
                disabled={isPending}
              >
                <Play className="h-4 w-4 mb-2" />
                <span className="font-medium">{label}</span>
                <span className="text-xs text-muted-foreground">{description}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Job History */}
      <Card>
        <CardHeader>
          <CardTitle>Job History</CardTitle>
          <CardDescription>Recent compression jobs</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-[100px]">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No jobs yet. Run a compression job to get started.
            </p>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function JobCard({ job }: { job: CompressionJob }) {
  const statusIcon = {
    pending: <Loader2 className="h-4 w-4 text-muted-foreground" />,
    running: <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />,
    completed: <CheckCircle2 className="h-4 w-4 text-green-500" />,
    failed: <XCircle className="h-4 w-4 text-red-500" />,
  }

  const statusColors = {
    pending: 'bg-muted',
    running: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
  }

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border">
      <div className="flex items-center gap-3">
        {statusIcon[job.status]}
        <div>
          <p className="font-medium capitalize">{job.jobType.replace('_', ' ')}</p>
          <p className="text-xs text-muted-foreground">
            {job.currentStep || 'Waiting...'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {job.status === 'running' && (
          <Progress value={job.progress} className="w-24 h-2" />
        )}
        <Badge className={statusColors[job.status]}>{job.status}</Badge>
        {job.durationMs && (
          <span className="text-xs text-muted-foreground">
            {(job.durationMs / 1000).toFixed(1)}s
          </span>
        )}
      </div>
    </div>
  )
}
