-- ============================================================================
-- Migration: Add Strategy Reorder Function
-- Description: Adds function and index for atomic strategy sibling reordering
-- Used by: Drag-drop reordering in Strategy Tree component
-- ============================================================================

-- Function for atomic sibling reordering
-- This ensures data consistency when moving strategies within the tree
CREATE OR REPLACE FUNCTION reorder_strategy_siblings(
  strategy_id_param TEXT,
  new_parent_id_param TEXT,
  new_sort_order_param INTEGER
) RETURNS VOID AS $$
BEGIN
  -- Shift siblings at new position down to make room
  UPDATE product_strategies
  SET sort_order = sort_order + 1
  WHERE parent_id IS NOT DISTINCT FROM new_parent_id_param
    AND sort_order >= new_sort_order_param
    AND id != strategy_id_param;

  -- Update the moved strategy's position
  UPDATE product_strategies
  SET parent_id = new_parent_id_param,
      sort_order = new_sort_order_param,
      updated_at = NOW()
  WHERE id = strategy_id_param;
END;
$$ LANGUAGE plpgsql;

-- Add index for efficient reorder queries
-- Speeds up sibling lookups during drag-drop operations
CREATE INDEX IF NOT EXISTS idx_product_strategies_parent_sort
  ON public.product_strategies(parent_id, sort_order);

-- Add comment for documentation
COMMENT ON FUNCTION reorder_strategy_siblings IS
  'Atomically reorders a strategy within the tree, shifting siblings as needed';

-- Grant execute permission to authenticated users (RLS still applies on underlying tables)
GRANT EXECUTE ON FUNCTION reorder_strategy_siblings TO authenticated;
