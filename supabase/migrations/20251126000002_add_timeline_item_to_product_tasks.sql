-- Migration: Add timeline_item_id to product_tasks table (CRITICAL)
-- Issue #3: Product tasks can only link to work_items, not timeline_items
-- Solution: Add timeline_item_id column for granular task assignment
-- Made idempotent - safe to run if column already exists
--
-- This enables:
-- - Tasks linked to specific timeline items (MVP/SHORT/LONG breakdown)
-- - Tasks linked to work items (parent feature level)
-- - Standalone workspace tasks (neither linked)

-- Step 1: Add the timeline_item_id column (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_tasks' AND column_name = 'timeline_item_id'
  ) THEN
    ALTER TABLE product_tasks
      ADD COLUMN timeline_item_id TEXT REFERENCES timeline_items(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Step 2: Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_product_tasks_timeline_item
  ON product_tasks(timeline_item_id);

-- Step 3: Add comment for documentation
COMMENT ON COLUMN product_tasks.timeline_item_id IS 'Optional link to timeline item for granular task assignment at MVP/SHORT/LONG level';
