'use client'

import { useEffect, useCallback, useRef } from 'react'
import { useWorkBoardContext } from '../shared/filter-context'

interface UseWorkBoardShortcutsOptions {
  onCreateTask?: () => void
  onCreateWorkItem?: () => void
  onShowHelp?: () => void
  searchInputRef?: React.RefObject<HTMLInputElement | null>
  enabled?: boolean
}

/**
 * Custom hook for Work Board keyboard shortcuts
 *
 * Shortcuts:
 * - N: Create new item (Task or Work Item based on active tab)
 * - /: Focus search input
 * - ?: Show keyboard shortcuts help
 * - Escape: Clear filters / Close dialogs
 */
export function useWorkBoardShortcuts({
  onCreateTask,
  onCreateWorkItem,
  onShowHelp,
  searchInputRef,
  enabled = true,
}: UseWorkBoardShortcutsOptions) {
  const { primaryTab, clearFilters, hasActiveFilters } = useWorkBoardContext()

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs, textareas, or contenteditable
      const target = event.target as HTMLElement
      const isInputElement =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.getAttribute('role') === 'textbox'

      // Allow Escape to work even in inputs
      if (event.key === 'Escape') {
        if (hasActiveFilters) {
          event.preventDefault()
          clearFilters()
        }
        // Also blur the active element
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur()
        }
        return
      }

      // Skip other shortcuts if in input
      if (isInputElement) return

      // Check for modifier keys - most shortcuts shouldn't work with modifiers
      if (event.ctrlKey || event.metaKey || event.altKey) return

      switch (event.key.toLowerCase()) {
        case 'n':
          event.preventDefault()
          if (primaryTab === 'tasks') {
            onCreateTask?.()
          } else {
            onCreateWorkItem?.()
          }
          break

        case '/':
          event.preventDefault()
          if (searchInputRef?.current) {
            searchInputRef.current.focus()
            searchInputRef.current.select()
          }
          break

        case '?':
          // Shift+/ = ?
          if (event.shiftKey || event.key === '?') {
            event.preventDefault()
            onShowHelp?.()
          }
          break
      }
    },
    [primaryTab, onCreateTask, onCreateWorkItem, onShowHelp, searchInputRef, clearFilters, hasActiveFilters]
  )

  useEffect(() => {
    if (!enabled) return

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown, enabled])
}

// Keyboard shortcuts configuration for display
export const KEYBOARD_SHORTCUTS = [
  { key: 'N', description: 'Create new item', scope: 'Tab-aware' },
  { key: '/', description: 'Focus search', scope: 'Global' },
  { key: '?', description: 'Show keyboard shortcuts', scope: 'Global' },
  { key: 'Escape', description: 'Clear filters / Close dialog', scope: 'Global' },
] as const
