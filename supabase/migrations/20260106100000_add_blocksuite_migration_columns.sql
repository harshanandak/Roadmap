-- BlockSuite Migration Columns for mind_maps
-- Phase 3: Data Migration (BlockSuite Integration)
--
-- Purpose: Store converted BlockSuite tree structures alongside original ReactFlow data
-- Follows pattern from 20250113000009_create_mind_maps_tables.sql
--
-- Key Design Decisions:
-- 1. Original data is NEVER modified - blocksuite_tree is stored separately
-- 2. migration_status determines which renderer to use
-- 3. lost_edges tracked for user awareness (DAG→Tree conversion limitation)
-- 4. size monitoring for TOAST performance (>2KB triggers compression)

-- Add migration tracking columns to mind_maps
ALTER TABLE mind_maps
ADD COLUMN IF NOT EXISTS blocksuite_tree JSONB,
ADD COLUMN IF NOT EXISTS blocksuite_size_bytes INTEGER,
ADD COLUMN IF NOT EXISTS migration_status TEXT DEFAULT 'pending'
  CHECK (migration_status IN ('pending', 'in_progress', 'success', 'warning', 'failed', 'skipped')),
ADD COLUMN IF NOT EXISTS migration_warnings TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS migration_lost_edges INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS migrated_at TIMESTAMPTZ;

-- Index for querying migration status (partial index for efficiency)
CREATE INDEX IF NOT EXISTS idx_mind_maps_migration_status
  ON mind_maps(migration_status)
  WHERE migration_status IS NOT NULL;

-- Index for finding large maps (TOAST threshold monitoring)
-- PostgreSQL TOAST compression kicks in at ~2KB
CREATE INDEX IF NOT EXISTS idx_mind_maps_blocksuite_size
  ON mind_maps(blocksuite_size_bytes)
  WHERE blocksuite_size_bytes > 2048;

-- Index for workspace-level migration queries
CREATE INDEX IF NOT EXISTS idx_mind_maps_workspace_migration
  ON mind_maps(workspace_id, migration_status)
  WHERE migration_status IS NOT NULL;

-- Comments documenting the schema
COMMENT ON COLUMN mind_maps.blocksuite_tree IS
  'BlockSuite nested tree structure converted from ReactFlow DAG. Some edges may be lost during DAG→Tree conversion. Original ReactFlow data is preserved in the nodes/edges tables.';

COMMENT ON COLUMN mind_maps.blocksuite_size_bytes IS
  'Estimated size of blocksuite_tree JSONB in bytes. Values >2048 trigger PostgreSQL TOAST compression. Monitor for performance.';

COMMENT ON COLUMN mind_maps.migration_status IS
  'Migration status: pending (not started), in_progress (migrating), success (complete), warning (with lost edges), failed (error), skipped (excluded)';

COMMENT ON COLUMN mind_maps.migration_warnings IS
  'Array of warning messages generated during migration (e.g., lost edges, circular refs detected)';

COMMENT ON COLUMN mind_maps.migration_lost_edges IS
  'Count of edges lost during DAG→Tree conversion. BlockSuite trees cannot have multiple parents per node.';

COMMENT ON COLUMN mind_maps.migrated_at IS
  'Timestamp when migration was successfully completed';

-- No RLS changes needed - inherits from existing mind_maps policies
-- The team_id-based RLS policies automatically apply to new columns
