-- =====================================================
-- DEPARTMENTS TABLE
-- Team-scoped organizational units for work items
-- =====================================================

-- Create departments table
CREATE TABLE IF NOT EXISTS public.departments (
  id TEXT PRIMARY KEY DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT::TEXT,
  team_id TEXT NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#6366f1',
  icon TEXT DEFAULT 'folder',
  is_default BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,

  -- Ensure unique department names within a team
  CONSTRAINT departments_unique_name_per_team UNIQUE (team_id, name)
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_departments_team_id ON public.departments(team_id);
CREATE INDEX IF NOT EXISTS idx_departments_sort_order ON public.departments(team_id, sort_order);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- SELECT: Team members can view departments in their team
CREATE POLICY "Team members can view departments"
ON public.departments FOR SELECT
USING (
  team_id IN (
    SELECT team_id FROM public.team_members
    WHERE user_id = auth.uid()
  )
);

-- INSERT: Only admins/owners can create departments
CREATE POLICY "Admins can create departments"
ON public.departments FOR INSERT
WITH CHECK (
  team_id IN (
    SELECT team_id FROM public.team_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
);

-- UPDATE: Only admins/owners can update departments
CREATE POLICY "Admins can update departments"
ON public.departments FOR UPDATE
USING (
  team_id IN (
    SELECT team_id FROM public.team_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
);

-- DELETE: Only admins/owners can delete departments
CREATE POLICY "Admins can delete departments"
ON public.departments FOR DELETE
USING (
  team_id IN (
    SELECT team_id FROM public.team_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Updated_at trigger (reuses existing function)
CREATE TRIGGER update_departments_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ADD DEPARTMENT_ID TO WORK_ITEMS
-- =====================================================

ALTER TABLE public.work_items
  ADD COLUMN IF NOT EXISTS department_id TEXT REFERENCES public.departments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_work_items_department_id ON public.work_items(department_id);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.departments IS 'Team-scoped organizational departments for categorizing work items';
COMMENT ON COLUMN public.departments.id IS 'Timestamp-based unique identifier';
COMMENT ON COLUMN public.departments.team_id IS 'The team this department belongs to';
COMMENT ON COLUMN public.departments.name IS 'Department name (e.g., Engineering, Design, Product)';
COMMENT ON COLUMN public.departments.description IS 'Optional description of the department purpose';
COMMENT ON COLUMN public.departments.color IS 'Hex color for visual identification (e.g., #6366f1)';
COMMENT ON COLUMN public.departments.icon IS 'Lucide icon name (e.g., code-2, palette, briefcase)';
COMMENT ON COLUMN public.departments.is_default IS 'If true, new work items default to this department';
COMMENT ON COLUMN public.departments.sort_order IS 'Custom ordering for department lists';
COMMENT ON COLUMN public.work_items.department_id IS 'Optional department assignment for the work item';
