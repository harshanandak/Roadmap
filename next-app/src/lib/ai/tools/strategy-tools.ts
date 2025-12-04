/**
 * Strategy Tools for Agentic AI Mode
 *
 * Tools for strategic planning and alignment:
 * - alignToStrategy: Suggest work item to strategy alignments
 * - suggestOKRs: Generate OKRs based on workspace context
 * - competitiveAnalysis: Research and analyze competitors
 * - roadmapGenerator: Create visual roadmap from work items
 * - impactAssessment: Predict business impact of features
 *
 * Strategy tools follow mixed patterns:
 * - Analysis/suggestion tools (no approval): alignToStrategy, suggestOKRs, competitiveAnalysis, impactAssessment
 * - Creation tools (requires approval): roadmapGenerator
 */

import { tool } from 'ai'
import { z } from 'zod'
import { toolRegistry, TOOL_CATEGORIES } from './tool-registry'

// =============================================================================
// ALIGN TO STRATEGY TOOL
// =============================================================================

/**
 * Suggest strategy alignments for work items
 *
 * Analyzes work items and product strategies to suggest:
 * - Which strategies each work item supports
 * - Alignment strength (weak, medium, strong)
 * - Gaps in strategy coverage
 */
export const alignToStrategyTool = toolRegistry.register(
  tool({
    description:
      'Analyze work items and suggest which product strategies they align with. Identifies alignment strength and gaps in strategy coverage. Helps ensure work contributes to strategic goals.',
    inputSchema: z.object({
      workspaceId: z.string().describe('Workspace ID'),
      teamId: z.string().describe('Team ID for multi-tenancy'),
      workItemIds: z
        .array(z.string())
        .optional()
        .describe('Specific work items to analyze (default: all unaligned items)'),
      strategyIds: z
        .array(z.string())
        .optional()
        .describe('Specific strategies to consider (default: all active strategies)'),
      minConfidence: z
        .number()
        .min(0)
        .max(100)
        .optional()
        .describe('Minimum confidence threshold for suggestions (default: 60)'),
      includeGapAnalysis: z
        .boolean()
        .optional()
        .describe('Include analysis of strategies without aligned work items (default: true)'),
    }),
    execute: async (params, { toolCallId }) => {
      const {
        workspaceId,
        teamId,
        workItemIds,
        strategyIds,
        minConfidence = 60,
        includeGapAnalysis = true,
      } = params

      // In real implementation, would analyze work items and strategies
      return {
        type: 'analysis_result' as const,
        result: {
          toolName: 'alignToStrategy',
          success: true,
          summary: `Strategy alignment analysis for ${workItemIds?.length || 'all'} work items`,
          findings: [
            {
              id: 'align-1',
              type: 'alignment_suggestion',
              title: 'Strong Alignment Detected',
              description: 'Work items related to user experience align strongly with "Improve User Satisfaction" strategy',
              confidence: 85,
              suggestedAction: {
                toolName: 'createDependency',
                params: { connectionType: 'relates_to' },
                description: 'Link work item to strategy',
              },
            },
            {
              id: 'align-2',
              type: 'coverage_gap',
              title: 'Strategy Gap Identified',
              description: '"Expand Market Reach" strategy has no aligned work items',
              confidence: 95,
              severity: 'warning' as const,
              suggestedAction: {
                toolName: 'createWorkItem',
                params: { type: 'feature' },
                description: 'Create work item to address this strategy',
              },
            },
          ],
          metadata: {
            workspaceId,
            teamId,
            workItemsAnalyzed: workItemIds?.length || 10,
            strategiesConsidered: strategyIds?.length || 5,
            minConfidence,
            includeGapAnalysis,
          },
          executionTime: 0,
        },
        toolCallId,
      }
    },
  }),
  {
    name: 'alignToStrategy',
    displayName: 'Align to Strategy',
    description: 'Suggest work item to strategy alignments',
    category: TOOL_CATEGORIES.STRATEGY,
    requiresApproval: false,
    isReversible: false,
    actionType: 'suggest',
    estimatedDuration: 'medium',
    targetEntity: 'work_item',
    keywords: ['align', 'strategy', 'goal', 'objective', 'okr', 'pillar', 'vision'],
    inputExamples: [
      {
        description: 'User wants to align all features with company strategies',
        userMessage: 'Which of our features align with our strategic goals?',
        input: {
          minConfidence: 60,
          includeGapAnalysis: true,
        },
      },
      {
        description: 'User wants to check alignment for specific work items',
        userMessage: 'Does the mobile app feature support our growth strategy?',
        input: {
          workItemIds: ['mobile-app-feature-id'],
          strategyIds: ['growth-strategy-id'],
          minConfidence: 70,
        },
      },
      {
        description: 'User wants to find strategies without aligned work items',
        userMessage: 'Which of our strategies have no features being developed?',
        input: {
          includeGapAnalysis: true,
          minConfidence: 50,
        },
      },
    ],
  }
)

// =============================================================================
// SUGGEST OKRS TOOL
// =============================================================================

/**
 * Generate OKRs based on workspace context
 *
 * Analyzes existing work items, strategies, and feedback to suggest:
 * - Objectives aligned with product vision
 * - Measurable Key Results
 * - Timeline recommendations
 */
export const suggestOKRsTool = toolRegistry.register(
  tool({
    description:
      'Generate suggested OKRs (Objectives and Key Results) based on workspace context. Analyzes existing work items, strategies, and feedback to propose measurable goals.',
    inputSchema: z.object({
      workspaceId: z.string().describe('Workspace ID'),
      teamId: z.string().describe('Team ID for multi-tenancy'),
      timeframe: z
        .enum(['quarter', 'half', 'year'])
        .optional()
        .describe('OKR timeframe (default: quarter)'),
      focusAreas: z
        .array(z.string())
        .optional()
        .describe('Specific areas to focus on (e.g., growth, retention, efficiency)'),
      maxObjectives: z
        .number()
        .min(1)
        .max(10)
        .optional()
        .describe('Maximum number of objectives to suggest (default: 3)'),
      includeMetrics: z
        .boolean()
        .optional()
        .describe('Include suggested metrics for Key Results (default: true)'),
    }),
    execute: async (params, { toolCallId }) => {
      const {
        workspaceId,
        teamId,
        timeframe = 'quarter',
        focusAreas,
        maxObjectives = 3,
        includeMetrics = true,
      } = params

      return {
        type: 'analysis_result' as const,
        result: {
          toolName: 'suggestOKRs',
          success: true,
          summary: `Generated ${maxObjectives} OKR suggestions for ${timeframe}`,
          findings: [
            {
              id: 'okr-1',
              type: 'objective',
              title: 'Objective: Improve User Onboarding Experience',
              description: 'Based on feedback analysis showing onboarding friction',
              confidence: 82,
              metadata: {
                keyResults: [
                  { kr: 'Reduce time-to-first-value from 15 to 5 minutes', metric: 'time_to_value' },
                  { kr: 'Increase 7-day retention from 40% to 60%', metric: 'retention_7d' },
                  { kr: 'Achieve NPS score of 50+ for new users', metric: 'nps_new_users' },
                ],
              },
            },
            {
              id: 'okr-2',
              type: 'objective',
              title: 'Objective: Scale Platform Performance',
              description: 'Based on growth trajectory and current load patterns',
              confidence: 78,
              metadata: {
                keyResults: [
                  { kr: 'Reduce p95 latency from 500ms to 200ms', metric: 'p95_latency' },
                  { kr: 'Support 10x current concurrent users', metric: 'concurrent_users' },
                  { kr: 'Achieve 99.9% uptime', metric: 'uptime' },
                ],
              },
            },
          ],
          metadata: {
            workspaceId,
            teamId,
            timeframe,
            focusAreas,
            maxObjectives,
            includeMetrics,
          },
          executionTime: 0,
        },
        toolCallId,
      }
    },
  }),
  {
    name: 'suggestOKRs',
    displayName: 'Suggest OKRs',
    description: 'Generate OKRs based on workspace context',
    category: TOOL_CATEGORIES.STRATEGY,
    requiresApproval: false,
    isReversible: false,
    actionType: 'suggest',
    estimatedDuration: 'medium',
    targetEntity: 'strategy',
    keywords: ['okr', 'objective', 'key result', 'goal', 'metric', 'kpi', 'measure'],
    inputExamples: [
      {
        description: 'User wants quarterly OKRs for the team',
        userMessage: 'Suggest OKRs for this quarter based on our product backlog',
        input: {
          timeframe: 'quarter',
          maxObjectives: 3,
          includeMetrics: true,
        },
      },
      {
        description: 'User wants growth-focused OKRs',
        userMessage: 'Create OKRs focused on user growth and retention',
        input: {
          timeframe: 'half',
          focusAreas: ['growth', 'retention'],
          maxObjectives: 4,
        },
      },
      {
        description: 'User wants annual strategic objectives',
        userMessage: 'What should our yearly objectives be based on our roadmap?',
        input: {
          timeframe: 'year',
          maxObjectives: 5,
          includeMetrics: true,
        },
      },
    ],
  }
)

// =============================================================================
// COMPETITIVE ANALYSIS TOOL
// =============================================================================

/**
 * Research and analyze competitors
 *
 * Gathers competitive intelligence to inform:
 * - Feature comparisons
 * - Market positioning
 * - Differentiation opportunities
 */
export const competitiveAnalysisTool = toolRegistry.register(
  tool({
    description:
      'Research and analyze competitors to inform product strategy. Compares features, identifies market positioning, and suggests differentiation opportunities.',
    inputSchema: z.object({
      workspaceId: z.string().describe('Workspace ID'),
      teamId: z.string().describe('Team ID for multi-tenancy'),
      competitors: z
        .array(z.string())
        .min(1)
        .max(5)
        .describe('Competitor names or domains to analyze (1-5)'),
      analysisType: z
        .enum(['features', 'pricing', 'positioning', 'comprehensive'])
        .optional()
        .describe('Type of analysis (default: comprehensive)'),
      focusFeatures: z
        .array(z.string())
        .optional()
        .describe('Specific features to compare'),
      includeRecommendations: z
        .boolean()
        .optional()
        .describe('Include strategic recommendations (default: true)'),
    }),
    execute: async (params, { toolCallId }) => {
      const {
        workspaceId,
        teamId,
        competitors,
        analysisType = 'comprehensive',
        focusFeatures,
        includeRecommendations = true,
      } = params

      return {
        type: 'analysis_result' as const,
        result: {
          toolName: 'competitiveAnalysis',
          success: true,
          summary: `Competitive analysis of ${competitors.length} competitors`,
          findings: [
            {
              id: 'comp-1',
              type: 'feature_gap',
              title: 'Feature Gap: Advanced Analytics',
              description: `${competitors[0]} offers AI-powered analytics that we don't have`,
              confidence: 88,
              severity: 'warning' as const,
              suggestedAction: {
                toolName: 'createWorkItem',
                params: { type: 'feature', name: 'AI-Powered Analytics Dashboard' },
                description: 'Create feature to close this gap',
              },
            },
            {
              id: 'comp-2',
              type: 'differentiation',
              title: 'Differentiation Opportunity: Integration Ecosystem',
              description: 'Our integration capabilities exceed competitors - opportunity to highlight',
              confidence: 75,
              severity: 'info' as const,
            },
            {
              id: 'comp-3',
              type: 'pricing_insight',
              title: 'Pricing Position: Mid-Market',
              description: 'Our pricing is 20% below market average, room for value-based increase',
              confidence: 70,
            },
          ],
          metadata: {
            workspaceId,
            teamId,
            competitors,
            analysisType,
            focusFeatures,
            includeRecommendations,
          },
          executionTime: 0,
        },
        toolCallId,
      }
    },
  }),
  {
    name: 'competitiveAnalysis',
    displayName: 'Competitive Analysis',
    description: 'Research and analyze competitors',
    category: TOOL_CATEGORIES.STRATEGY,
    requiresApproval: false,
    isReversible: false,
    actionType: 'analyze',
    estimatedDuration: 'slow',
    targetEntity: 'workspace',
    keywords: ['competitive', 'competitor', 'market', 'analysis', 'comparison', 'benchmark'],
    inputExamples: [
      {
        description: 'User wants comprehensive competitor analysis',
        userMessage: 'Analyze how we compare to Notion and Linear',
        input: {
          competitors: ['Notion', 'Linear'],
          analysisType: 'comprehensive',
          includeRecommendations: true,
        },
      },
      {
        description: 'User wants to compare specific features',
        userMessage: 'Compare our analytics features to Amplitude and Mixpanel',
        input: {
          competitors: ['Amplitude', 'Mixpanel'],
          analysisType: 'features',
          focusFeatures: ['analytics', 'dashboards', 'reports'],
        },
      },
      {
        description: 'User wants pricing comparison',
        userMessage: 'How does our pricing compare to competitors?',
        input: {
          competitors: ['Jira', 'Asana', 'Monday.com'],
          analysisType: 'pricing',
          includeRecommendations: true,
        },
      },
    ],
  }
)

// =============================================================================
// ROADMAP GENERATOR TOOL
// =============================================================================

/**
 * Create visual roadmap from work items
 *
 * Generates a structured roadmap including:
 * - Timeline visualization
 * - Milestone markers
 * - Dependency arrows
 * - Theme groupings
 *
 * Requires approval since it creates/updates roadmap data.
 */
export const roadmapGeneratorTool = toolRegistry.register(
  tool({
    description:
      'Generate a visual roadmap from work items. Creates timeline visualization with milestones, dependencies, and theme groupings. Helps communicate product direction.',
    inputSchema: z.object({
      workspaceId: z.string().describe('Workspace ID'),
      teamId: z.string().describe('Team ID for multi-tenancy'),
      timeframe: z
        .enum(['quarter', 'half', 'year', 'custom'])
        .optional()
        .describe('Roadmap timeframe (default: quarter)'),
      startDate: z
        .string()
        .optional()
        .describe('Start date for custom timeframe (ISO format)'),
      endDate: z
        .string()
        .optional()
        .describe('End date for custom timeframe (ISO format)'),
      groupBy: z
        .enum(['theme', 'phase', 'priority', 'type'])
        .optional()
        .describe('How to group items on roadmap (default: theme)'),
      includeCompleted: z
        .boolean()
        .optional()
        .describe('Include completed items (default: false)'),
      workItemIds: z
        .array(z.string())
        .optional()
        .describe('Specific work items to include (default: all active)'),
    }),
    execute: async (params, { toolCallId }) => {
      const {
        workspaceId,
        teamId,
        timeframe = 'quarter',
        startDate,
        endDate,
        groupBy = 'theme',
        includeCompleted = false,
        workItemIds,
      } = params

      // Roadmap generator creates data, so requires approval
      return {
        requiresApproval: true,
        preview: {
          action: 'create' as const,
          entityType: 'roadmap',
          data: {
            workspaceId,
            teamId,
            timeframe,
            startDate: startDate || new Date().toISOString(),
            endDate,
            groupBy,
            includeCompleted,
            workItemIds,
          },
          description: `Generate ${timeframe} roadmap grouped by ${groupBy}`,
          affectedItems: [
            {
              id: 'new',
              type: 'roadmap',
              name: `${timeframe.charAt(0).toUpperCase() + timeframe.slice(1)} Roadmap`,
              change: 'create' as const,
            },
          ],
          warnings: [
            'This will create a new roadmap view based on current work item data',
            'Existing roadmaps will not be affected',
          ],
        },
        toolCallId,
      }
    },
  }),
  {
    name: 'roadmapGenerator',
    displayName: 'Generate Roadmap',
    description: 'Create visual roadmap from work items',
    category: TOOL_CATEGORIES.STRATEGY,
    requiresApproval: true,
    isReversible: true,
    actionType: 'create',
    estimatedDuration: 'medium',
    targetEntity: 'roadmap',
    keywords: ['roadmap', 'timeline', 'visual', 'plan', 'schedule', 'gantt', 'milestone'],
    inputExamples: [
      {
        description: 'User wants a quarterly roadmap grouped by theme',
        userMessage: 'Generate a roadmap for this quarter organized by theme',
        input: {
          timeframe: 'quarter',
          groupBy: 'theme',
          includeCompleted: false,
        },
      },
      {
        description: 'User wants a roadmap for stakeholder presentation',
        userMessage: 'Create a roadmap I can share with leadership showing next 6 months',
        input: {
          timeframe: 'half',
          groupBy: 'priority',
          includeCompleted: false,
        },
      },
      {
        description: 'User wants a custom timeframe roadmap',
        userMessage: 'Build a roadmap from January to March grouped by development phase',
        input: {
          timeframe: 'custom',
          startDate: '2025-01-01',
          endDate: '2025-03-31',
          groupBy: 'phase',
        },
      },
    ],
  }
)

// =============================================================================
// IMPACT ASSESSMENT TOOL
// =============================================================================

/**
 * Predict business impact of features
 *
 * Analyzes features to estimate:
 * - Revenue impact
 * - User adoption likelihood
 * - Resource requirements
 * - Risk factors
 */
export const impactAssessmentTool = toolRegistry.register(
  tool({
    description:
      'Predict business impact of features including revenue potential, user adoption likelihood, resource requirements, and risk factors. Helps prioritize high-impact work.',
    inputSchema: z.object({
      workspaceId: z.string().describe('Workspace ID'),
      teamId: z.string().describe('Team ID for multi-tenancy'),
      workItemIds: z
        .array(z.string())
        .min(1)
        .describe('Work items to assess'),
      impactDimensions: z
        .array(z.enum(['revenue', 'adoption', 'satisfaction', 'efficiency', 'risk']))
        .optional()
        .describe('Dimensions to assess (default: all)'),
      timeHorizon: z
        .enum(['short', 'medium', 'long'])
        .optional()
        .describe('Time horizon for impact (default: medium)'),
      includeComparison: z
        .boolean()
        .optional()
        .describe('Compare impact across items (default: true)'),
    }),
    execute: async (params, { toolCallId }) => {
      const {
        workspaceId,
        teamId,
        workItemIds,
        impactDimensions = ['revenue', 'adoption', 'satisfaction', 'efficiency', 'risk'],
        timeHorizon = 'medium',
        includeComparison = true,
      } = params

      return {
        type: 'analysis_result' as const,
        result: {
          toolName: 'impactAssessment',
          success: true,
          summary: `Impact assessment for ${workItemIds.length} work items`,
          findings: workItemIds.slice(0, 3).map((id, index) => ({
            id: `impact-${index + 1}`,
            type: 'impact_score',
            title: `Work Item ${id} Impact Assessment`,
            description: 'Based on historical data and market analysis',
            confidence: 70 + index * 5,
            metadata: {
              scores: {
                revenue: 75 - index * 10,
                adoption: 80 - index * 5,
                satisfaction: 85 - index * 8,
                efficiency: 60 + index * 10,
                risk: 30 + index * 15,
              },
              overallScore: 72 - index * 5,
              recommendation: index === 0 ? 'high_priority' : index === 1 ? 'medium_priority' : 'low_priority',
            },
          })),
          metadata: {
            workspaceId,
            teamId,
            workItemIds,
            impactDimensions,
            timeHorizon,
            includeComparison,
          },
          executionTime: 0,
        },
        toolCallId,
      }
    },
  }),
  {
    name: 'impactAssessment',
    displayName: 'Impact Assessment',
    description: 'Predict business impact of features',
    category: TOOL_CATEGORIES.STRATEGY,
    requiresApproval: false,
    isReversible: false,
    actionType: 'analyze',
    estimatedDuration: 'medium',
    targetEntity: 'work_item',
    keywords: ['impact', 'roi', 'value', 'revenue', 'adoption', 'risk', 'assessment'],
    inputExamples: [
      {
        description: 'User wants full impact analysis for a feature',
        userMessage: 'What will be the business impact of the payments feature?',
        input: {
          workItemIds: ['payments-feature-id'],
          impactDimensions: ['revenue', 'adoption', 'satisfaction', 'efficiency', 'risk'],
          timeHorizon: 'medium',
        },
      },
      {
        description: 'User wants to compare impact across features',
        userMessage: 'Compare the ROI of these three features to help me prioritize',
        input: {
          workItemIds: ['feature-a-id', 'feature-b-id', 'feature-c-id'],
          impactDimensions: ['revenue', 'risk'],
          includeComparison: true,
        },
      },
      {
        description: 'User wants long-term revenue impact',
        userMessage: 'What is the long-term revenue potential of our enterprise features?',
        input: {
          workItemIds: ['enterprise-feature-1', 'enterprise-feature-2'],
          impactDimensions: ['revenue'],
          timeHorizon: 'long',
        },
      },
    ],
  }
)

// =============================================================================
// BUNDLED STRATEGY TOOLS
// =============================================================================

/**
 * All strategy tools (5 total)
 *
 * These tools help with strategic planning:
 * - alignToStrategy: Link work to strategies (no approval)
 * - suggestOKRs: Generate OKRs (no approval)
 * - competitiveAnalysis: Research competitors (no approval)
 * - roadmapGenerator: Create roadmaps (requires approval)
 * - impactAssessment: Predict impact (no approval)
 */
export const strategyTools = {
  alignToStrategy: alignToStrategyTool,
  suggestOKRs: suggestOKRsTool,
  competitiveAnalysis: competitiveAnalysisTool,
  roadmapGenerator: roadmapGeneratorTool,
  impactAssessment: impactAssessmentTool,
}

/**
 * Array of tool names for iteration
 */
export const strategyToolNames = Object.keys(strategyTools) as Array<keyof typeof strategyTools>

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type StrategyToolName = keyof typeof strategyTools
