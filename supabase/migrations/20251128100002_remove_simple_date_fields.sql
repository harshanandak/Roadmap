-- Migration: Remove redundant simple date fields from work_items
-- Issue: work_items has both planned_*/actual_* dates AND simple start_date/end_date
-- Solution: Keep planned/actual pattern (4 fields), remove simple fields (2 fields)
-- Made idempotent - safe to run if columns already removed

DO $$
BEGIN
  -- Step 1: Migrate data from start_date to planned_start_date (if column exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_items' AND column_name = 'start_date'
  ) THEN
    UPDATE work_items
    SET planned_start_date = start_date::date
    WHERE planned_start_date IS NULL AND start_date IS NOT NULL;

    ALTER TABLE work_items DROP COLUMN start_date;
  END IF;

  -- Step 2: Migrate data from end_date to planned_end_date (if column exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_items' AND column_name = 'end_date'
  ) THEN
    UPDATE work_items
    SET planned_end_date = end_date::date
    WHERE planned_end_date IS NULL AND end_date IS NOT NULL;

    ALTER TABLE work_items DROP COLUMN end_date;
  END IF;
END $$;

-- Step 3: Drop any old triggers that may reference removed columns
DROP TRIGGER IF EXISTS update_duration_on_date_change ON work_items;
DROP FUNCTION IF EXISTS calculate_work_item_duration();

-- Step 4: Create duration_days column if it doesn't exist, then create trigger
DO $$
BEGIN
  -- Add duration_days column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_items' AND column_name = 'duration_days'
  ) THEN
    ALTER TABLE work_items ADD COLUMN duration_days INTEGER;
  END IF;
END $$;

-- Create trigger function for duration calculation
CREATE OR REPLACE FUNCTION calculate_work_item_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.planned_start_date IS NOT NULL AND NEW.planned_end_date IS NOT NULL THEN
    NEW.duration_days := NEW.planned_end_date - NEW.planned_start_date;
  ELSE
    NEW.duration_days := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (drop first if exists for idempotency)
DROP TRIGGER IF EXISTS update_duration_on_date_change ON work_items;
CREATE TRIGGER update_duration_on_date_change
BEFORE INSERT OR UPDATE OF planned_start_date, planned_end_date ON work_items
FOR EACH ROW
EXECUTE FUNCTION calculate_work_item_duration();

-- Step 5: Add documentation comments (only for columns that exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_items' AND column_name = 'planned_start_date') THEN
    COMMENT ON COLUMN work_items.planned_start_date IS 'Planned start date for scheduling. Use this for timeline calculations.';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_items' AND column_name = 'planned_end_date') THEN
    COMMENT ON COLUMN work_items.planned_end_date IS 'Planned end date for scheduling. Use this for timeline calculations.';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_items' AND column_name = 'actual_start_date') THEN
    COMMENT ON COLUMN work_items.actual_start_date IS 'Actual start date (when work began). For variance tracking.';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_items' AND column_name = 'actual_end_date') THEN
    COMMENT ON COLUMN work_items.actual_end_date IS 'Actual end date (when work completed). For variance tracking.';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_items' AND column_name = 'duration_days') THEN
    COMMENT ON COLUMN work_items.duration_days IS 'Calculated duration in days (planned_end_date - planned_start_date).';
  END IF;
END $$;
