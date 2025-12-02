/**
 * Customer Insights Components
 *
 * Voice-of-customer insights with voting, linking, and feedback integration
 */

// Card components
export { InsightCard, InsightItem } from './insight-card'

// Vote components
export { InsightVoteButton, InsightVoteGroup } from './insight-vote-button'

// List component
export { InsightList } from './insight-list'

// Form dialog
export { InsightFormDialog } from './insight-form'

// Link dialog
export { InsightLinkDialog } from './insight-link-dialog'

// Feedback conversion dialog
export { ConvertFeedbackToInsightDialog } from './convert-feedback-to-insight-dialog'

// Dashboard components (Phase 2)
export { InsightsDashboard } from './insights-dashboard'
export { InsightsDashboardStats, type InsightStats } from './insights-dashboard-stats'
export { InsightDetailSheet } from './insight-detail-sheet'

// Triage queue (Phase 2)
export { InsightTriageQueue } from './insight-triage-queue'

// Hooks
export {
  useInsightShortcuts,
  INSIGHT_KEYBOARD_SHORTCUTS,
  type InsightShortcut,
} from './hooks/use-insight-shortcuts'

// Public voting (Phase 2)
export { PublicVoteCard } from './public-vote-card'
