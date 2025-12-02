'use client'

/**
 * Keyboard Shortcuts Hook for Insight Triage
 *
 * Enables fast keyboard-driven insight review workflow.
 * Pattern follows use-work-board-shortcuts.ts for consistency.
 */

import { useEffect, useCallback } from 'react'
import type { InsightStatus } from '@/lib/types/customer-insight'

interface UseInsightShortcutsOptions {
  /** Currently selected insight ID */
  selectedId: string | null
  /** List of insight IDs for navigation */
  insightIds: string[]
  /** Callback when selection changes */
  onSelect: (id: string | null) => void
  /** Callback to update insight status */
  onStatusChange?: (id: string, status: InsightStatus) => void
  /** Callback to open detail sheet */
  onOpenDetail?: (id: string) => void
  /** Callback to link insight to work item */
  onLink?: (id: string) => void
  /** Callback to show help dialog */
  onShowHelp?: () => void
  /** Search input ref for focus */
  searchInputRef?: React.RefObject<HTMLInputElement | null>
  /** Whether shortcuts are enabled */
  enabled?: boolean
}

/**
 * Hook for insight triage keyboard shortcuts
 *
 * Shortcuts:
 * - j / ↓: Navigate down
 * - k / ↑: Navigate up
 * - R: Mark as Reviewed
 * - A: Mark as Actionable
 * - D: Archive
 * - L: Link to Work Item
 * - Enter: Open detail sheet
 * - /: Focus search
 * - ?: Show help
 * - Escape: Close sheet / Deselect
 */
export function useInsightShortcuts({
  selectedId,
  insightIds,
  onSelect,
  onStatusChange,
  onOpenDetail,
  onLink,
  onShowHelp,
  searchInputRef,
  enabled = true,
}: UseInsightShortcutsOptions) {
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
        event.preventDefault()
        onSelect(null)
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

      const currentIndex = selectedId ? insightIds.indexOf(selectedId) : -1

      switch (event.key) {
        // Navigation: j/k or arrow keys
        case 'j':
        case 'ArrowDown':
          event.preventDefault()
          if (insightIds.length > 0) {
            const nextIndex = currentIndex < insightIds.length - 1 ? currentIndex + 1 : 0
            onSelect(insightIds[nextIndex])
          }
          break

        case 'k':
        case 'ArrowUp':
          event.preventDefault()
          if (insightIds.length > 0) {
            const prevIndex = currentIndex > 0 ? currentIndex - 1 : insightIds.length - 1
            onSelect(insightIds[prevIndex])
          }
          break

        // Enter: Open detail sheet
        case 'Enter':
          event.preventDefault()
          if (selectedId && onOpenDetail) {
            onOpenDetail(selectedId)
          }
          break

        // R: Mark as Reviewed
        case 'r':
        case 'R':
          event.preventDefault()
          if (selectedId && onStatusChange) {
            onStatusChange(selectedId, 'reviewed')
          }
          break

        // A: Mark as Actionable
        case 'a':
        case 'A':
          event.preventDefault()
          if (selectedId && onStatusChange) {
            onStatusChange(selectedId, 'actionable')
          }
          break

        // D: Archive
        case 'd':
        case 'D':
          event.preventDefault()
          if (selectedId && onStatusChange) {
            onStatusChange(selectedId, 'archived')
          }
          break

        // L: Link to Work Item
        case 'l':
        case 'L':
          event.preventDefault()
          if (selectedId && onLink) {
            onLink(selectedId)
          }
          break

        // /: Focus search
        case '/':
          event.preventDefault()
          if (searchInputRef?.current) {
            searchInputRef.current.focus()
            searchInputRef.current.select()
          }
          break

        // ?: Show help
        case '?':
          if (event.shiftKey || event.key === '?') {
            event.preventDefault()
            onShowHelp?.()
          }
          break
      }
    },
    [selectedId, insightIds, onSelect, onStatusChange, onOpenDetail, onLink, onShowHelp, searchInputRef]
  )

  useEffect(() => {
    if (!enabled) return

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown, enabled])
}

// Keyboard shortcuts configuration for display in help dialog
export const INSIGHT_KEYBOARD_SHORTCUTS = [
  { key: 'j / ↓', description: 'Navigate to next insight', scope: 'Navigation' },
  { key: 'k / ↑', description: 'Navigate to previous insight', scope: 'Navigation' },
  { key: 'Enter', description: 'Open detail sheet', scope: 'Action' },
  { key: 'R', description: 'Mark as Reviewed', scope: 'Status' },
  { key: 'A', description: 'Mark as Actionable', scope: 'Status' },
  { key: 'D', description: 'Archive insight', scope: 'Status' },
  { key: 'L', description: 'Link to Work Item', scope: 'Action' },
  { key: '/', description: 'Focus search', scope: 'Global' },
  { key: '?', description: 'Show keyboard shortcuts', scope: 'Global' },
  { key: 'Escape', description: 'Close sheet / Deselect', scope: 'Global' },
] as const

// Type for shortcut display
export type InsightShortcut = (typeof INSIGHT_KEYBOARD_SHORTCUTS)[number]
