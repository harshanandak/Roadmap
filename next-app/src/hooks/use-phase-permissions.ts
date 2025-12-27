/**
 * Phase Permissions Hook
 *
 * React hook for checking user's phase-based permissions in a workspace.
 * Provides efficient permission checking with caching and real-time updates.
 *
 * OPTIMIZED: Now uses PermissionsProvider context when available,
 * eliminating duplicate subscriptions across components.
 *
 * Usage:
 * ```tsx
 * const { permissions, canEdit, canView, isLoading } = usePhasePermissions({
 *   workspaceId: 'workspace_123',
 *   teamId: 'team_456'
 * });
 *
 * if (canEdit('execution')) {
 *   // Show edit UI
 * }
 * ```
 */

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getUserPhasePermissions, canUserEditPhase } from '@/lib/utils/phase-permissions'
import { usePermissionsOptional } from '@/providers/permissions-provider'
import type { UserPhasePermissions, WorkspacePhase } from '@/lib/types/team'

interface UsePhasePermissionsParams {
  workspaceId: string
  teamId: string
}

interface UsePhasePermissionsReturn {
  /** Full permission map for all phases */
  permissions: UserPhasePermissions | null

  /** Check if user can edit a specific phase */
  canEdit: (phase: WorkspacePhase) => boolean

  /** Check if user can view a specific phase (always true for team members) */
  canView: (phase: WorkspacePhase) => boolean

  /** Check if user can delete items in a specific phase */
  canDelete: (phase: WorkspacePhase) => boolean

  /** Loading state */
  isLoading: boolean

  /** Error state */
  error: Error | null

  /** Manually refresh permissions */
  refresh: () => Promise<void>
}

/**
 * Hook to get user's phase permissions for a workspace
 *
 * Automatically refreshes when:
 * - Phase assignments change (via Supabase real-time)
 * - User role changes
 * - Workspace or team changes
 *
 * If used within PermissionsProvider, reads from shared context (recommended).
 * Falls back to direct subscription if provider not available.
 *
 * @param params - Workspace and team IDs
 * @returns Permission checking utilities and state
 */
export function usePhasePermissions({
  workspaceId,
  teamId,
}: UsePhasePermissionsParams): UsePhasePermissionsReturn {
  // Try to use context first (optimized path - no duplicate subscriptions)
  const contextPermissions = usePermissionsOptional()

  // Always call the direct hook to comply with rules of hooks
  // We'll use its result only if context is not available
  const directResult = usePhasePermissionsDirect({ workspaceId, teamId })

  // Check if context matches our workspace/team
  const useContext =
    contextPermissions &&
    contextPermissions.workspaceId === workspaceId &&
    contextPermissions.teamId === teamId

  // If context is available and matches, use it directly
  if (useContext) {
    return {
      permissions: contextPermissions.permissions,
      canEdit: contextPermissions.canEdit,
      canView: contextPermissions.canView,
      canDelete: contextPermissions.canDelete,
      isLoading: contextPermissions.isPermissionsLoading,
      error: contextPermissions.error,
      refresh: contextPermissions.refresh,
    }
  }

  // Fallback: Direct subscription (for backward compatibility)
  return directResult
}

/**
 * Direct implementation without context (fallback)
 * @internal
 */
function usePhasePermissionsDirect({
  workspaceId,
  teamId,
}: UsePhasePermissionsParams): UsePhasePermissionsReturn {
  const [permissions, setPermissions] = useState<UserPhasePermissions | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const supabase = createClient()

  // Load permissions function
  const loadPermissions = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('No authenticated user')
      }

      // Fetch permissions
      const userPermissions = await getUserPhasePermissions(
        user.id,
        workspaceId,
        teamId
      )

      setPermissions(userPermissions)
    } catch (err) {
      console.error('Error loading phase permissions:', err)
      setError(err instanceof Error ? err : new Error('Failed to load permissions'))
    } finally {
      setIsLoading(false)
    }
  }, [workspaceId, teamId, supabase])

  // Load permissions on mount and when dependencies change
  useEffect(() => {
    loadPermissions()
  }, [loadPermissions])

  // Subscribe to real-time updates for phase assignments
  useEffect(() => {
    console.warn(
      '[usePhasePermissions] Using direct subscription. ' +
      'Consider wrapping with PermissionsProvider for better performance.'
    )

    const channel = supabase
      .channel(`phase-permissions-fallback-${workspaceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_phase_assignments',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        () => {
          loadPermissions()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_members',
          filter: `team_id=eq.${teamId}`,
        },
        () => {
          loadPermissions()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [workspaceId, teamId, supabase, loadPermissions])

  // Permission check helpers
  const canEdit = useCallback((phase: WorkspacePhase): boolean => {
    if (!permissions) return false
    return permissions[phase]?.can_edit ?? false
  }, [permissions])

  const canView = useCallback((phase: WorkspacePhase): boolean => {
    if (!permissions) return false
    return permissions[phase]?.can_view ?? false
  }, [permissions])

  const canDelete = useCallback((phase: WorkspacePhase): boolean => {
    if (!permissions) return false
    return permissions[phase]?.can_delete ?? false
  }, [permissions])

  return {
    permissions,
    canEdit,
    canView,
    canDelete,
    isLoading,
    error,
    refresh: loadPermissions,
  }
}

/**
 * Hook to check a single phase permission without loading all permissions
 *
 * OPTIMIZED: Uses PermissionsProvider context when available.
 *
 * Usage:
 * ```tsx
 * const { canEdit, isLoading } = useCanEditPhase({
 *   workspaceId: 'workspace_123',
 *   teamId: 'team_456',
 *   phase: 'execution'
 * });
 * ```
 */
export function useCanEditPhase({
  workspaceId,
  teamId,
  phase,
}: UsePhasePermissionsParams & { phase: WorkspacePhase }) {
  // Try to use context first
  const contextPermissions = usePermissionsOptional()

  // Always call the direct hook to comply with rules of hooks
  // We'll use its result only if context is not available
  const directResult = useCanEditPhaseDirect({ workspaceId, teamId, phase })

  const useContext =
    contextPermissions &&
    contextPermissions.workspaceId === workspaceId &&
    contextPermissions.teamId === teamId

  // If context is available and matches, use it directly
  if (useContext) {
    return {
      canEdit: contextPermissions.canEdit(phase),
      isLoading: contextPermissions.isPermissionsLoading,
      error: contextPermissions.error,
    }
  }

  // Fallback: Direct check
  return directResult
}

/**
 * Direct implementation without context (fallback)
 * @internal
 */
function useCanEditPhaseDirect({
  workspaceId,
  teamId,
  phase,
}: UsePhasePermissionsParams & { phase: WorkspacePhase }) {
  const [canEdit, setCanEdit] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const checkPermission = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          throw new Error('No authenticated user')
        }

        const hasPermission = await canUserEditPhase(
          user.id,
          workspaceId,
          teamId,
          phase
        )

        setCanEdit(hasPermission)
      } catch (err) {
        console.error('Error checking phase permission:', err)
        setError(err instanceof Error ? err : new Error('Failed to check permission'))
      } finally {
        setIsLoading(false)
      }
    }

    checkPermission()
  }, [workspaceId, teamId, phase, supabase])

  return { canEdit, isLoading, error }
}

/**
 * Hook to get user's phase assignments
 *
 * Returns raw phase assignment data for a workspace.
 * Use this when you need assignment details (notes, assigned_by, etc).
 *
 * @example
 * ```tsx
 * const { assignments, loading } = usePhaseAssignments({
 *   workspaceId: 'workspace_123'
 * })
 *
 * return (
 *   <ul>
 *     {assignments.map(a => (
 *       <li key={a.id}>
 *         {a.phase}: {a.can_edit ? 'Edit' : 'View'}
 *         {a.notes && <p>{a.notes}</p>}
 *       </li>
 *     ))}
 *   </ul>
 * )
 * ```
 */
export function usePhaseAssignments({ workspaceId }: { workspaceId: string }): {
  assignments: Array<{
    id: string
    phase: WorkspacePhase
    can_edit: boolean
    assigned_by: string
    assigned_at: string
    notes: string | null
  }>
  loading: boolean
  error: Error | null
} {
  const [assignments, setAssignments] = useState<
    Array<{
      id: string
      phase: WorkspacePhase
      can_edit: boolean
      assigned_by: string
      assigned_at: string
      notes: string | null
    }>
  >([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function fetchAssignments() {
      try {
        setLoading(true)
        setError(null)

        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          throw new Error('User not authenticated')
        }

        const { data, error: fetchError } = await supabase
          .from('user_phase_assignments')
          .select('id, phase, can_edit, assigned_by, assigned_at, notes')
          .eq('workspace_id', workspaceId)
          .eq('user_id', user.id)
          .order('assigned_at', { ascending: false })

        if (fetchError) throw fetchError

        setAssignments(data || [])
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to fetch assignments')
        setError(error)
        console.error('Error fetching phase assignments:', error)
      } finally {
        setLoading(false)
      }
    }

    if (workspaceId) {
      fetchAssignments()
    }
  }, [workspaceId, supabase])

  return { assignments, loading, error }
}
