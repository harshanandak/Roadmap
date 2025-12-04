/**
 * Embeddings Module
 *
 * Document processing, chunking, and vector embeddings
 * for the Knowledge Base RAG system.
 */

export {
  chunkText,
  generateEmbeddings,
  embedQuery,
  formatEmbeddingForPgvector,
  cosineSimilarity,
} from './embedding-service'

export {
  extractText,
  extractTextFromHtml,
  extractTextFromMarkdown,
  processDocument,
  searchDocuments,
} from './document-processor'

export type {
  ProcessDocumentOptions,
  ProcessingResult,
} from './document-processor'
