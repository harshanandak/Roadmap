'use client'

/**
 * ModeOnboardingWizard Component
 *
 * A full-screen wizard shown after workspace creation to help users:
 * 1. Understand their selected mode
 * 2. Optionally apply a template
 * 3. Learn quick start tips
 * 4. Get started with their workspace
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Rocket,
  BarChart3,
  Wrench,
  Check,
  LayoutTemplate,
  Lightbulb,
  ArrowRight,
  Clock,
  Target,
  Users,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { WorkspaceMode, WORKSPACE_MODE_CONFIG } from '@/lib/types/workspace-mode'
import { MODE_EXTENDED_CONFIG, getModeSuggestedActions } from '@/lib/workspace-modes/mode-config'
import { getSystemTemplatesByMode } from '@/lib/templates/system-templates'
import type { SystemTemplate } from '@/lib/templates/template-types'

// ============================================================================
// TYPES
// ============================================================================

interface ModeOnboardingWizardProps {
  workspaceId: string
  workspaceName: string
  mode: WorkspaceMode
  teamId: string
  onComplete: () => void
  onApplyTemplate?: (templateId: string) => Promise<void>
}

type WizardStep = 'welcome' | 'template' | 'tips' | 'complete'

// ============================================================================
// MODE ICONS
// ============================================================================

const MODE_ICONS = {
  development: Rocket,
  launch: Sparkles,
  growth: BarChart3,
  maintenance: Wrench,
}

// ============================================================================
// STEP COMPONENTS
// ============================================================================

function WelcomeStep({ mode, workspaceName }: { mode: WorkspaceMode; workspaceName: string }) {
  const config = WORKSPACE_MODE_CONFIG[mode]
  const extendedConfig = MODE_EXTENDED_CONFIG[mode]
  const Icon = MODE_ICONS[mode]

  return (
    <div className="space-y-8">
      {/* Mode Header */}
      <div className="text-center space-y-4">
        <div
          className="mx-auto h-20 w-20 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: `${config.color}20` }}
        >
          <Icon className="h-10 w-10" style={{ color: config.color }} />
        </div>
        <div>
          <h1 className="text-3xl font-bold">{workspaceName}</h1>
          <p className="text-lg text-muted-foreground mt-2">
            Running in <span style={{ color: config.color }}>{config.name}</span> mode
          </p>
        </div>
      </div>

      {/* Mode Description */}
      <Card>
        <CardContent className="p-6">
          <p className="text-lg text-center">{config.description}</p>
        </CardContent>
      </Card>

      {/* What's Optimized */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4" style={{ color: config.color }} />
              Default Focus
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold capitalize">{extendedConfig.defaultWorkItemType}s</p>
            <p className="text-sm text-muted-foreground">
              Your primary work item type
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" style={{ color: config.color }} />
              Starting Phase
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold capitalize">{extendedConfig.defaultPhase}</p>
            <p className="text-sm text-muted-foreground">
              Default for new work items
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" style={{ color: config.color }} />
              Form Fields
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {extendedConfig.visibleFields.essential.length} Essential
            </p>
            <p className="text-sm text-muted-foreground">
              +{extendedConfig.visibleFields.expanded.length} on expand
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function TemplateStep({
  mode,
  selectedTemplate,
  onSelectTemplate,
}: {
  mode: WorkspaceMode
  selectedTemplate: SystemTemplate | null
  onSelectTemplate: (template: SystemTemplate | null) => void
}) {
  const config = WORKSPACE_MODE_CONFIG[mode]
  const templates = getSystemTemplatesByMode(mode)

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Start with a Template?</h2>
        <p className="text-muted-foreground">
          Templates include pre-configured departments, work items, and tags
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map((template) => {
          const isSelected = selectedTemplate?.id === template.id
          return (
            <Card
              key={template.id}
              className={cn(
                'cursor-pointer transition-all hover:shadow-md',
                isSelected && 'ring-2 ring-primary'
              )}
              onClick={() => onSelectTemplate(isSelected ? null : template)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${config.color}20` }}
                    >
                      <LayoutTemplate
                        className="h-5 w-5"
                        style={{ color: config.color }}
                      />
                    </div>
                    <div>
                      <CardTitle className="text-base">{template.name}</CardTitle>
                      <CardDescription>{template.description}</CardDescription>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{template.template_data.departments.length} departments</span>
                  <span>•</span>
                  <span>{template.template_data.workItems.length} work items</span>
                  <span>•</span>
                  <span>{template.template_data.tags.length} tags</span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Skip Option */}
      <div className="text-center">
        <Button variant="ghost" onClick={() => onSelectTemplate(null)}>
          Skip - I&apos;ll start from scratch
        </Button>
      </div>
    </div>
  )
}

function TipsStep({ mode }: { mode: WorkspaceMode }) {
  const config = WORKSPACE_MODE_CONFIG[mode]
  const suggestedActions = getModeSuggestedActions(mode)

  const tips = [
    {
      title: 'Quick Actions',
      description: 'Use the suggested actions on your dashboard for common tasks',
      items: suggestedActions.slice(0, 3).map((a) => a.label),
    },
    {
      title: 'Progressive Forms',
      description: 'Forms show only essential fields by default - click "More" for advanced options',
      items: ['Focused input', 'Mode-aware defaults', 'Preference memory'],
    },
    {
      title: 'Mode Switching',
      description: 'You can change modes anytime from workspace settings',
      items: ['Development → Launch', 'Launch → Growth', 'Growth → Maintenance'],
    },
  ]

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Quick Start Tips</h2>
        <p className="text-muted-foreground">
          Here&apos;s how to get the most out of {config.name} mode
        </p>
      </div>

      <div className="grid gap-4">
        {tips.map((tip, index) => (
          <Card key={index}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div
                  className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ backgroundColor: `${config.color}20`, color: config.color }}
                >
                  {index + 1}
                </div>
                <div>
                  <CardTitle className="text-base">{tip.title}</CardTitle>
                  <CardDescription>{tip.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {tip.items.map((item, i) => (
                  <Badge key={i} variant="secondary">
                    {item}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function CompleteStep({
  mode,
  workspaceName,
  templateApplied,
}: {
  mode: WorkspaceMode
  workspaceName: string
  templateApplied: boolean
}) {
  const config = WORKSPACE_MODE_CONFIG[mode]

  return (
    <div className="space-y-8 text-center">
      <div
        className="mx-auto h-24 w-24 rounded-full flex items-center justify-center"
        style={{ backgroundColor: `${config.color}20` }}
      >
        <Check className="h-12 w-12" style={{ color: config.color }} />
      </div>

      <div className="space-y-2">
        <h2 className="text-3xl font-bold">You&apos;re All Set!</h2>
        <p className="text-lg text-muted-foreground">
          {workspaceName} is ready in {config.name} mode
        </p>
      </div>

      {templateApplied && (
        <Card className="mx-auto max-w-md">
          <CardContent className="p-4 flex items-center gap-3">
            <Check className="h-5 w-5 text-green-500" />
            <span>Template applied successfully</span>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-center gap-2 text-muted-foreground">
        <Lightbulb className="h-4 w-4" />
        <span>You can change your mode anytime from workspace settings</span>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ModeOnboardingWizard({
  workspaceId,
  workspaceName,
  mode,
  teamId: _teamId,
  onComplete,
  onApplyTemplate,
}: ModeOnboardingWizardProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<WizardStep>('welcome')
  const [selectedTemplate, setSelectedTemplate] = useState<SystemTemplate | null>(null)
  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false)
  const [templateApplied, setTemplateApplied] = useState(false)

  const steps: WizardStep[] = ['welcome', 'template', 'tips', 'complete']
  const currentStepIndex = steps.indexOf(currentStep)
  const progress = ((currentStepIndex + 1) / steps.length) * 100

  const config = WORKSPACE_MODE_CONFIG[mode]

  const handleNext = async () => {
    // If moving from template step and a template is selected, apply it
    if (currentStep === 'template' && selectedTemplate && onApplyTemplate) {
      setIsApplyingTemplate(true)
      try {
        await onApplyTemplate(selectedTemplate.id)
        setTemplateApplied(true)
      } catch (error) {
        console.error('Failed to apply template:', error)
      } finally {
        setIsApplyingTemplate(false)
      }
    }

    const nextIndex = currentStepIndex + 1
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex])
    }
  }

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex])
    }
  }

  const handleComplete = () => {
    onComplete()
    router.push(`/workspaces/${workspaceId}`)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Progress Header */}
      <div className="border-b sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div
                className="h-6 w-6 rounded flex items-center justify-center"
                style={{ backgroundColor: `${config.color}20` }}
              >
                <Sparkles className="h-3 w-3" style={{ color: config.color }} />
              </div>
              <span className="font-medium">Setting up {workspaceName}</span>
            </div>
            <span className="text-sm text-muted-foreground">
              Step {currentStepIndex + 1} of {steps.length}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        {currentStep === 'welcome' && (
          <WelcomeStep mode={mode} workspaceName={workspaceName} />
        )}
        {currentStep === 'template' && (
          <TemplateStep
            mode={mode}
            selectedTemplate={selectedTemplate}
            onSelectTemplate={setSelectedTemplate}
          />
        )}
        {currentStep === 'tips' && <TipsStep mode={mode} />}
        {currentStep === 'complete' && (
          <CompleteStep
            mode={mode}
            workspaceName={workspaceName}
            templateApplied={templateApplied}
          />
        )}
      </div>

      {/* Navigation Footer */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={currentStepIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {currentStep === 'complete' ? (
            <Button onClick={handleComplete} size="lg">
              Go to Workspace
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleNext} disabled={isApplyingTemplate}>
              {isApplyingTemplate ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Applying Template...
                </>
              ) : (
                <>
                  {currentStep === 'template' && selectedTemplate
                    ? 'Apply & Continue'
                    : 'Continue'}
                  <ChevronRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default ModeOnboardingWizard
