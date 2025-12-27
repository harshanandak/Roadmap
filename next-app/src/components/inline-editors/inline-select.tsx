'use client'

/**
 * InlineSelect Component
 *
 * A click-to-edit select dropdown for inline editing.
 * Shows current value as a badge/button, opens popover on click.
 */

import { useState, useEffect } from 'react'
import { Check, ChevronDown, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { cn } from '@/lib/utils'

// ============================================================================
// TYPES
// ============================================================================

export interface SelectOption {
  value: string
  label: string
  icon?: React.ReactNode
  color?: string
  description?: string
}

export interface InlineSelectProps {
  value: string
  options: SelectOption[]
  onValueChange: (value: string) => Promise<void> | void
  placeholder?: string
  disabled?: boolean
  showSearch?: boolean
  className?: string
  variant?: 'badge' | 'button' | 'ghost'
  size?: 'sm' | 'md'
}

// ============================================================================
// COMPONENT
// ============================================================================

export function InlineSelect({
  value,
  options,
  onValueChange,
  placeholder = 'Select...',
  disabled = false,
  showSearch = false,
  className,
  variant = 'badge',
  size = 'sm',
}: InlineSelectProps) {
  const [open, setOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [localValue, setLocalValue] = useState(value)

  // Update local value when prop changes
  useEffect(() => {
    setLocalValue(value)
  }, [value])

  const currentOption = options.find((opt) => opt.value === localValue)

  const handleSelect = async (newValue: string) => {
    if (newValue === localValue || disabled) return

    setLocalValue(newValue) // Optimistic update
    setOpen(false)
    setIsUpdating(true)

    try {
      await onValueChange(newValue)
    } catch (error) {
      setLocalValue(value) // Revert on error
      console.error('Failed to update value:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const renderTrigger = () => {
    if (isUpdating) {
      return (
        <div className={cn('flex items-center gap-1', className)}>
          <Loader2 className="h-3 w-3 animate-spin" />
          <span className="text-xs">Updating...</span>
        </div>
      )
    }

    if (variant === 'badge') {
      return (
        <Badge
          variant="outline"
          className={cn(
            'cursor-pointer hover:bg-accent transition-colors',
            size === 'sm' && 'text-xs px-1.5 py-0',
            currentOption?.color && 'border-current',
            className
          )}
          style={currentOption?.color ? { color: currentOption.color } : undefined}
        >
          {currentOption?.icon}
          <span className={currentOption?.icon ? 'ml-1' : ''}>
            {currentOption?.label || placeholder}
          </span>
          <ChevronDown className="h-3 w-3 ml-0.5 opacity-50" />
        </Badge>
      )
    }

    if (variant === 'ghost') {
      return (
        <button
          className={cn(
            'inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors',
            className
          )}
        >
          {currentOption?.icon}
          <span>{currentOption?.label || placeholder}</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </button>
      )
    }

    return (
      <Button
        variant="outline"
        size="sm"
        className={cn('h-7 text-xs', className)}
        disabled={disabled}
      >
        {currentOption?.icon}
        <span className={currentOption?.icon ? 'ml-1' : ''}>
          {currentOption?.label || placeholder}
        </span>
        <ChevronDown className="h-3 w-3 ml-1 opacity-50" />
      </Button>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
        {renderTrigger()}
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          {showSearch && <CommandInput placeholder="Search..." />}
          <CommandList>
            <CommandEmpty>No options found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => handleSelect(option.value)}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      localValue === option.value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {option.icon && <span className="mr-2">{option.icon}</span>}
                  <div className="flex-1">
                    <span style={option.color ? { color: option.color } : undefined}>
                      {option.label}
                    </span>
                    {option.description && (
                      <p className="text-xs text-muted-foreground">
                        {option.description}
                      </p>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export default InlineSelect
