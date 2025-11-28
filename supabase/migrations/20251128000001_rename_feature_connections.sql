-- Migration: Rename feature_connections to work_item_connections
-- Part of naming cleanup: "feature" -> "work_item" consistency
-- Made idempotent - safe to run if already renamed

-- Step 1: Rename the table (if old name exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'feature_connections') THEN
    ALTER TABLE feature_connections RENAME TO work_item_connections;
  END IF;
END $$;

-- Step 2: Rename the columns (if old names exist)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_item_connections' AND column_name = 'source_feature_id'
  ) THEN
    ALTER TABLE work_item_connections RENAME COLUMN source_feature_id TO source_work_item_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_item_connections' AND column_name = 'target_feature_id'
  ) THEN
    ALTER TABLE work_item_connections RENAME COLUMN target_feature_id TO target_work_item_id;
  END IF;
END $$;

-- Step 3: Update foreign key constraint names (if they exist)
-- Only run if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'work_item_connections') THEN
    -- Drop old constraints (safe - IF EXISTS)
    ALTER TABLE work_item_connections DROP CONSTRAINT IF EXISTS feature_connections_source_feature_id_fkey;
    ALTER TABLE work_item_connections DROP CONSTRAINT IF EXISTS feature_connections_target_feature_id_fkey;
    ALTER TABLE work_item_connections DROP CONSTRAINT IF EXISTS feature_connections_workspace_id_fkey;
    ALTER TABLE work_item_connections DROP CONSTRAINT IF EXISTS feature_connections_user_id_fkey;
    ALTER TABLE work_item_connections DROP CONSTRAINT IF EXISTS feature_connections_pkey;

    -- Add new primary key if not exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'work_item_connections_pkey'
    ) THEN
      ALTER TABLE work_item_connections ADD CONSTRAINT work_item_connections_pkey PRIMARY KEY (id);
    END IF;

    -- Add new foreign keys if not exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'work_item_connections_source_work_item_id_fkey'
    ) THEN
      ALTER TABLE work_item_connections
        ADD CONSTRAINT work_item_connections_source_work_item_id_fkey
        FOREIGN KEY (source_work_item_id) REFERENCES work_items(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'work_item_connections_target_work_item_id_fkey'
    ) THEN
      ALTER TABLE work_item_connections
        ADD CONSTRAINT work_item_connections_target_work_item_id_fkey
        FOREIGN KEY (target_work_item_id) REFERENCES work_items(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'work_item_connections_workspace_id_fkey'
    ) THEN
      ALTER TABLE work_item_connections
        ADD CONSTRAINT work_item_connections_workspace_id_fkey
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
    END IF;

    -- Note: user_id FK skipped - column is TEXT but users.id is UUID
    -- This is a legacy data type issue that would require a separate migration to fix
  END IF;
END $$;

-- Step 4: Update RLS policies (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'work_item_connections') THEN
    -- Drop old policies (safe - IF EXISTS)
    DROP POLICY IF EXISTS "Team members can view connections" ON work_item_connections;
    DROP POLICY IF EXISTS "Team members can create connections" ON work_item_connections;
    DROP POLICY IF EXISTS "Team members can update connections" ON work_item_connections;
    DROP POLICY IF EXISTS "Team members can delete connections" ON work_item_connections;

    -- Drop new policies in case they exist (for idempotency)
    DROP POLICY IF EXISTS "Team members can view work item connections" ON work_item_connections;
    DROP POLICY IF EXISTS "Team members can create work item connections" ON work_item_connections;
    DROP POLICY IF EXISTS "Team members can update work item connections" ON work_item_connections;
    DROP POLICY IF EXISTS "Team members can delete work item connections" ON work_item_connections;

    -- Create new policies
    CREATE POLICY "Team members can view work item connections"
    ON work_item_connections FOR SELECT TO authenticated
    USING (workspace_id IN (
      SELECT w.id FROM workspaces w
      JOIN team_members tm ON tm.team_id = w.team_id
      WHERE tm.user_id = auth.uid()
    ));

    CREATE POLICY "Team members can create work item connections"
    ON work_item_connections FOR INSERT TO authenticated
    WITH CHECK (workspace_id IN (
      SELECT w.id FROM workspaces w
      JOIN team_members tm ON tm.team_id = w.team_id
      WHERE tm.user_id = auth.uid()
    ));

    CREATE POLICY "Team members can update work item connections"
    ON work_item_connections FOR UPDATE TO authenticated
    USING (workspace_id IN (
      SELECT w.id FROM workspaces w
      JOIN team_members tm ON tm.team_id = w.team_id
      WHERE tm.user_id = auth.uid()
    ));

    CREATE POLICY "Team members can delete work item connections"
    ON work_item_connections FOR DELETE TO authenticated
    USING (workspace_id IN (
      SELECT w.id FROM workspaces w
      JOIN team_members tm ON tm.team_id = w.team_id
      WHERE tm.user_id = auth.uid()
    ));

    -- Step 5: Update indexes (drop old, create new)
    DROP INDEX IF EXISTS idx_feature_connections_workspace;
    DROP INDEX IF EXISTS idx_feature_connections_source;
    DROP INDEX IF EXISTS idx_feature_connections_target;
    DROP INDEX IF EXISTS idx_feature_connections_type;

    CREATE INDEX IF NOT EXISTS idx_work_item_connections_workspace ON work_item_connections(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_work_item_connections_source ON work_item_connections(source_work_item_id);
    CREATE INDEX IF NOT EXISTS idx_work_item_connections_target ON work_item_connections(target_work_item_id);
    CREATE INDEX IF NOT EXISTS idx_work_item_connections_type ON work_item_connections(connection_type);
  END IF;
END $$;

-- Add comment (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'work_item_connections') THEN
    COMMENT ON TABLE work_item_connections IS 'Work item dependency connections (renamed from feature_connections for naming consistency)';
  END IF;
END $$;
