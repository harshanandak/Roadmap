-- Migration: Add UNIQUE constraint on (work_item_id, timeline) to prevent duplicates
-- Each work item should only have ONE timeline item per timeline type (MVP, SHORT, LONG)

-- Step 1: Remove duplicates (keep the most recently updated one)
-- Using a CTE to identify duplicates and delete all but the most recent
WITH duplicates AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY work_item_id, timeline
           ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
         ) as rn
  FROM timeline_items
  WHERE work_item_id IS NOT NULL
)
DELETE FROM timeline_items
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Step 2: Add unique constraint to prevent future duplicates (if not exists)
-- This ensures each work_item can only have one entry per timeline type (MVP, SHORT, LONG)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'unique_work_item_timeline'
  ) THEN
    ALTER TABLE timeline_items
      ADD CONSTRAINT unique_work_item_timeline UNIQUE (work_item_id, timeline);
  END IF;
END $$;

-- Add a comment explaining the constraint (safe to run multiple times)
COMMENT ON CONSTRAINT unique_work_item_timeline ON timeline_items IS
  'Ensures each work item can only have one timeline item per timeline type (MVP, SHORT, or LONG)';
