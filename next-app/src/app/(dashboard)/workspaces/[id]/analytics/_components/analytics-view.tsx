'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  FeatureOverviewDashboard,
  DependencyHealthDashboard,
  TeamPerformanceDashboard,
  StrategyAlignmentDashboard,
} from '@/components/analytics/dashboards'
import { DashboardBuilder } from '@/components/analytics/widgets'
import {
  LayoutGrid,
  GitBranch,
  Users,
  Target,
  Download,
  Building2,
  FolderKanban,
  Sparkles,
} from 'lucide-react'
import type { AnalyticsScope, DashboardType } from '@/lib/types/analytics'
import { DASHBOARD_CONFIGS } from '@/lib/types/analytics'
import { exportToCSV, getExportFilename } from '@/lib/analytics/export'
import { useToast } from '@/hooks/use-toast'

interface AnalyticsViewProps {
  workspaceId: string
  teamId: string
  workspaceName: string
  isPro?: boolean // Pass from parent based on team subscription
}

// Extended tab type to include custom dashboard
type DashboardTab = DashboardType | 'custom'

const DASHBOARD_ICONS: Record<DashboardType, React.ReactNode> = {
  'feature-overview': <LayoutGrid className="h-4 w-4" />,
  'dependency-health': <GitBranch className="h-4 w-4" />,
  'team-performance': <Users className="h-4 w-4" />,
  'strategy-alignment': <Target className="h-4 w-4" />,
}

export function AnalyticsView({ workspaceId, teamId, workspaceName, isPro = false }: AnalyticsViewProps) {
  const [activeDashboard, setActiveDashboard] = useState<DashboardTab>('feature-overview')
  const [scope, setScope] = useState<AnalyticsScope>('workspace')
  const [isExporting, setIsExporting] = useState(false)
  const { toast } = useToast()

  const handleExport = async () => {
    if (activeDashboard === 'custom') {
      toast({
        title: 'Export not available',
        description: 'Custom dashboard export is coming soon.',
        variant: 'default',
      })
      return
    }

    setIsExporting(true)
    try {
      // Fetch dashboard data based on active dashboard
      const apiPath = {
        'feature-overview': 'overview',
        'dependency-health': 'dependencies',
        'team-performance': 'performance',
        'strategy-alignment': 'alignment',
      }[activeDashboard]

      const params = new URLSearchParams({
        workspace_id: workspaceId,
        team_id: teamId,
        scope,
      })

      const response = await fetch(`/api/analytics/${apiPath}?${params}`)
      if (!response.ok) throw new Error('Failed to fetch data')

      const result = await response.json()
      const dashboardName = DASHBOARD_CONFIGS[activeDashboard as DashboardType]?.label || 'Dashboard'

      // Flatten data for CSV export
      const exportData: Record<string, unknown>[] = []

      // Add summary metrics
      if (result.data) {
        const summary: Record<string, unknown> = { section: 'Summary' }
        Object.entries(result.data).forEach(([key, value]) => {
          if (typeof value === 'number' || typeof value === 'string') {
            summary[key] = value
          }
        })
        if (Object.keys(summary).length > 1) {
          exportData.push(summary)
        }

        // Add chart data sections
        Object.entries(result.data).forEach(([key, value]) => {
          if (Array.isArray(value) && value.length > 0) {
            value.forEach((item, index) => {
              exportData.push({
                section: key,
                index: index + 1,
                ...(typeof item === 'object' ? item : { value: item }),
              })
            })
          }
        })
      }

      if (exportData.length === 0) {
        toast({
          title: 'No data to export',
          description: 'The dashboard has no data to export.',
          variant: 'default',
        })
        return
      }

      const filename = getExportFilename(`${dashboardName.toLowerCase().replace(/\s+/g, '-')}-${scope}`)
      exportToCSV(exportData, filename)

      toast({
        title: 'Export successful',
        description: `${dashboardName} data exported as ${filename}.csv`,
      })
    } catch (error) {
      console.error('Export error:', error)
      toast({
        title: 'Export failed',
        description: 'There was an error exporting the data. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleSaveCustomDashboard = async () => {
    // Save custom dashboard to database
    // Will be implemented when custom_dashboards table is created
    toast({
      title: 'Dashboard saved',
      description: 'Your custom dashboard configuration has been saved.',
    })
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            {scope === 'workspace'
              ? `Insights for ${workspaceName}`
              : 'Team-wide insights across all workspaces'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Scope Toggle */}
          <Select value={scope} onValueChange={(value) => setScope(value as AnalyticsScope)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="workspace">
                <div className="flex items-center gap-2">
                  <FolderKanban className="h-4 w-4" />
                  <span>This Workspace</span>
                </div>
              </SelectItem>
              <SelectItem value="team">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <span>All Workspaces</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Export Button */}
          <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting}>
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        </div>
      </div>

      {/* Dashboard Tabs */}
      <Tabs
        value={activeDashboard}
        onValueChange={(value) => setActiveDashboard(value as DashboardTab)}
        className="space-y-6"
      >
        <TabsList className="grid grid-cols-2 lg:grid-cols-5 w-full lg:w-auto">
          {(Object.keys(DASHBOARD_CONFIGS) as DashboardType[]).map((type) => (
            <TabsTrigger key={type} value={type} className="flex items-center gap-2">
              {DASHBOARD_ICONS[type]}
              <span className="hidden sm:inline">{DASHBOARD_CONFIGS[type].label}</span>
            </TabsTrigger>
          ))}
          <TabsTrigger value="custom" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Custom</span>
            {!isPro && (
              <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">
                Pro
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="feature-overview" className="mt-6">
          <FeatureOverviewDashboard
            workspaceId={workspaceId}
            teamId={teamId}
            scope={scope}
          />
        </TabsContent>

        <TabsContent value="dependency-health" className="mt-6">
          <DependencyHealthDashboard
            workspaceId={workspaceId}
            teamId={teamId}
            scope={scope}
          />
        </TabsContent>

        <TabsContent value="team-performance" className="mt-6">
          <TeamPerformanceDashboard
            workspaceId={workspaceId}
            teamId={teamId}
            scope={scope}
          />
        </TabsContent>

        <TabsContent value="strategy-alignment" className="mt-6">
          <StrategyAlignmentDashboard
            workspaceId={workspaceId}
            teamId={teamId}
            scope={scope}
          />
        </TabsContent>

        <TabsContent value="custom" className="mt-6">
          <DashboardBuilder
            workspaceId={workspaceId}
            teamId={teamId}
            isPro={isPro}
            onSave={handleSaveCustomDashboard}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
