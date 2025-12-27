'use client'

/**
 * StrategySelector Component
 *
 * Dropdown/tree selector for aligning work items to strategies.
 * Shows hierarchy with indentation and supports multi-select.
 */

import { useState, useMemo, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ChevronDown,
  ChevronRight,
  Search,
  X,
  Flag,
  Target,
  TrendingUp,
  Lightbulb,
  Star,
} from 'lucide-react'
import {
  STRATEGY_TYPE_COLORS,
  getStrategyTypeLabel,
  ALIGNMENT_STRENGTHS,
  getAlignmentStrengthLabel,
} from '@/lib/types/strategy'
import type {
  StrategyWithChildren,
  AlignmentStrength,
} from '@/lib/types/strategy'

// ============================================================================
// SINGLE STRATEGY SELECTOR
// ============================================================================

interface StrategySelectorProps {
  strategies: StrategyWithChildren[]
  value?: string | null
  onChange: (strategyId: string | null) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function StrategySelector({
  strategies,
  value,
  onChange,
  placeholder = 'Select strategy...',
  disabled = false,
  className,
}: StrategySelectorProps) {
  // Flatten strategies for select
  const flatStrategies = useMemo(() => flattenWithDepth(strategies), [strategies])
  const selectedStrategy = flatStrategies.find(s => s.id === value)

  return (
    <Select
      value={value || ''}
      onValueChange={(val) => onChange(val || null)}
      disabled={disabled}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder}>
          {selectedStrategy && (
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: selectedStrategy.color }}
              />
              <span className="truncate">{selectedStrategy.title}</span>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="">
          <span className="text-muted-foreground">None</span>
        </SelectItem>
        {flatStrategies.map(strategy => (
          <SelectItem key={strategy.id} value={strategy.id}>
            <div
              className="flex items-center gap-2"
              style={{ paddingLeft: `${strategy.depth * 16}px` }}
            >
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: strategy.color }}
              />
              <span className="text-xs text-muted-foreground shrink-0">
                {getStrategyTypeLabel(strategy.type).slice(0, 1)}
              </span>
              <span className="truncate">{strategy.title}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// ============================================================================
// MULTI-SELECT STRATEGY PICKER
// ============================================================================

interface SelectedStrategy {
  strategyId: string
  strength: AlignmentStrength
  isPrimary: boolean
}

interface StrategyMultiSelectorProps {
  strategies: StrategyWithChildren[]
  selected: SelectedStrategy[]
  onChange: (selected: SelectedStrategy[]) => void
  primaryId?: string | null
  onPrimaryChange?: (strategyId: string | null) => void
  maxSelections?: number
  disabled?: boolean
  className?: string
}

export function StrategyMultiSelector({
  strategies,
  selected,
  onChange,
  primaryId,
  onPrimaryChange,
  maxSelections,
  disabled = false,
  className,
}: StrategyMultiSelectorProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  // Filter strategies by search
  const filteredStrategies = useMemo(() => {
    if (!search) return strategies
    return filterTreeBySearch(strategies, search.toLowerCase())
  }, [strategies, search])

  const flatStrategies = useMemo(() => flattenWithDepth(strategies), [strategies])

  const toggleSelection = useCallback((strategyId: string) => {
    const existing = selected.find(s => s.strategyId === strategyId)
    if (existing) {
      onChange(selected.filter(s => s.strategyId !== strategyId))
    } else {
      if (maxSelections && selected.length >= maxSelections) return
      onChange([...selected, { strategyId, strength: 'medium', isPrimary: false }])
    }
  }, [selected, onChange, maxSelections])

  const updateStrength = useCallback((strategyId: string, strength: AlignmentStrength) => {
    onChange(selected.map(s =>
      s.strategyId === strategyId ? { ...s, strength } : s
    ))
  }, [selected, onChange])

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const selectedCount = selected.length

  return (
    <div className={cn('space-y-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-full justify-between"
          >
            {selectedCount > 0 ? (
              <span>{selectedCount} strateg{selectedCount === 1 ? 'y' : 'ies'} selected</span>
            ) : (
              <span className="text-muted-foreground">Select strategies...</span>
            )}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          {/* Search */}
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search strategies..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 h-8"
              />
            </div>
          </div>

          {/* Tree */}
          <ScrollArea className="h-[300px]">
            <div className="p-2">
              {filteredStrategies.length === 0 ? (
                <p className="text-center text-muted-foreground py-4 text-sm">
                  No strategies found
                </p>
              ) : (
                filteredStrategies.map(strategy => (
                  <TreeItem
                    key={strategy.id}
                    strategy={strategy}
                    depth={0}
                    selected={selected}
                    primaryId={primaryId}
                    expandedIds={expandedIds}
                    onToggleExpand={toggleExpanded}
                    onToggleSelect={toggleSelection}
                    onSetPrimary={onPrimaryChange}
                    disabled={disabled}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>

      {/* Selected items with strength */}
      {selected.length > 0 && (
        <div className="space-y-2">
          {selected.map(item => {
            const strategy = flatStrategies.find(s => s.id === item.strategyId)
            if (!strategy) return null

            return (
              <div
                key={item.strategyId}
                className="flex items-center gap-2 p-2 rounded-md border bg-muted/30"
              >
                {/* Color + title */}
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: strategy.color }}
                />
                <span className="flex-1 text-sm truncate">{strategy.title}</span>

                {/* Primary indicator */}
                {primaryId === item.strategyId && (
                  <Badge variant="secondary" className="text-xs">
                    <Star className="h-3 w-3 mr-1 fill-current" />
                    Primary
                  </Badge>
                )}

                {/* Strength selector */}
                <Select
                  value={item.strength}
                  onValueChange={(val) => updateStrength(item.strategyId, val as AlignmentStrength)}
                >
                  <SelectTrigger className="w-24 h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALIGNMENT_STRENGTHS.map(strength => (
                      <SelectItem key={strength} value={strength} className="text-xs">
                        {getAlignmentStrengthLabel(strength)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Remove button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={() => toggleSelection(item.strategyId)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// TREE ITEM COMPONENT
// ============================================================================

interface TreeItemProps {
  strategy: StrategyWithChildren
  depth: number
  selected: SelectedStrategy[]
  primaryId?: string | null
  expandedIds: Set<string>
  onToggleExpand: (id: string) => void
  onToggleSelect: (id: string) => void
  onSetPrimary?: (id: string | null) => void
  disabled?: boolean
}

function TreeItem({
  strategy,
  depth,
  selected,
  primaryId,
  expandedIds,
  onToggleExpand,
  onToggleSelect,
  onSetPrimary,
  disabled,
}: TreeItemProps) {
  const hasChildren = strategy.children.length > 0
  const isExpanded = expandedIds.has(strategy.id)
  const isSelected = selected.some(s => s.strategyId === strategy.id)
  const isPrimary = primaryId === strategy.id

  const TypeIcon = {
    pillar: Flag,
    objective: Target,
    key_result: TrendingUp,
    initiative: Lightbulb,
  }[strategy.type]

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-2 py-1.5 px-2 rounded hover:bg-accent/50 cursor-pointer',
          isSelected && 'bg-accent'
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {/* Expand toggle */}
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onToggleExpand(strategy.id)
            }}
            className="shrink-0"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        ) : (
          <div className="w-4 shrink-0" />
        )}

        {/* Checkbox */}
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelect(strategy.id)}
          disabled={disabled}
          className="shrink-0"
        />

        {/* Type icon */}
        <TypeIcon
          className="h-4 w-4 shrink-0"
          style={{ color: STRATEGY_TYPE_COLORS[strategy.type] }}
        />

        {/* Title */}
        <span
          className="flex-1 text-sm truncate cursor-pointer"
          onClick={() => onToggleSelect(strategy.id)}
        >
          {strategy.title}
        </span>

        {/* Primary star */}
        {isSelected && onSetPrimary && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onSetPrimary(isPrimary ? null : strategy.id)
            }}
            className={cn(
              'shrink-0',
              isPrimary ? 'text-yellow-500' : 'text-muted-foreground hover:text-yellow-500'
            )}
          >
            <Star className={cn('h-4 w-4', isPrimary && 'fill-current')} />
          </button>
        )}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {strategy.children.map(child => (
            <TreeItem
              key={child.id}
              strategy={child}
              depth={depth + 1}
              selected={selected}
              primaryId={primaryId}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
              onToggleSelect={onToggleSelect}
              onSetPrimary={onSetPrimary}
              disabled={disabled}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// HELPERS
// ============================================================================

interface FlatStrategy {
  id: string
  title: string
  type: StrategyWithChildren['type']
  color: string
  depth: number
}

function flattenWithDepth(
  strategies: StrategyWithChildren[],
  depth = 0
): FlatStrategy[] {
  return strategies.flatMap(s => [
    { id: s.id, title: s.title, type: s.type, color: s.color, depth },
    ...flattenWithDepth(s.children, depth + 1),
  ])
}

function filterTreeBySearch(
  strategies: StrategyWithChildren[],
  query: string
): StrategyWithChildren[] {
  return strategies
    .map(strategy => {
      const matchesTitle = strategy.title.toLowerCase().includes(query)
      const filteredChildren = filterTreeBySearch(strategy.children, query)

      if (matchesTitle || filteredChildren.length > 0) {
        return {
          ...strategy,
          children: filteredChildren,
        }
      }
      return null
    })
    .filter((s): s is StrategyWithChildren => s !== null)
}
