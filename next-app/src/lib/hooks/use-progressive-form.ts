/**
 * useProgressiveForm Hook
 *
 * Manages progressive disclosure state for forms:
 * - Tracks which field groups are expanded
 * - Persists user preferences to localStorage
 * - Provides mode-aware field visibility
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { WorkspaceMode } from '@/lib/types/workspace-mode'
import {
  getModeEssentialFields,
  getModeExpandedFields,
  WorkItemField,
} from '@/lib/workspace-modes/mode-config'

// ============================================================================
// TYPES
// ============================================================================

export interface ProgressiveFormConfig {
  /** Unique identifier for this form (used for preference storage) */
  formId: string
  /** Current workspace mode (affects field defaults) */
  mode?: WorkspaceMode
  /** User ID (used for preference storage) */
  userId?: string
  /** Whether to persist expanded state to localStorage */
  persistPreference?: boolean
  /** Initial expanded state (overrides persisted preference) */
  initialExpanded?: boolean
}

export interface UseProgressiveFormReturn {
  /** Whether the "more" section is expanded */
  isExpanded: boolean
  /** Toggle the expanded state */
  toggleExpanded: () => void
  /** Set expanded state directly */
  setExpanded: (expanded: boolean) => void
  /** Check if a field should be visible (based on mode and expanded state) */
  isFieldVisible: (field: WorkItemField) => boolean
  /** Check if a field is essential (always visible) */
  isFieldEssential: (field: WorkItemField) => boolean
  /** Get all essential fields for current mode */
  essentialFields: WorkItemField[]
  /** Get all expanded fields for current mode */
  expandedFields: WorkItemField[]
  /** Count of expanded fields (for "Show N more" label) */
  expandedFieldCount: number
  /** Clear saved preference */
  clearPreference: () => void
}

// ============================================================================
// STORAGE
// ============================================================================

const STORAGE_KEY_PREFIX = 'progressive_form_expanded_'

function getStorageKey(formId: string, userId?: string): string {
  return `${STORAGE_KEY_PREFIX}${formId}${userId ? `_${userId}` : ''}`
}

function loadPreference(formId: string, userId?: string): boolean | null {
  if (typeof window === 'undefined') return null

  try {
    const key = getStorageKey(formId, userId)
    const stored = localStorage.getItem(key)
    if (stored === null) return null
    return stored === 'true'
  } catch {
    return null
  }
}

function savePreference(formId: string, userId: string | undefined, expanded: boolean): void {
  if (typeof window === 'undefined') return

  try {
    const key = getStorageKey(formId, userId)
    localStorage.setItem(key, String(expanded))
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

function clearPreference(formId: string, userId?: string): void {
  if (typeof window === 'undefined') return

  try {
    const key = getStorageKey(formId, userId)
    localStorage.removeItem(key)
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook for managing progressive disclosure in forms
 *
 * @example
 * ```tsx
 * const {
 *   isExpanded,
 *   toggleExpanded,
 *   isFieldVisible,
 *   expandedFieldCount,
 * } = useProgressiveForm({
 *   formId: 'create-work-item',
 *   mode: workspace.mode,
 *   userId: user.id,
 * })
 *
 * return (
 *   <form>
 *     <NameField />
 *     {isFieldVisible('priority') && <PriorityField />}
 *
 *     <Button onClick={toggleExpanded}>
 *       {isExpanded ? 'Show less' : `Show ${expandedFieldCount} more`}
 *     </Button>
 *
 *     {isExpanded && (
 *       <>
 *         <DepartmentField />
 *         <TagsField />
 *       </>
 *     )}
 *   </form>
 * )
 * ```
 */
export function useProgressiveForm({
  formId,
  mode = 'development',
  userId,
  persistPreference = true,
  initialExpanded,
}: ProgressiveFormConfig): UseProgressiveFormReturn {
  // Load initial state from preference or default to false (collapsed)
  const [isExpanded, setIsExpandedState] = useState<boolean>(() => {
    // If initialExpanded is explicitly set, use it
    if (initialExpanded !== undefined) {
      return initialExpanded
    }

    // Otherwise, try to load from localStorage
    if (persistPreference) {
      const stored = loadPreference(formId, userId)
      if (stored !== null) {
        return stored
      }
    }

    // Default to collapsed
    return false
  })

  // Get fields for current mode
  const essentialFields = useMemo(() => getModeEssentialFields(mode), [mode])
  const expandedFields = useMemo(() => getModeExpandedFields(mode), [mode])

  // Set expanded state and persist if enabled
  const setExpanded = useCallback(
    (expanded: boolean) => {
      setIsExpandedState(expanded)
      if (persistPreference) {
        savePreference(formId, userId, expanded)
      }
    },
    [formId, userId, persistPreference]
  )

  // Toggle expanded state
  const toggleExpanded = useCallback(() => {
    setExpanded(!isExpanded)
  }, [isExpanded, setExpanded])

  // Check if a field is essential (always visible)
  const isFieldEssential = useCallback(
    (field: WorkItemField): boolean => {
      return essentialFields.includes(field)
    },
    [essentialFields]
  )

  // Check if a field should be visible based on mode and expanded state
  const isFieldVisible = useCallback(
    (field: WorkItemField): boolean => {
      // Essential fields are always visible
      if (essentialFields.includes(field)) {
        return true
      }

      // Expanded fields are visible only when expanded
      if (expandedFields.includes(field)) {
        return isExpanded
      }

      // Fields not in either list are not visible
      return false
    },
    [essentialFields, expandedFields, isExpanded]
  )

  // Clear stored preference
  const handleClearPreference = useCallback(() => {
    clearPreference(formId, userId)
    setIsExpandedState(false)
  }, [formId, userId])

  // Sync with localStorage when formId or userId changes
  useEffect(() => {
    if (persistPreference && initialExpanded === undefined) {
      const stored = loadPreference(formId, userId)
      if (stored !== null) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional localStorage sync
        setIsExpandedState(stored)
      }
    }
  }, [formId, userId, persistPreference, initialExpanded])

  return {
    isExpanded,
    toggleExpanded,
    setExpanded,
    isFieldVisible,
    isFieldEssential,
    essentialFields,
    expandedFields,
    expandedFieldCount: expandedFields.length,
    clearPreference: handleClearPreference,
  }
}

export default useProgressiveForm
