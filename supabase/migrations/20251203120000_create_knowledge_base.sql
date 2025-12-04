-- =============================================================================
-- Knowledge Base / Document RAG System
-- =============================================================================
-- Enables AI to reference uploaded documents (PRDs, specs, meeting notes)
-- using vector embeddings and semantic search.
--
-- Architecture:
--   1. knowledge_documents - Document metadata
--   2. document_chunks - Chunked text with vector embeddings
--   3. document_collections - Organize documents by topic
--
-- Uses pgvector for efficient similarity search on embeddings.
-- =============================================================================

-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- =============================================================================
-- DOCUMENT COLLECTIONS
-- =============================================================================
-- Optional grouping for documents (e.g., "PRDs", "Meeting Notes", "Research")

CREATE TABLE IF NOT EXISTS document_collections (
  id TEXT PRIMARY KEY DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT::TEXT,

  -- Ownership
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE SET NULL,

  -- Collection info
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'folder',
  color TEXT DEFAULT '#6B7280',

  -- Settings
  is_default BOOLEAN DEFAULT FALSE,
  auto_embed BOOLEAN DEFAULT TRUE, -- Automatically embed new documents

  -- Audit
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- KNOWLEDGE DOCUMENTS
-- =============================================================================
-- Stores document metadata. Actual file content stored in Supabase Storage.

CREATE TABLE IF NOT EXISTS knowledge_documents (
  id TEXT PRIMARY KEY DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT::TEXT,

  -- Ownership
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE SET NULL,
  collection_id TEXT REFERENCES document_collections(id) ON DELETE SET NULL,

  -- Document info
  name TEXT NOT NULL,
  description TEXT,

  -- File metadata
  file_type TEXT NOT NULL, -- 'pdf', 'docx', 'md', 'txt', 'html'
  file_size INTEGER, -- Bytes
  file_path TEXT, -- Supabase Storage path
  file_url TEXT, -- Public/signed URL

  -- Source tracking
  source_type TEXT DEFAULT 'upload', -- 'upload', 'url', 'integration', 'generated'
  source_url TEXT, -- Original URL if imported
  source_integration TEXT, -- Integration ID if from external source

  -- Processing status
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'ready', 'error'
  processing_error TEXT,

  -- Content stats
  word_count INTEGER,
  page_count INTEGER,
  chunk_count INTEGER DEFAULT 0,

  -- Embedding info
  embedding_model TEXT, -- e.g., 'text-embedding-3-small'
  embedding_dimensions INTEGER,
  last_embedded_at TIMESTAMPTZ,

  -- Content extraction
  extracted_text TEXT, -- Full extracted text (for re-chunking)
  extracted_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',

  -- Access control
  visibility TEXT DEFAULT 'team', -- 'private', 'team', 'workspace'

  -- Audit
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- DOCUMENT CHUNKS
-- =============================================================================
-- Stores chunked text with vector embeddings for semantic search.
-- Each chunk is ~500 tokens for optimal retrieval.

CREATE TABLE IF NOT EXISTS document_chunks (
  id TEXT PRIMARY KEY DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT::TEXT,

  -- Parent document
  document_id TEXT NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,

  -- Chunk positioning
  chunk_index INTEGER NOT NULL, -- Order within document
  page_number INTEGER, -- Source page (for PDFs)

  -- Content
  content TEXT NOT NULL, -- The actual text chunk
  token_count INTEGER, -- Approximate token count

  -- Vector embedding (1536 dimensions for OpenAI, 768 for smaller models)
  embedding extensions.vector(1536),

  -- Context
  heading TEXT, -- Section heading if available
  context_before TEXT, -- Previous chunk summary (for continuity)
  context_after TEXT, -- Next chunk summary (for continuity)

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- DOCUMENT QUERIES (Optional - for analytics)
-- =============================================================================
-- Track what queries are run against the knowledge base.

CREATE TABLE IF NOT EXISTS document_queries (
  id TEXT PRIMARY KEY DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT::TEXT,

  -- Context
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Query info
  query_text TEXT NOT NULL,
  query_embedding extensions.vector(1536),

  -- Results
  result_count INTEGER,
  result_chunk_ids TEXT[],
  result_scores FLOAT[],

  -- Usage
  used_in_response BOOLEAN DEFAULT FALSE,
  response_id TEXT, -- Link to AI response if used

  -- Timing
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Document lookups
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_team ON knowledge_documents(team_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_workspace ON knowledge_documents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_collection ON knowledge_documents(collection_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_status ON knowledge_documents(status);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_file_type ON knowledge_documents(file_type);

-- Chunk lookups
CREATE INDEX IF NOT EXISTS idx_document_chunks_document ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_order ON document_chunks(document_id, chunk_index);

-- Vector similarity search (HNSW index for fast approximate nearest neighbor)
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding
  ON document_chunks
  USING hnsw (embedding extensions.vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Collection lookups
CREATE INDEX IF NOT EXISTS idx_document_collections_team ON document_collections(team_id);
CREATE INDEX IF NOT EXISTS idx_document_collections_workspace ON document_collections(workspace_id);

-- Query analytics
CREATE INDEX IF NOT EXISTS idx_document_queries_team ON document_queries(team_id);
CREATE INDEX IF NOT EXISTS idx_document_queries_created ON document_queries(created_at DESC);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE document_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_queries ENABLE ROW LEVEL SECURITY;

-- Document Collections Policies
CREATE POLICY "Team members can view collections"
  ON document_collections FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can create collections"
  ON document_collections FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can update collections"
  ON document_collections FOR UPDATE
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team admins can delete collections"
  ON document_collections FOR DELETE
  USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Knowledge Documents Policies
CREATE POLICY "Team members can view documents"
  ON knowledge_documents FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can upload documents"
  ON knowledge_documents FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can update documents"
  ON knowledge_documents FOR UPDATE
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team admins can delete documents"
  ON knowledge_documents FOR DELETE
  USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
    OR created_by = auth.uid()
  );

-- Document Chunks Policies (inherit from parent document)
CREATE POLICY "Users can view chunks of accessible documents"
  ON document_chunks FOR SELECT
  USING (
    document_id IN (
      SELECT id FROM knowledge_documents
      WHERE team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "System can manage chunks"
  ON document_chunks FOR ALL
  USING (
    document_id IN (
      SELECT id FROM knowledge_documents
      WHERE team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      )
    )
  );

-- Document Queries Policies
CREATE POLICY "Team members can view queries"
  ON document_queries FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can create queries"
  ON document_queries FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Function to search documents using vector similarity
CREATE OR REPLACE FUNCTION search_documents(
  p_team_id TEXT,
  p_query_embedding extensions.vector(1536),
  p_workspace_id TEXT DEFAULT NULL,
  p_collection_id TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 10,
  p_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  chunk_id TEXT,
  document_id TEXT,
  document_name TEXT,
  content TEXT,
  similarity FLOAT,
  page_number INTEGER,
  heading TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id AS chunk_id,
    dc.document_id,
    kd.name AS document_name,
    dc.content,
    1 - (dc.embedding <=> p_query_embedding) AS similarity,
    dc.page_number,
    dc.heading
  FROM document_chunks dc
  JOIN knowledge_documents kd ON dc.document_id = kd.id
  WHERE kd.team_id = p_team_id
    AND kd.status = 'ready'
    AND (p_workspace_id IS NULL OR kd.workspace_id = p_workspace_id)
    AND (p_collection_id IS NULL OR kd.collection_id = p_collection_id)
    AND 1 - (dc.embedding <=> p_query_embedding) >= p_threshold
  ORDER BY dc.embedding <=> p_query_embedding
  LIMIT p_limit;
END;
$$;

-- Function to get document statistics for a team
CREATE OR REPLACE FUNCTION get_knowledge_base_stats(p_team_id TEXT)
RETURNS TABLE (
  total_documents INTEGER,
  total_chunks INTEGER,
  total_queries INTEGER,
  documents_by_type JSONB,
  documents_by_status JSONB,
  recent_documents JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::INTEGER FROM knowledge_documents WHERE team_id = p_team_id),
    (
      SELECT COUNT(*)::INTEGER
      FROM document_chunks dc
      JOIN knowledge_documents kd ON dc.document_id = kd.id
      WHERE kd.team_id = p_team_id
    ),
    (SELECT COUNT(*)::INTEGER FROM document_queries WHERE team_id = p_team_id),
    (
      SELECT jsonb_object_agg(file_type, cnt)
      FROM (
        SELECT file_type, COUNT(*) as cnt
        FROM knowledge_documents
        WHERE team_id = p_team_id
        GROUP BY file_type
      ) t
    ),
    (
      SELECT jsonb_object_agg(status, cnt)
      FROM (
        SELECT status, COUNT(*) as cnt
        FROM knowledge_documents
        WHERE team_id = p_team_id
        GROUP BY status
      ) t
    ),
    (
      SELECT jsonb_agg(row_to_json(t))
      FROM (
        SELECT id, name, file_type, status, created_at
        FROM knowledge_documents
        WHERE team_id = p_team_id
        ORDER BY created_at DESC
        LIMIT 5
      ) t
    );
END;
$$;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_knowledge_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_knowledge_documents_updated_at
  BEFORE UPDATE ON knowledge_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_knowledge_updated_at();

CREATE TRIGGER update_document_collections_updated_at
  BEFORE UPDATE ON document_collections
  FOR EACH ROW
  EXECUTE FUNCTION update_knowledge_updated_at();

-- =============================================================================
-- STORAGE BUCKET
-- =============================================================================
-- Note: Run this in the Supabase dashboard or via API:
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('knowledge-documents', 'knowledge-documents', false);

COMMENT ON TABLE knowledge_documents IS 'Stores document metadata for the RAG system';
COMMENT ON TABLE document_chunks IS 'Stores chunked text with vector embeddings';
COMMENT ON TABLE document_collections IS 'Optional grouping for organizing documents';
COMMENT ON TABLE document_queries IS 'Analytics for knowledge base queries';
