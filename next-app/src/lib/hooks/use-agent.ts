/**
 * useAgent Hook
 *
 * React hook for interacting with the AI Agent system.
 * Handles tool execution, approval workflow, and rollback operations.
 *
 * Features:
 * - Execute tools with automatic approval workflow
 * - Preview tool actions before execution
 * - Approve/reject pending actions
 * - Rollback completed reversible actions
 * - Track execution state and errors
 */

'use client'

import { useState, useCallback } from 'react'

// Types for the agent system
export interface AgentContext {
  workspaceId: string
  teamId: string
}

export interface ToolPreview {
  toolName: string
  displayName: string
  category: string
  requiresApproval: boolean
  isReversible: boolean
  preview: {
    action: 'create' | 'update' | 'delete' | 'analyze'
    entityType: string
    data: Record<string, unknown>
    description: string
    affectedItems?: Array<{ id: string; name: string; type: string }>
    warnings?: string[]
  }
}

export interface ExecutionResult {
  success: boolean
  actionId: string
  status: 'pending' | 'completed' | 'failed'
  result?: unknown
  error?: string
  requiresApproval?: boolean
}

export interface ApprovalResult {
  success: boolean
  actionId: string
  status: 'completed' | 'failed'
  result?: unknown
  error?: string
}

export interface BatchApprovalResult {
  approved: string[]
  failed: Array<{ id: string; error: string }>
  totalApproved: number
  totalFailed: number
}

export interface RollbackResult {
  success: boolean
  actionId: string
  message?: string
  error?: string
}

export interface UseAgentState {
  isExecuting: boolean
  isPreviewing: boolean
  isApproving: boolean
  isRollingBack: boolean
  currentPreview: ToolPreview | null
  pendingActionId: string | null
  lastResult: ExecutionResult | null
  error: string | null
}

export interface UseAgentReturn extends UseAgentState {
  // Core operations
  preview: (toolName: string, params: Record<string, unknown>) => Promise<ToolPreview | null>
  execute: (toolName: string, params: Record<string, unknown>) => Promise<ExecutionResult | null>

  // Approval operations
  approve: (actionId: string) => Promise<ApprovalResult | null>
  approveAll: (actionIds: string[]) => Promise<BatchApprovalResult | null>
  reject: (actionId: string, reason?: string) => Promise<boolean>

  // Rollback operations
  rollback: (actionId: string, reason?: string) => Promise<RollbackResult | null>

  // State management
  clearError: () => void
  clearPreview: () => void
  reset: () => void
}

const initialState: UseAgentState = {
  isExecuting: false,
  isPreviewing: false,
  isApproving: false,
  isRollingBack: false,
  currentPreview: null,
  pendingActionId: null,
  lastResult: null,
  error: null,
}

/**
 * Hook for interacting with the AI Agent system
 *
 * @param context - Workspace and team context for multi-tenancy
 * @returns Agent operations and state
 *
 * @example
 * ```tsx
 * const agent = useAgent({ workspaceId: '123', teamId: '456' })
 *
 * // Preview before executing
 * const preview = await agent.preview('createWorkItem', { name: 'New Feature' })
 *
 * // Execute the tool
 * const result = await agent.execute('createWorkItem', { name: 'New Feature' })
 *
 * // If requires approval, approve it
 * if (result?.requiresApproval && result.actionId) {
 *   await agent.approve(result.actionId)
 * }
 *
 * // Rollback if needed
 * await agent.rollback(result.actionId, 'Created by mistake')
 * ```
 */
export function useAgent(context: AgentContext): UseAgentReturn {
  const [state, setState] = useState<UseAgentState>(initialState)

  /**
   * Get a preview of what a tool will do without executing
   */
  const preview = useCallback(
    async (toolName: string, params: Record<string, unknown>): Promise<ToolPreview | null> => {
      setState(prev => ({ ...prev, isPreviewing: true, error: null }))

      try {
        const response = await fetch('/api/ai/agent/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            toolName,
            params,
            workspaceId: context.workspaceId,
            teamId: context.teamId,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to get preview')
        }

        const previewData: ToolPreview = await response.json()
        setState(prev => ({
          ...prev,
          isPreviewing: false,
          currentPreview: previewData,
        }))

        return previewData
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Preview failed'
        setState(prev => ({
          ...prev,
          isPreviewing: false,
          error: errorMessage,
        }))
        return null
      }
    },
    [context.workspaceId, context.teamId]
  )

  /**
   * Execute a tool with the approval workflow
   */
  const execute = useCallback(
    async (toolName: string, params: Record<string, unknown>): Promise<ExecutionResult | null> => {
      setState(prev => ({ ...prev, isExecuting: true, error: null }))

      try {
        const response = await fetch('/api/ai/agent/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            toolName,
            params,
            workspaceId: context.workspaceId,
            teamId: context.teamId,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Execution failed')
        }

        const result: ExecutionResult = await response.json()
        setState(prev => ({
          ...prev,
          isExecuting: false,
          lastResult: result,
          pendingActionId: result.requiresApproval ? result.actionId : null,
        }))

        return result
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Execution failed'
        setState(prev => ({
          ...prev,
          isExecuting: false,
          error: errorMessage,
        }))
        return null
      }
    },
    [context.workspaceId, context.teamId]
  )

  /**
   * Approve a single pending action
   */
  const approve = useCallback(
    async (actionId: string): Promise<ApprovalResult | null> => {
      setState(prev => ({ ...prev, isApproving: true, error: null }))

      try {
        const response = await fetch('/api/ai/agent/approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ actionId }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Approval failed')
        }

        const result: ApprovalResult = await response.json()
        setState(prev => ({
          ...prev,
          isApproving: false,
          lastResult: {
            success: result.success,
            actionId: result.actionId,
            status: result.status,
            result: result.result,
            error: result.error,
          },
          pendingActionId: null,
        }))

        return result
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Approval failed'
        setState(prev => ({
          ...prev,
          isApproving: false,
          error: errorMessage,
        }))
        return null
      }
    },
    []
  )

  /**
   * Approve multiple pending actions in batch
   */
  const approveAll = useCallback(
    async (actionIds: string[]): Promise<BatchApprovalResult | null> => {
      setState(prev => ({ ...prev, isApproving: true, error: null }))

      try {
        const response = await fetch('/api/ai/agent/approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ actionIds }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Batch approval failed')
        }

        const result: BatchApprovalResult = await response.json()
        setState(prev => ({
          ...prev,
          isApproving: false,
          pendingActionId: null,
        }))

        return result
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Batch approval failed'
        setState(prev => ({
          ...prev,
          isApproving: false,
          error: errorMessage,
        }))
        return null
      }
    },
    []
  )

  /**
   * Reject (cancel) a pending action
   */
  const reject = useCallback(
    async (actionId: string, reason?: string): Promise<boolean> => {
      setState(prev => ({ ...prev, isApproving: true, error: null }))

      try {
        // Use the execute endpoint with cancel action
        // For now, we'll update the status directly
        // In production, this would be a dedicated cancel endpoint
        const response = await fetch('/api/ai/agent/history', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            actionId,
            status: 'cancelled',
            reason,
          }),
        })

        // Note: If PATCH is not implemented, this may return 405
        // The UI should handle this gracefully
        const success = response.ok
        setState(prev => ({
          ...prev,
          isApproving: false,
          pendingActionId: null,
        }))

        return success
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Rejection failed'
        setState(prev => ({
          ...prev,
          isApproving: false,
          error: errorMessage,
        }))
        return false
      }
    },
    []
  )

  /**
   * Rollback a completed reversible action
   */
  const rollback = useCallback(
    async (actionId: string, reason?: string): Promise<RollbackResult | null> => {
      setState(prev => ({ ...prev, isRollingBack: true, error: null }))

      try {
        const response = await fetch('/api/ai/agent/rollback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ actionId, reason }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Rollback failed')
        }

        const result: RollbackResult = await response.json()
        setState(prev => ({
          ...prev,
          isRollingBack: false,
        }))

        return result
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Rollback failed'
        setState(prev => ({
          ...prev,
          isRollingBack: false,
          error: errorMessage,
        }))
        return null
      }
    },
    []
  )

  /**
   * Clear the current error
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  /**
   * Clear the current preview
   */
  const clearPreview = useCallback(() => {
    setState(prev => ({ ...prev, currentPreview: null }))
  }, [])

  /**
   * Reset all state to initial values
   */
  const reset = useCallback(() => {
    setState(initialState)
  }, [])

  return {
    ...state,
    preview,
    execute,
    approve,
    approveAll,
    reject,
    rollback,
    clearError,
    clearPreview,
    reset,
  }
}

export default useAgent
