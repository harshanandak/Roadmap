-- =============================================================================
-- Collective Intelligence / Knowledge Compression System
-- =============================================================================
-- Hierarchical knowledge compression for efficient AI context:
--   L1: Document chunks (existing - document_chunks table)
--   L2: Document summaries with key insights
--   L3: Topic clusters across documents
--   L4: Knowledge graph with concepts and relationships
--
-- This enables the AI to access compressed knowledge at appropriate
-- abstraction levels without exceeding context limits.
-- =============================================================================

-- =============================================================================
-- L2: DOCUMENT SUMMARIES
-- =============================================================================
-- Compressed representation of each document (~200 tokens)

CREATE TABLE IF NOT EXISTS document_summaries (
  id TEXT PRIMARY KEY DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT::TEXT,

  -- Parent document
  document_id TEXT NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,

  -- Summary content
  summary TEXT NOT NULL, -- Main summary (~200 tokens)
  key_points TEXT[], -- Array of key insights
  topics TEXT[], -- Detected topics/themes
  entities TEXT[], -- Named entities (people, products, etc.)

  -- Metadata extraction
  document_type TEXT, -- 'prd', 'meeting_notes', 'research', 'spec', etc.
  sentiment TEXT, -- 'positive', 'neutral', 'negative', 'mixed'
  complexity_score FLOAT, -- 0-1 scale

  -- Embedding for L2 search
  embedding extensions.vector(1536),

  -- Generation metadata
  model_used TEXT,
  token_count INTEGER,
  generated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Quality tracking
  quality_score FLOAT, -- Human or automated quality rating
  feedback_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- L3: TOPIC CLUSTERS
-- =============================================================================
-- Cross-document topic aggregations

CREATE TABLE IF NOT EXISTS knowledge_topics (
  id TEXT PRIMARY KEY DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT::TEXT,

  -- Ownership
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE SET NULL,

  -- Topic info
  name TEXT NOT NULL,
  description TEXT,
  summary TEXT, -- Cross-document summary (~500 tokens)

  -- Topic classification
  category TEXT, -- 'feature', 'process', 'decision', 'research', etc.
  importance_score FLOAT DEFAULT 0.5, -- 0-1 scale
  confidence_score FLOAT DEFAULT 0.5, -- How confident the clustering is

  -- Keywords and entities
  keywords TEXT[] DEFAULT '{}',
  related_entities TEXT[] DEFAULT '{}',

  -- Embedding for topic search
  embedding extensions.vector(1536),

  -- Stats
  document_count INTEGER DEFAULT 0,
  chunk_count INTEGER DEFAULT 0,
  last_updated_at TIMESTAMPTZ,

  -- Automation
  auto_generated BOOLEAN DEFAULT TRUE,
  needs_review BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Junction table for topic-document relationships
CREATE TABLE IF NOT EXISTS topic_documents (
  id TEXT PRIMARY KEY DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT::TEXT,
  topic_id TEXT NOT NULL REFERENCES knowledge_topics(id) ON DELETE CASCADE,
  document_id TEXT NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  relevance_score FLOAT DEFAULT 0.5, -- How relevant this doc is to the topic
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(topic_id, document_id)
);

-- =============================================================================
-- L4: KNOWLEDGE GRAPH
-- =============================================================================
-- High-level concepts and their relationships

CREATE TABLE IF NOT EXISTS knowledge_concepts (
  id TEXT PRIMARY KEY DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT::TEXT,

  -- Ownership
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE SET NULL,

  -- Concept info
  name TEXT NOT NULL,
  description TEXT,
  concept_type TEXT NOT NULL, -- 'entity', 'process', 'decision', 'goal', 'metric', 'risk'

  -- Attributes
  attributes JSONB DEFAULT '{}', -- Flexible key-value attributes
  aliases TEXT[] DEFAULT '{}', -- Alternative names

  -- Embedding for concept search
  embedding extensions.vector(1536),

  -- Source tracking
  source_documents TEXT[] DEFAULT '{}', -- Document IDs where this concept appears
  mention_count INTEGER DEFAULT 1,
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),

  -- Quality
  confidence_score FLOAT DEFAULT 0.5,
  verified BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Concept relationships (edges in knowledge graph)
CREATE TABLE IF NOT EXISTS concept_relationships (
  id TEXT PRIMARY KEY DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT::TEXT,

  -- Relationship
  source_concept_id TEXT NOT NULL REFERENCES knowledge_concepts(id) ON DELETE CASCADE,
  target_concept_id TEXT NOT NULL REFERENCES knowledge_concepts(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL, -- 'depends_on', 'part_of', 'related_to', 'contradicts', 'supports', 'causes', 'blocks'

  -- Metadata
  strength FLOAT DEFAULT 0.5, -- 0-1 scale
  description TEXT, -- Human-readable description of relationship
  evidence TEXT[], -- Quotes/references supporting this relationship

  -- Source tracking
  source_documents TEXT[] DEFAULT '{}',
  auto_generated BOOLEAN DEFAULT TRUE,
  verified BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(source_concept_id, target_concept_id, relationship_type)
);

-- =============================================================================
-- COMPRESSION JOBS
-- =============================================================================
-- Track background compression tasks

CREATE TABLE IF NOT EXISTS compression_jobs (
  id TEXT PRIMARY KEY DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT::TEXT,

  -- Ownership
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE SET NULL,

  -- Job info
  job_type TEXT NOT NULL, -- 'l2_summary', 'l3_clustering', 'l4_extraction', 'full_refresh'
  status TEXT DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'

  -- Scope
  document_ids TEXT[], -- Specific docs to process (null = all)
  topic_ids TEXT[], -- Specific topics to update (null = all)

  -- Progress
  progress INTEGER DEFAULT 0, -- 0-100
  items_processed INTEGER DEFAULT 0,
  items_total INTEGER DEFAULT 0,
  current_step TEXT,

  -- Results
  result JSONB,
  error_message TEXT,

  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,

  -- Audit
  triggered_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Document summaries
CREATE INDEX IF NOT EXISTS idx_document_summaries_document ON document_summaries(document_id);
CREATE INDEX IF NOT EXISTS idx_document_summaries_embedding
  ON document_summaries
  USING hnsw (embedding extensions.vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Topics
CREATE INDEX IF NOT EXISTS idx_knowledge_topics_team ON knowledge_topics(team_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_topics_workspace ON knowledge_topics(workspace_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_topics_embedding
  ON knowledge_topics
  USING hnsw (embedding extensions.vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Topic documents
CREATE INDEX IF NOT EXISTS idx_topic_documents_topic ON topic_documents(topic_id);
CREATE INDEX IF NOT EXISTS idx_topic_documents_document ON topic_documents(document_id);

-- Concepts
CREATE INDEX IF NOT EXISTS idx_knowledge_concepts_team ON knowledge_concepts(team_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_concepts_workspace ON knowledge_concepts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_concepts_type ON knowledge_concepts(concept_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_concepts_embedding
  ON knowledge_concepts
  USING hnsw (embedding extensions.vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Relationships
CREATE INDEX IF NOT EXISTS idx_concept_relationships_source ON concept_relationships(source_concept_id);
CREATE INDEX IF NOT EXISTS idx_concept_relationships_target ON concept_relationships(target_concept_id);
CREATE INDEX IF NOT EXISTS idx_concept_relationships_type ON concept_relationships(relationship_type);

-- Jobs
CREATE INDEX IF NOT EXISTS idx_compression_jobs_team ON compression_jobs(team_id);
CREATE INDEX IF NOT EXISTS idx_compression_jobs_status ON compression_jobs(status);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE document_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE concept_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE compression_jobs ENABLE ROW LEVEL SECURITY;

-- Document Summaries (inherit from parent document)
CREATE POLICY "Users can view summaries of accessible documents"
  ON document_summaries FOR SELECT
  USING (
    document_id IN (
      SELECT id FROM knowledge_documents
      WHERE team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "System can manage summaries"
  ON document_summaries FOR ALL
  USING (
    document_id IN (
      SELECT id FROM knowledge_documents
      WHERE team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      )
    )
  );

-- Knowledge Topics
CREATE POLICY "Team members can view topics"
  ON knowledge_topics FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can manage topics"
  ON knowledge_topics FOR ALL
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- Topic Documents
CREATE POLICY "Users can view topic-document links"
  ON topic_documents FOR SELECT
  USING (
    topic_id IN (
      SELECT id FROM knowledge_topics
      WHERE team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "System can manage topic-document links"
  ON topic_documents FOR ALL
  USING (
    topic_id IN (
      SELECT id FROM knowledge_topics
      WHERE team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      )
    )
  );

-- Knowledge Concepts
CREATE POLICY "Team members can view concepts"
  ON knowledge_concepts FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can manage concepts"
  ON knowledge_concepts FOR ALL
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- Concept Relationships
CREATE POLICY "Users can view relationships"
  ON concept_relationships FOR SELECT
  USING (
    source_concept_id IN (
      SELECT id FROM knowledge_concepts
      WHERE team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "System can manage relationships"
  ON concept_relationships FOR ALL
  USING (
    source_concept_id IN (
      SELECT id FROM knowledge_concepts
      WHERE team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      )
    )
  );

-- Compression Jobs
CREATE POLICY "Team members can view jobs"
  ON compression_jobs FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can create jobs"
  ON compression_jobs FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Get compressed context for AI (combines L2-L4)
CREATE OR REPLACE FUNCTION get_compressed_context(
  p_team_id TEXT,
  p_query_embedding extensions.vector(1536),
  p_workspace_id TEXT DEFAULT NULL,
  p_max_tokens INTEGER DEFAULT 2000
)
RETURNS TABLE (
  layer TEXT,
  source_id TEXT,
  source_name TEXT,
  content TEXT,
  similarity FLOAT,
  token_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH combined AS (
    -- L2: Document summaries
    SELECT
      'L2' AS layer,
      ds.document_id AS source_id,
      kd.name AS source_name,
      ds.summary AS content,
      1 - (ds.embedding <=> p_query_embedding) AS similarity,
      ds.token_count
    FROM document_summaries ds
    JOIN knowledge_documents kd ON ds.document_id = kd.id
    WHERE kd.team_id = p_team_id
      AND (p_workspace_id IS NULL OR kd.workspace_id = p_workspace_id)
      AND ds.embedding IS NOT NULL

    UNION ALL

    -- L3: Topic summaries
    SELECT
      'L3' AS layer,
      kt.id AS source_id,
      kt.name AS source_name,
      kt.summary AS content,
      1 - (kt.embedding <=> p_query_embedding) AS similarity,
      COALESCE(LENGTH(kt.summary) / 4, 100) AS token_count
    FROM knowledge_topics kt
    WHERE kt.team_id = p_team_id
      AND (p_workspace_id IS NULL OR kt.workspace_id = p_workspace_id)
      AND kt.embedding IS NOT NULL
      AND kt.summary IS NOT NULL

    UNION ALL

    -- L4: Concepts with descriptions
    SELECT
      'L4' AS layer,
      kc.id AS source_id,
      kc.name AS source_name,
      kc.description AS content,
      1 - (kc.embedding <=> p_query_embedding) AS similarity,
      COALESCE(LENGTH(kc.description) / 4, 50) AS token_count
    FROM knowledge_concepts kc
    WHERE kc.team_id = p_team_id
      AND (p_workspace_id IS NULL OR kc.workspace_id = p_workspace_id)
      AND kc.embedding IS NOT NULL
      AND kc.description IS NOT NULL
  ),
  ranked AS (
    SELECT *,
      SUM(token_count) OVER (ORDER BY similarity DESC) AS cumulative_tokens
    FROM combined
    WHERE similarity >= 0.6
  )
  SELECT
    ranked.layer,
    ranked.source_id,
    ranked.source_name,
    ranked.content,
    ranked.similarity,
    ranked.token_count
  FROM ranked
  WHERE cumulative_tokens <= p_max_tokens
  ORDER BY similarity DESC;
END;
$$;

-- Get knowledge graph for a workspace
CREATE OR REPLACE FUNCTION get_knowledge_graph(
  p_team_id TEXT,
  p_workspace_id TEXT DEFAULT NULL,
  p_concept_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  concepts JSONB,
  relationships JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH top_concepts AS (
    SELECT id, name, concept_type, description, mention_count
    FROM knowledge_concepts
    WHERE team_id = p_team_id
      AND (p_workspace_id IS NULL OR workspace_id = p_workspace_id)
    ORDER BY mention_count DESC, confidence_score DESC
    LIMIT p_concept_limit
  ),
  relevant_relationships AS (
    SELECT
      cr.source_concept_id,
      cr.target_concept_id,
      cr.relationship_type,
      cr.strength
    FROM concept_relationships cr
    WHERE cr.source_concept_id IN (SELECT id FROM top_concepts)
      AND cr.target_concept_id IN (SELECT id FROM top_concepts)
  )
  SELECT
    (SELECT jsonb_agg(row_to_json(tc)) FROM top_concepts tc) AS concepts,
    (SELECT jsonb_agg(row_to_json(rr)) FROM relevant_relationships rr) AS relationships;
END;
$$;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Auto-update timestamps
CREATE TRIGGER update_document_summaries_updated_at
  BEFORE UPDATE ON document_summaries
  FOR EACH ROW
  EXECUTE FUNCTION update_knowledge_updated_at();

CREATE TRIGGER update_knowledge_topics_updated_at
  BEFORE UPDATE ON knowledge_topics
  FOR EACH ROW
  EXECUTE FUNCTION update_knowledge_updated_at();

CREATE TRIGGER update_knowledge_concepts_updated_at
  BEFORE UPDATE ON knowledge_concepts
  FOR EACH ROW
  EXECUTE FUNCTION update_knowledge_updated_at();

COMMENT ON TABLE document_summaries IS 'L2: Document-level summaries with key insights';
COMMENT ON TABLE knowledge_topics IS 'L3: Cross-document topic clusters';
COMMENT ON TABLE knowledge_concepts IS 'L4: Knowledge graph concepts';
COMMENT ON TABLE concept_relationships IS 'L4: Relationships between concepts';
COMMENT ON TABLE compression_jobs IS 'Background jobs for knowledge compression';
