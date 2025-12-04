/**
 * AI Components Index
 *
 * Exports all AI-related UI components for the Agentic Mode system.
 */

// Chat-first interface (NEW)
export { ChatInterface } from './chat-interface'
export type { ChatInterfaceProps } from './chat-interface'

// Tool shortcuts (NEW)
export { ToolShortcutBar, TOOL_CATEGORIES } from './tool-shortcut-bar'
export type { ToolShortcutBarProps, ToolShortcut, ToolCategory } from './tool-shortcut-bar'

// Tool confirmation (NEW)
export { ToolConfirmationCard, CompletedActionCard } from './tool-confirmation-card'
export type {
  ToolConfirmationCardProps,
  ToolConfirmationData,
  CompletedActionCardProps,
  ConfirmationParams,
} from './tool-confirmation-card'

// Legacy agentic panel (kept for backward compatibility)
export { AgenticPanel } from './agentic-panel'
export type { default as AgenticPanelProps } from './agentic-panel'

// Tool preview
export { ToolPreviewCard } from './tool-preview-card'
export type { ToolPreviewData } from './tool-preview-card'

// Approval workflow
export { ApprovalDialog } from './approval-dialog'
export type { PendingAction } from './approval-dialog'

// Action history
export { ActionHistoryList } from './action-history-list'
