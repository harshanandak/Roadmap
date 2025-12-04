/**
 * Knowledge Compression Services
 *
 * Hierarchical compression for efficient AI context:
 * - L2: Document summaries (~200 tokens per doc)
 * - L3: Topic clusters (cross-document synthesis)
 * - L4: Knowledge graph (concepts + relationships)
 */

// L2: Document Summarization
export {
  summarizeDocument,
  batchSummarizeDocuments,
  getDocumentSummary,
  type SummarizeDocumentOptions,
  type SummarizeDocumentResult,
} from './l2-summarizer'

// L3: Topic Clustering
export {
  clusterTopics,
  getTopics,
  getTopicDocuments,
  type ClusterTopicsOptions,
  type ClusterTopicsResult,
} from './l3-topic-clustering'

// L4: Concept Extraction
export {
  extractConcepts,
  batchExtractConcepts,
  getKnowledgeGraph,
  getConceptsByType,
  type ExtractConceptsOptions,
  type ExtractConceptsResult,
} from './l4-concept-extractor'

// Job Runner
export {
  runCompressionJob,
  getJobStatus,
  listJobs,
  cancelJob,
  type RunCompressionJobOptions,
  type CompressionJobProgress,
} from './job-runner'
