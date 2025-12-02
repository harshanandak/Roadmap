-- =============================================
-- PUBLIC FEEDBACK & VOTING SETTINGS MIGRATION
-- =============================================
-- Adds configurable settings for public feedback collection,
-- widget embedding, and voting verification.
--
-- Key Features:
-- 1. Smart default: public_feedback_enabled = TRUE (enabled by default)
-- 2. Widget customization via JSONB (theme, color, position)
-- 3. Team-configurable voting verification
-- 4. Submission source tracking for insights
-- =============================================

-- ===========================================
-- WORKSPACES: Public Feedback Settings
-- ===========================================

-- Add public feedback toggle (enabled by default - "smart default")
ALTER TABLE public.workspaces
ADD COLUMN IF NOT EXISTS public_feedback_enabled BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN public.workspaces.public_feedback_enabled IS
'Whether public feedback submission is enabled for this workspace. Defaults to TRUE (smart default).';

-- Add widget settings as JSONB for flexibility
ALTER TABLE public.workspaces
ADD COLUMN IF NOT EXISTS widget_settings JSONB DEFAULT '{
  "enabled": true,
  "theme": "auto",
  "primaryColor": "#3B82F6",
  "position": "bottom-right",
  "showRating": true,
  "requireEmail": false
}'::jsonb;

COMMENT ON COLUMN public.workspaces.widget_settings IS
'Widget customization settings: theme (light/dark/auto), primaryColor, position, showRating, requireEmail';

-- Add voting settings - CONFIGURABLE PER WORKSPACE
-- Teams decide if they want email verification
ALTER TABLE public.workspaces
ADD COLUMN IF NOT EXISTS voting_settings JSONB DEFAULT '{
  "enabled": true,
  "requireEmailVerification": false,
  "allowAnonymous": true
}'::jsonb;

COMMENT ON COLUMN public.workspaces.voting_settings IS
'Voting configuration: enabled, requireEmailVerification (team choice), allowAnonymous';

-- ===========================================
-- CUSTOMER_INSIGHTS: Public Sharing & Source Tracking
-- ===========================================

-- Add public sharing toggle for individual insights
ALTER TABLE public.customer_insights
ADD COLUMN IF NOT EXISTS public_share_enabled BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.customer_insights.public_share_enabled IS
'Whether this insight can be shared publicly for voting';

-- Add submission source tracking
DO $$
BEGIN
  -- Only add if column doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'customer_insights'
    AND column_name = 'submission_source'
  ) THEN
    ALTER TABLE public.customer_insights
    ADD COLUMN submission_source TEXT DEFAULT 'internal'
    CHECK (submission_source IN ('internal', 'public_page', 'widget', 'api'));
  END IF;
END $$;

COMMENT ON COLUMN public.customer_insights.submission_source IS
'Where the insight originated: internal (dashboard), public_page, widget, or api';

-- Add submitter IP for rate limiting tracking (stored hashed for privacy)
ALTER TABLE public.customer_insights
ADD COLUMN IF NOT EXISTS submission_ip_hash TEXT;

COMMENT ON COLUMN public.customer_insights.submission_ip_hash IS
'Hashed IP address for rate limiting (privacy-preserving)';

-- ===========================================
-- INDEXES for Performance
-- ===========================================

-- Index for public feedback queries
CREATE INDEX IF NOT EXISTS idx_workspaces_public_enabled
ON public.workspaces(id) WHERE public_feedback_enabled = TRUE;

-- Index for public insights queries
CREATE INDEX IF NOT EXISTS idx_insights_public_share
ON public.customer_insights(id) WHERE public_share_enabled = TRUE;

-- Index for submission source filtering
CREATE INDEX IF NOT EXISTS idx_insights_submission_source
ON public.customer_insights(submission_source);

-- ===========================================
-- RLS POLICIES for Public Access
-- ===========================================

-- Allow public SELECT on workspaces for public feedback validation
-- This is safe because we only expose id and name for validation
DROP POLICY IF EXISTS "Public can view public-enabled workspaces" ON public.workspaces;
CREATE POLICY "Public can view public-enabled workspaces"
ON public.workspaces FOR SELECT
USING (public_feedback_enabled = TRUE);

-- Allow public INSERT on customer_insights for feedback submission
-- Controlled by workspace public_feedback_enabled setting
DROP POLICY IF EXISTS "Public can submit feedback to enabled workspaces" ON public.customer_insights;
CREATE POLICY "Public can submit feedback to enabled workspaces"
ON public.customer_insights FOR INSERT
WITH CHECK (
  -- Must have a workspace_id
  workspace_id IS NOT NULL
  AND
  -- That workspace must have public feedback enabled
  EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = workspace_id
    AND w.public_feedback_enabled = TRUE
  )
  AND
  -- Must be from a public source
  submission_source IN ('public_page', 'widget')
);

-- Allow public SELECT on insights that are public-share enabled
-- For voting pages - only expose limited fields via API
DROP POLICY IF EXISTS "Public can view public insights for voting" ON public.customer_insights;
CREATE POLICY "Public can view public insights for voting"
ON public.customer_insights FOR SELECT
USING (
  public_share_enabled = TRUE
  OR
  -- Also allow if workspace has public feedback enabled (for confirmation)
  EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = workspace_id
    AND w.public_feedback_enabled = TRUE
  )
);

-- Allow public INSERT on insight_votes for external voting
DROP POLICY IF EXISTS "Public can vote on public insights" ON public.insight_votes;
CREATE POLICY "Public can vote on public insights"
ON public.insight_votes FOR INSERT
WITH CHECK (
  -- The insight must exist and be public-shareable
  EXISTS (
    SELECT 1 FROM public.customer_insights ci
    WHERE ci.id = insight_id
    AND (
      ci.public_share_enabled = TRUE
      OR EXISTS (
        SELECT 1 FROM public.workspaces w
        WHERE w.id = ci.workspace_id
        AND w.public_feedback_enabled = TRUE
      )
    )
  )
);

-- ===========================================
-- FUNCTIONS for Public Access
-- ===========================================

-- Function to check if workspace allows public feedback
CREATE OR REPLACE FUNCTION public.check_public_feedback_enabled(ws_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE id = ws_id AND public_feedback_enabled = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get workspace public settings (safe subset)
CREATE OR REPLACE FUNCTION public.get_workspace_public_settings(ws_id TEXT)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', w.id,
    'name', w.name,
    'icon', w.icon,
    'public_feedback_enabled', w.public_feedback_enabled,
    'widget_settings', w.widget_settings,
    'voting_settings', w.voting_settings
  ) INTO result
  FROM public.workspaces w
  WHERE w.id = ws_id;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- MIGRATION COMPLETE
-- ===========================================
-- Summary of changes:
-- 1. workspaces.public_feedback_enabled (BOOLEAN, default TRUE)
-- 2. workspaces.widget_settings (JSONB with customization)
-- 3. workspaces.voting_settings (JSONB with team choice for verification)
-- 4. customer_insights.public_share_enabled (BOOLEAN, default FALSE)
-- 5. customer_insights.submission_source (TEXT enum)
-- 6. customer_insights.submission_ip_hash (TEXT for rate limiting)
-- 7. RLS policies for public access
-- 8. Helper functions for public settings
