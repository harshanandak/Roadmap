'use client'

/**
 * ProgressiveForm Component
 *
 * A form wrapper that provides progressive disclosure context to child components.
 * Uses the useProgressiveForm hook to manage expanded state and field visibility.
 */

import { createContext, useContext, ReactNode } from 'react'
import { WorkspaceMode } from '@/lib/types/workspace-mode'
import {
  useProgressiveForm,
  UseProgressiveFormReturn,
  ProgressiveFormConfig,
} from '@/lib/hooks/use-progressive-form'
import { cn } from '@/lib/utils'

// ============================================================================
// CONTEXT
// ============================================================================

interface ProgressiveFormContextValue extends UseProgressiveFormReturn {
  mode: WorkspaceMode
  formId: string
}

const ProgressiveFormContext = createContext<ProgressiveFormContextValue | null>(null)

/**
 * Hook to access progressive form context
 * Must be used within a ProgressiveForm component
 */
export function useProgressiveFormContext(): ProgressiveFormContextValue {
  const context = useContext(ProgressiveFormContext)
  if (!context) {
    throw new Error('useProgressiveFormContext must be used within a ProgressiveForm')
  }
  return context
}

// ============================================================================
// COMPONENT
// ============================================================================

interface ProgressiveFormProps extends Omit<ProgressiveFormConfig, 'formId'> {
  /** Unique identifier for this form */
  formId: string
  /** Form children */
  children: ReactNode
  /** Additional class names */
  className?: string
  /** HTML form props */
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void
  /** Whether to render as a form element (default: true) */
  asForm?: boolean
}

/**
 * ProgressiveForm provides context for progressive disclosure in forms.
 *
 * @example
 * ```tsx
 * <ProgressiveForm formId="create-work-item" mode={workspace.mode}>
 *   <ProgressiveFieldGroup group="essential">
 *     <NameField />
 *     <TypeField />
 *   </ProgressiveFieldGroup>
 *
 *   <ProgressiveFieldGroup group="expanded" label="More options">
 *     <PriorityField />
 *     <DepartmentField />
 *   </ProgressiveFieldGroup>
 * </ProgressiveForm>
 * ```
 */
export function ProgressiveForm({
  formId,
  mode = 'development',
  userId,
  persistPreference = true,
  initialExpanded,
  children,
  className,
  onSubmit,
  asForm = true,
}: ProgressiveFormProps) {
  const progressiveFormState = useProgressiveForm({
    formId,
    mode,
    userId,
    persistPreference,
    initialExpanded,
  })

  const contextValue: ProgressiveFormContextValue = {
    ...progressiveFormState,
    mode,
    formId,
  }

  const content = (
    <ProgressiveFormContext.Provider value={contextValue}>
      {children}
    </ProgressiveFormContext.Provider>
  )

  if (asForm) {
    return (
      <form onSubmit={onSubmit} className={cn('space-y-4', className)}>
        {content}
      </form>
    )
  }

  return <div className={cn('space-y-4', className)}>{content}</div>
}

export default ProgressiveForm
