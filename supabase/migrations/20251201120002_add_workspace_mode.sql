-- =====================================================
-- WORKSPACE MODE COLUMNS
-- Lifecycle context for workspaces
-- Modes: development, launch, growth, maintenance
-- =====================================================

-- Add mode column with check constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'workspaces'
    AND column_name = 'mode'
  ) THEN
    ALTER TABLE public.workspaces
      ADD COLUMN mode TEXT NOT NULL DEFAULT 'development';

    ALTER TABLE public.workspaces
      ADD CONSTRAINT workspaces_mode_check
      CHECK (mode IN ('development', 'launch', 'growth', 'maintenance'));
  END IF;
END $$;

-- Add mode_settings column (JSONB for future extensibility)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'workspaces'
    AND column_name = 'mode_settings'
  ) THEN
    ALTER TABLE public.workspaces
      ADD COLUMN mode_settings JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Add mode_changed_at column (tracks when mode was last changed)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'workspaces'
    AND column_name = 'mode_changed_at'
  ) THEN
    ALTER TABLE public.workspaces
      ADD COLUMN mode_changed_at TIMESTAMPTZ;
  END IF;
END $$;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON COLUMN public.workspaces.mode IS 'Workspace lifecycle mode: development (building), launch (shipping), growth (iterating), maintenance (sustaining)';
COMMENT ON COLUMN public.workspaces.mode_settings IS 'Mode-specific settings (JSON): type_weights, dashboard_widgets, ai_personality, phase_emphasis';
COMMENT ON COLUMN public.workspaces.mode_changed_at IS 'Timestamp of last mode change for analytics and smart prompts';
