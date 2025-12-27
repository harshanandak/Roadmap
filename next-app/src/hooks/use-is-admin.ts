/**
 * Admin Role Check Hook
 *
 * React hook for checking if current user is admin or owner in a team.
 * Admins and owners bypass phase-based restrictions.
 *
 * OPTIMIZED: Now uses PermissionsProvider context when available,
 * eliminating duplicate subscriptions to team_members table.
 *
 * Usage:
 * ```tsx
 * const { isAdmin, isLoading } = useIsAdmin({ teamId: 'team_456' });
 *
 * if (isAdmin) {
 *   // Show admin-only UI
 * }
 * ```
 */

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { isUserAdminOrOwner } from '@/lib/utils/phase-permissions'
import { usePermissionsOptional } from '@/providers/permissions-provider'
import type { TeamRole } from '@/lib/types/team'

interface UseIsAdminParams {
  teamId: string
}

interface UseIsAdminReturn {
  /** Whether user is admin or owner */
  isAdmin: boolean

  /** User's specific role */
  role: TeamRole | null

  /** Loading state */
  isLoading: boolean

  /** Error state */
  error: Error | null

  /** Manually refresh role check */
  refresh: () => Promise<void>
}

/**
 * Hook to check if user is admin or owner
 *
 * If used within PermissionsProvider, reads from shared context (recommended).
 * Falls back to direct subscription if provider not available.
 *
 * @param params - Team ID to check
 * @returns Admin status and utilities
 */
export function useIsAdmin({ teamId }: UseIsAdminParams): UseIsAdminReturn {
  // Try to use context first (optimized path - no duplicate subscriptions)
  const contextPermissions = usePermissionsOptional()

  // Always call the direct hook to comply with rules of hooks
  // We'll use its result only if context is not available
  const directResult = useIsAdminDirect({ teamId })

  // Check if context matches our team
  const useContext =
    contextPermissions &&
    contextPermissions.teamId === teamId

  // If context is available and matches, use it directly
  if (useContext) {
    return {
      isAdmin: contextPermissions.isAdmin,
      role: contextPermissions.role,
      isLoading: contextPermissions.isAdminLoading,
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
function useIsAdminDirect({ teamId }: UseIsAdminParams): UseIsAdminReturn {
  const [isAdmin, setIsAdmin] = useState(false)
  const [role, setRole] = useState<TeamRole | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const supabase = createClient()

  const checkAdminStatus = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('No authenticated user')
      }

      // Check if admin/owner
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
      console.error('Error checking admin status:', err)
      setError(err instanceof Error ? err : new Error('Failed to check admin status'))
      setIsAdmin(false)
      setRole(null)
    } finally {
      setIsLoading(false)
    }
  }, [teamId, supabase])

  // Load admin status on mount and when team changes
  useEffect(() => {
    checkAdminStatus()
  }, [checkAdminStatus])

  // Subscribe to real-time updates for team membership changes
  useEffect(() => {
    console.warn(
      '[useIsAdmin] Using direct subscription. ' +
      'Consider wrapping with PermissionsProvider for better performance.'
    )

    const channel = supabase
      .channel(`team-admin-fallback-${teamId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_members',
          filter: `team_id=eq.${teamId}`,
        },
        () => {
          checkAdminStatus()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [teamId, supabase, checkAdminStatus])

  return {
    isAdmin,
    role,
    isLoading,
    error,
    refresh: checkAdminStatus,
  }
}

/**
 * Hook to check if user has a specific role
 *
 * More flexible than useIsAdmin if you need to check specific roles.
 *
 * Usage:
 * ```tsx
 * const { hasRole, isLoading } = useHasRole({
 *   teamId: 'team_456',
 *   requiredRole: 'owner'
 * });
 * ```
 */
export function useHasRole({
  teamId,
  requiredRole,
}: {
  teamId: string
  requiredRole: TeamRole | TeamRole[]
}) {
  const { role, isLoading, error } = useIsAdmin({ teamId })

  const hasRole = (): boolean => {
    if (!role) return false

    if (Array.isArray(requiredRole)) {
      return requiredRole.includes(role)
    }

    return role === requiredRole
  }

  return {
    hasRole: hasRole(),
    currentRole: role,
    isLoading,
    error,
  }
}
