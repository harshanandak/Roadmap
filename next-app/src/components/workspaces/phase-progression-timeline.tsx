'use client'

import Link from 'next/link'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Circle, Settings } from 'lucide-react'
import { PHASE_CONFIG, PHASE_ORDER, migratePhase } from '@/lib/constants/workspace-phases'

/**
 * Phase configuration for timeline display
 * Updated 2025-12-13: Migrated to 4-phase system
 * - design (was research/planning)
 * - build (was execution)
 * - refine (was review)
 * - launch (was complete)
 */
const PHASES = PHASE_ORDER.map(phase => ({
  value: phase,
  label: PHASE_CONFIG[phase].name,
  description: PHASE_CONFIG[phase].tagline,
  color: PHASE_CONFIG[phase].bgColor,
  icon: PHASE_CONFIG[phase].emoji,
}))

interface PhaseProgressionTimelineProps {
  currentPhase: string
  workspaceId: string
  completionPercentage: number
}

/**
 * Phase progression timeline component
 * Shows the current phase in the 4-phase lifecycle with visual timeline
 *
 * Supports both new and legacy phase values through migration
 */
export function PhaseProgressionTimeline({
  currentPhase,
  workspaceId,
  completionPercentage,
}: PhaseProgressionTimelineProps) {
  // Migrate legacy phases to new phases
  const normalizedPhase = migratePhase(currentPhase)
  const currentPhaseIndex = PHASES.findIndex((p) => p.value === normalizedPhase)
  const progressPercentage = currentPhaseIndex >= 0
    ? ((currentPhaseIndex + 1) / PHASES.length) * 100
    : 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Phase Progression</CardTitle>
            <CardDescription>
              Track your workspace through the product lifecycle
            </CardDescription>
          </div>
          <Link href={`/workspaces/${workspaceId}/settings`}>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Change Phase
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Phase Progress</span>
            <span className="font-semibold">
              {currentPhaseIndex + 1} of {PHASES.length}
            </span>
          </div>
          <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-purple-500 via-yellow-500 via-green-500 via-orange-500 to-pink-500 transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Timeline */}
        <div className="space-y-3">
          {PHASES.map((phase, index) => {
            const isCurrent = phase.value === currentPhase
            const isPast = index < currentPhaseIndex
            const _isFuture = index > currentPhaseIndex

            return (
              <div
                key={phase.value}
                className={`flex items-start gap-3 p-3 rounded-lg transition-all ${
                  isCurrent
                    ? 'bg-blue-50 border-2 border-blue-200'
                    : isPast
                    ? 'bg-green-50 border border-green-100'
                    : 'bg-slate-50 border border-slate-200'
                }`}
              >
                {/* Icon/Status */}
                <div className="flex-shrink-0 mt-0.5">
                  {isPast ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : isCurrent ? (
                    <div className={`w-5 h-5 rounded-full ${phase.color} flex items-center justify-center`}>
                      <Circle className="h-3 w-3 text-white fill-white" />
                    </div>
                  ) : (
                    <Circle className="h-5 w-5 text-slate-300" />
                  )}
                </div>

                {/* Phase Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">{phase.icon}</span>
                    <h4 className={`font-semibold ${isCurrent ? 'text-blue-900' : isPast ? 'text-green-900' : 'text-slate-600'}`}>
                      {phase.label}
                    </h4>
                    {isCurrent && (
                      <Badge className="bg-blue-600 hover:bg-blue-700">
                        Current
                      </Badge>
                    )}
                    {isPast && (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        Completed
                      </Badge>
                    )}
                  </div>
                  <p className={`text-sm ${isCurrent ? 'text-blue-700' : isPast ? 'text-green-700' : 'text-muted-foreground'}`}>
                    {phase.description}
                  </p>
                </div>

                {/* Phase Number */}
                <div className="flex-shrink-0">
                  <span className={`text-sm font-medium ${isCurrent ? 'text-blue-600' : isPast ? 'text-green-600' : 'text-slate-400'}`}>
                    {index + 1}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Completion Status */}
        <div className="rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-blue-900 mb-1">Overall Progress</h4>
              <p className="text-sm text-blue-700">
                {completionPercentage}% of features completed
              </p>
            </div>
            <div className="text-3xl font-bold text-blue-600">
              {completionPercentage}%
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
