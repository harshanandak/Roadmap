'use client'

/**
 * Permissions Provider
 *
 * Centralized provider for phase permissions and admin status.
 * Maintains a SINGLE realtime subscription per workspace, shared across
 * all components that need permission checks.
 *
 * Benefits:
 * - Single WebSocket subscription instead of N subscriptions per component
 * - Automatic permission refresh on database changes
 * - Consistent permission state across the entire app
 * - Prevents subscription multiplication in list views
 *
 * Usage:
 * ```tsx
 * // Wrap your workspace routes with the provider
 * <PermissionsProvider workspaceId={id} teamId={teamId}>
 *   <WorkspaceContent />
 * </PermissionsProvider>
 *
 * // In any child component, use the hooks
 * const { canEdit, isAdmin } = usePermissions()
 * ```
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react'
import { createClient } from '@/lib/supabase/client'
import { getUserPhasePermissions, isUserAdminOrOwner } from '@/lib/utils/phase-permissions'
import type { UserPhasePermissions, WorkspacePhase, TeamRole } from '@/lib/types/team'

// ============================================================================
// Types
// ============================================================================

interface PermissionsContextValue {
  // Phase permissions
  permissions: UserPhasePermissions | null
  canEdit: (phase: WorkspacePhase) => boolean
  canView: (phase: WorkspacePhase) => boolean
  canDelete: (phase: WorkspacePhase) => boolean

  // Admin status
  isAdmin: boolean
  role: TeamRole | null

  // Loading states
  isLoading: boolean
  isPermissionsLoading: boolean
  isAdminLoading: boolean

  // Error handling
  error: Error | null

  // Manual refresh
  refresh: () => Promise<void>

  // Context info
  workspaceId: string
  teamId: string
}

interface PermissionsProviderProps {
  children: ReactNode
  workspaceId: string
  teamId: string
}

// ============================================================================
// Context
// ============================================================================

const PermissionsContext = createContext<PermissionsContextValue | null>(null)

// ============================================================================
// Provider Component
// ============================================================================

export function PermissionsProvider({
  children,
  workspaceId,
  teamId,
}: PermissionsProviderProps) {
  // State for permissions
  const [permissions, setPermissions] = useState<UserPhasePermissions | null>(null)
  const [isPermissionsLoading, setIsPermissionsLoading] = useState(true)

  // State for admin status
  const [isAdmin, setIsAdmin] = useState(false)
  const [role, setRole] = useState<TeamRole | null>(null)
  const [isAdminLoading, setIsAdminLoading] = useState(true)

  // Error state
  const [error, setError] = useState<Error | null>(null)

  // Get singleton supabase client
  const supabase = createClient()

  // ──────────────────────────────────────────────────────────────────────────
  // Load Functions
  // ──────────────────────────────────────────────────────────────────────────

  const loadPermissions = useCallback(async () => {
    try {
      setIsPermissionsLoading(true)
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('No authenticated user')
      }

      const userPermissions = await getUserPhasePermissions(
        user.id,
        workspaceId,
        teamId
      )

      setPermissions(userPermissions)
    } catch (err) {
      console.error('[PermissionsProvider] Error loading permissions:', err)
      setError(err instanceof Error ? err : new Error('Failed to load permissions'))
    } finally {
      setIsPermissionsLoading(false)
    }
  }, [workspaceId, teamId, supabase])

  const loadAdminStatus = useCallback(async () => {
    try {
      setIsAdminLoading(true)

      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('No authenticated user')
      }

      // Check admin status
      const adminStatus = await isUserAdminOrOwner(user.id, teamId)
      setIsAdmin(adminStatus)

      // Get specific role
      const { data: memberData, error: memberError } = await supabase
        .from('team_members')
        .select('role')
        .eq('team_id', teamId)
        .eq('user_id', user.id)
        .single()

      if (memberError && memberError.code !== 'PGRST116') {
        throw memberError
      }

      setRole(memberData?.role ?? null)
    } catch (err) {
      console.error('[PermissionsProvider] Error loading admin status:', err)
      setError(err instanceof Error ? err : new Error('Failed to check admin status'))
      setIsAdmin(false)
      setRole(null)
    } finally {
      setIsAdminLoading(false)
    }
  }, [teamId, supabase])

  const refresh = useCallback(async () => {
    await Promise.all([loadPermissions(), loadAdminStatus()])
  }, [loadPermissions, loadAdminStatus])

  // ──────────────────────────────────────────────────────────────────────────
  // Initial Load
  // ──────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    loadPermissions()
    loadAdminStatus()
  }, [loadPermissions, loadAdminStatus])

  // ──────────────────────────────────────────────────────────────────────────
  // Realtime Subscriptions (SINGLE subscription for all permission data)
  // ──────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    // Single channel for ALL permission-related updates
    const channel = supabase
      .channel(`permissions-${workspaceId}-${teamId}`)
      // Listen for phase assignment changes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_phase_assignments',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        () => {
          console.log('[PermissionsProvider] Phase assignment changed, refreshing...')
          loadPermissions()
        }
      )
      // Listen for team membership changes (ONE subscription instead of two)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_members',
          filter: `team_id=eq.${teamId}`,
        },
        () => {
          console.log('[PermissionsProvider] Team membership changed, refreshing...')
          // Both admin status and permissions depend on team membership
          loadPermissions()
          loadAdminStatus()
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[PermissionsProvider] Realtime subscription active')
        }
      })

    return () => {
      console.log('[PermissionsProvider] Cleaning up realtime subscription')
      supabase.removeChannel(channel)
    }
  }, [workspaceId, teamId, supabase, loadPermissions, loadAdminStatus])

  // ──────────────────────────────────────────────────────────────────────────
  // Permission Check Helpers
  // ──────────────────────────────────────────────────────────────────────────

  const canEdit = useCallback(
    (phase: WorkspacePhase): boolean => {
      // Admins can always edit
      if (isAdmin) return true
      if (!permissions) return false
      return permissions[phase]?.can_edit ?? false
    },
    [permissions, isAdmin]
  )

  const canView = useCallback(
    (phase: WorkspacePhase): boolean => {
      if (!permissions) return false
      return permissions[phase]?.can_view ?? false
    },
    [permissions]
  )

  const canDelete = useCallback(
    (phase: WorkspacePhase): boolean => {
      // Admins can always delete
      if (isAdmin) return true
      if (!permissions) return false
      return permissions[phase]?.can_delete ?? false
    },
    [permissions, isAdmin]
  )

  // ──────────────────────────────────────────────────────────────────────────
  // Context Value
  // ──────────────────────────────────────────────────────────────────────────

  const value = useMemo<PermissionsContextValue>(
    () => ({
      permissions,
      canEdit,
      canView,
      canDelete,
      isAdmin,
      role,
      isLoading: isPermissionsLoading || isAdminLoading,
      isPermissionsLoading,
      isAdminLoading,
      error,
      refresh,
      workspaceId,
      teamId,
    }),
    [
      permissions,
      canEdit,
      canView,
      canDelete,
      isAdmin,
      role,
      isPermissionsLoading,
      isAdminLoading,
      error,
      refresh,
      workspaceId,
      teamId,
    ]
  )

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  )
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Main hook to access all permission data
 *
 * @throws Error if used outside PermissionsProvider
 */
export function usePermissions(): PermissionsContextValue {
  const context = useContext(PermissionsContext)

  if (!context) {
    throw new Error(
      'usePermissions must be used within a PermissionsProvider. ' +
      'Make sure to wrap your workspace routes with <PermissionsProvider>.'
    )
  }

  return context
}

/**
 * Hook to check if user can edit a specific phase
 * Convenient shorthand for single-phase checks
 */
export function useCanEditPhase(phase: WorkspacePhase): {
  canEdit: boolean
  isLoading: boolean
} {
  const { canEdit, isLoading } = usePermissions()

  return {
    canEdit: canEdit(phase),
    isLoading,
  }
}

/**
 * Hook to check admin status only
 * Useful when you don't need phase permissions
 */
export function useAdminStatus(): {
  isAdmin: boolean
  role: TeamRole | null
  isLoading: boolean
} {
  const { isAdmin, role, isAdminLoading } = usePermissions()

  return {
    isAdmin,
    role,
    isLoading: isAdminLoading,
  }
}

/**
 * Optional hook that returns null if outside provider
 * Useful for components that may or may not be within a workspace context
 */
export function usePermissionsOptional(): PermissionsContextValue | null {
  return useContext(PermissionsContext)
}
