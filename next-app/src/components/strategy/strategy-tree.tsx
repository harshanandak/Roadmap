'use client'

/**
 * StrategyTree Component
 *
 * Hierarchical tree view of strategies with:
 * - Expand/collapse nodes
 * - Progress bars per level
 * - Color-coded by type
 * - Selection support
 * - Drag-and-drop reordering using @dnd-kit
 */

import { useState, useCallback, useMemo } from 'react'
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  ChevronRight,
  ChevronDown,
  Flag,
  Target,
  TrendingUp,
  Lightbulb,
  Link2,
  MoreHorizontal,
  GripVertical,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { StrategyProgressCompact } from './strategy-progress'
import {
  STRATEGY_TYPE_COLORS,
} from '@/lib/types/strategy'
import type { StrategyWithChildren, StrategyType } from '@/lib/types/strategy'

// Strategy type hierarchy order (lower = higher in tree)
const STRATEGY_TYPE_ORDER: Record<StrategyType, number> = {
  pillar: 0,
  objective: 1,
  key_result: 2,
  initiative: 3,
}

/**
 * Check if a strategy type can be dropped under a parent type
 */
function canDropUnder(
  childType: StrategyType,
  parentType: StrategyType | null
): boolean {
  if (parentType === null) {
    return childType === 'pillar'
  }
  return STRATEGY_TYPE_ORDER[childType] > STRATEGY_TYPE_ORDER[parentType]
}

interface StrategyTreeProps {
  strategies: StrategyWithChildren[]
  selectedId?: string | null
  onSelect?: (strategy: StrategyWithChildren) => void
  onEdit?: (strategy: StrategyWithChildren) => void
  onDelete?: (strategy: StrategyWithChildren) => void
  onAddChild?: (parent: StrategyWithChildren) => void
  onReorder?: (params: { id: string; parentId: string | null; sortOrder: number }) => void
  defaultExpanded?: boolean
  enableDragDrop?: boolean
  className?: string
}

export function StrategyTree({
  strategies,
  selectedId,
  onSelect,
  onEdit,
  onDelete,
  onAddChild,
  onReorder,
  defaultExpanded = true,
  enableDragDrop = true,
  className,
}: StrategyTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    if (defaultExpanded) {
      const ids = new Set<string>()
      const collectIds = (items: StrategyWithChildren[]) => {
        items.forEach((item) => {
          if (item.children.length > 0) {
            ids.add(item.id)
            collectIds(item.children)
          }
        })
      }
      collectIds(strategies)
      return ids
    }
    return new Set()
  })

  const [activeId, setActiveId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [isValidDrop, setIsValidDrop] = useState(true)

  // Build flat map of all strategies for quick lookup
  const strategyMap = useMemo(() => {
    const map = new Map<string, StrategyWithChildren>()
    const buildMap = (items: StrategyWithChildren[]) => {
      items.forEach((item) => {
        map.set(item.id, item)
        if (item.children.length > 0) {
          buildMap(item.children)
        }
      })
    }
    buildMap(strategies)
    return map
  }, [strategies])

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    })
  )

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const expandAll = useCallback(() => {
    const ids = new Set<string>()
    const collectIds = (items: StrategyWithChildren[]) => {
      items.forEach((item) => {
        if (item.children.length > 0) {
          ids.add(item.id)
          collectIds(item.children)
        }
      })
    }
    collectIds(strategies)
    setExpandedIds(ids)
  }, [strategies])

  const collapseAll = useCallback(() => {
    setExpandedIds(new Set())
  }, [])

  // Check if target is a descendant of source (prevent circular reference)
  const isDescendant = useCallback(
    (targetId: string, sourceId: string): boolean => {
      const target = strategyMap.get(targetId)
      if (!target) return false

      const checkChildren = (children: StrategyWithChildren[]): boolean => {
        for (const child of children) {
          if (child.id === sourceId) return true
          if (checkChildren(child.children)) return true
        }
        return false
      }

      const source = strategyMap.get(sourceId)
      return source ? checkChildren(source.children) : false
    },
    [strategyMap]
  )

  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }, [])

  // Handle drag over
  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event

      if (!over) {
        setOverId(null)
        setIsValidDrop(false)
        return
      }

      setOverId(over.id as string)

      const activeStrategy = strategyMap.get(active.id as string)
      const overStrategy = strategyMap.get(over.id as string)

      if (!activeStrategy) {
        setIsValidDrop(false)
        return
      }

      // Check if dropping on self
      if (active.id === over.id) {
        setIsValidDrop(false)
        return
      }

      // Check for circular reference
      if (isDescendant(over.id as string, active.id as string)) {
        setIsValidDrop(false)
        return
      }

      // Check hierarchy rules
      const parentType = overStrategy?.type as StrategyType | null
      const valid = canDropUnder(activeStrategy.type as StrategyType, parentType)
      setIsValidDrop(valid)
    },
    [strategyMap, isDescendant]
  )

  // Handle drag end
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event

      setActiveId(null)
      setOverId(null)
      setIsValidDrop(true)

      if (!over || !onReorder) return
      if (active.id === over.id) return

      const activeStrategy = strategyMap.get(active.id as string)
      const overStrategy = strategyMap.get(over.id as string)

      if (!activeStrategy) return

      // Check hierarchy rules
      const parentType = overStrategy?.type as StrategyType | null
      if (!canDropUnder(activeStrategy.type as StrategyType, parentType)) {
        return
      }

      // Check for circular reference
      if (isDescendant(over.id as string, active.id as string)) {
        return
      }

      // Calculate new sort order (add to end of parent's children)
      const newParentId = over.id as string
      const newParent = strategyMap.get(newParentId)
      const newSortOrder = newParent ? newParent.children.length : strategies.length

      onReorder({
        id: active.id as string,
        parentId: newParentId,
        sortOrder: newSortOrder,
      })
    },
    [strategyMap, strategies, onReorder, isDescendant]
  )

  // Get the active strategy for DragOverlay
  const activeStrategy = activeId ? strategyMap.get(activeId) : null

  if (strategies.length === 0) {
    return (
      <div className={cn('text-center py-8 text-muted-foreground', className)}>
        <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>No strategies yet</p>
        <p className="text-sm">Create your first pillar to get started</p>
      </div>
    )
  }

  const treeContent = (
    <div className={cn('space-y-1', className)}>
      {/* Controls */}
      <div className="flex justify-end gap-2 mb-2">
        <Button variant="ghost" size="sm" onClick={expandAll}>
          Expand all
        </Button>
        <Button variant="ghost" size="sm" onClick={collapseAll}>
          Collapse all
        </Button>
      </div>

      {/* Tree */}
      {strategies.map((strategy) => (
        <StrategyTreeNode
          key={strategy.id}
          strategy={strategy}
          depth={0}
          isExpanded={expandedIds.has(strategy.id)}
          isSelected={selectedId === strategy.id}
          isDragging={activeId === strategy.id}
          isOver={overId === strategy.id}
          isValidDrop={isValidDrop}
          onToggle={() => toggleExpanded(strategy.id)}
          onSelect={onSelect}
          onEdit={onEdit}
          onDelete={onDelete}
          onAddChild={onAddChild}
          expandedIds={expandedIds}
          selectedId={selectedId}
          setExpandedIds={setExpandedIds}
          enableDragDrop={enableDragDrop && !!onReorder}
          activeId={activeId}
          overId={overId}
          isValidDropGlobal={isValidDrop}
        />
      ))}
    </div>
  )

  if (!enableDragDrop || !onReorder) {
    return treeContent
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      {treeContent}

      {/* Drag overlay */}
      <DragOverlay>
        {activeStrategy && (
          <DragOverlayContent strategy={activeStrategy} />
        )}
      </DragOverlay>
    </DndContext>
  )
}

interface StrategyTreeNodeProps {
  strategy: StrategyWithChildren
  depth: number
  isExpanded: boolean
  isSelected: boolean
  isDragging: boolean
  isOver: boolean
  isValidDrop: boolean
  onToggle: () => void
  onSelect?: (strategy: StrategyWithChildren) => void
  onEdit?: (strategy: StrategyWithChildren) => void
  onDelete?: (strategy: StrategyWithChildren) => void
  onAddChild?: (parent: StrategyWithChildren) => void
  expandedIds: Set<string>
  selectedId?: string | null
  setExpandedIds: React.Dispatch<React.SetStateAction<Set<string>>>
  enableDragDrop: boolean
  activeId: string | null
  overId: string | null
  isValidDropGlobal: boolean
}

function StrategyTreeNode({
  strategy,
  depth,
  isExpanded,
  isSelected,
  isDragging: _isDragging,
  isOver: _isOver,
  isValidDrop: _isValidDrop,
  onToggle,
  onSelect,
  onEdit,
  onDelete,
  onAddChild,
  expandedIds,
  selectedId,
  setExpandedIds,
  enableDragDrop,
  activeId,
  overId,
  isValidDropGlobal,
}: StrategyTreeNodeProps) {
  const hasChildren = strategy.children.length > 0

  // DnD hooks
  const {
    attributes,
    listeners,
    setNodeRef: setDraggableRef,
    transform,
    isDragging: isNodeDragging,
  } = useDraggable({
    id: strategy.id,
    disabled: !enableDragDrop,
  })

  const { setNodeRef: setDroppableRef, isOver: _isNodeOver } = useDroppable({
    id: strategy.id,
    disabled: !enableDragDrop,
  })

  const isThisOver = overId === strategy.id
  const showDropIndicator = isThisOver && isValidDropGlobal

  // Type icon mapping
  const TypeIcon = {
    pillar: Flag,
    objective: Target,
    key_result: TrendingUp,
    initiative: Lightbulb,
  }[strategy.type]

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggle()
  }

  const handleSelect = () => {
    onSelect?.(strategy)
  }

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
      }
    : undefined

  return (
    <div ref={setDroppableRef}>
      <Collapsible open={isExpanded}>
        {/* Drop indicator */}
        {showDropIndicator && (
          <div
            className={cn(
              'h-0.5 rounded-full mx-2 mb-1',
              isValidDropGlobal ? 'bg-primary' : 'bg-destructive'
            )}
            style={{ marginLeft: `${depth * 20 + 8}px` }}
          />
        )}

        <div
          ref={setDraggableRef}
          style={style}
          className={cn(
            'flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer hover:bg-accent/50 transition-colors group',
            isSelected && 'bg-accent ring-1 ring-primary/20',
            isNodeDragging && 'opacity-50',
            isThisOver && !isValidDropGlobal && 'bg-destructive/10'
          )}
          onClick={handleSelect}
        >
          {/* Drag handle */}
          {enableDragDrop && (
            <div
              {...listeners}
              {...attributes}
              className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-50 hover:!opacity-100 shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
          )}

          {/* Expand/collapse button */}
          {hasChildren ? (
            <CollapsibleTrigger asChild onClick={handleToggle}>
              <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          ) : (
            <div className="w-5 h-5 shrink-0" />
          )}

          {/* Color indicator */}
          <div
            className="w-1.5 h-5 rounded-full shrink-0"
            style={{ backgroundColor: strategy.color }}
          />

          {/* Type icon */}
          <div
            className="p-1 rounded shrink-0"
            style={{ backgroundColor: `${STRATEGY_TYPE_COLORS[strategy.type]}15` }}
          >
            <TypeIcon
              className="h-3.5 w-3.5"
              style={{ color: STRATEGY_TYPE_COLORS[strategy.type] }}
            />
          </div>

          {/* Title */}
          <span className="flex-1 text-sm font-medium truncate">{strategy.title}</span>

          {/* Aligned items count */}
          {(strategy.aligned_work_items_count || 0) > 0 && (
            <Badge variant="outline" className="text-xs h-5 px-1.5 shrink-0">
              <Link2 className="h-3 w-3 mr-1" />
              {strategy.aligned_work_items_count}
            </Badge>
          )}

          {/* Progress */}
          <div className="w-24 shrink-0">
            <StrategyProgressCompact
              progress={strategy.progress}
              calculatedProgress={strategy.calculated_progress}
              progressMode={strategy.progress_mode}
              status={strategy.status}
            />
          </div>

          {/* Actions menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(strategy)}>Edit</DropdownMenuItem>
              )}
              {onAddChild && strategy.type !== 'initiative' && (
                <DropdownMenuItem onClick={() => onAddChild(strategy)}>
                  Add child
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(strategy)}
                    className="text-destructive"
                  >
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Children */}
        {hasChildren && (
          <CollapsibleContent>
            <div className="border-l border-muted ml-4">
              {strategy.children.map((child) => (
                <StrategyTreeNode
                  key={child.id}
                  strategy={child}
                  depth={depth + 1}
                  isExpanded={expandedIds.has(child.id)}
                  isSelected={selectedId === child.id}
                  isDragging={activeId === child.id}
                  isOver={overId === child.id}
                  isValidDrop={isValidDropGlobal}
                  onToggle={() => {
                    setExpandedIds((prev) => {
                      const next = new Set(prev)
                      if (next.has(child.id)) {
                        next.delete(child.id)
                      } else {
                        next.add(child.id)
                      }
                      return next
                    })
                  }}
                  onSelect={onSelect}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onAddChild={onAddChild}
                  expandedIds={expandedIds}
                  selectedId={selectedId}
                  setExpandedIds={setExpandedIds}
                  enableDragDrop={enableDragDrop}
                  activeId={activeId}
                  overId={overId}
                  isValidDropGlobal={isValidDropGlobal}
                />
              ))}
            </div>
          </CollapsibleContent>
        )}
      </Collapsible>
    </div>
  )
}

/**
 * Drag overlay content - shows a preview of the dragged item
 */
function DragOverlayContent({ strategy }: { strategy: StrategyWithChildren }) {
  const TypeIcon = {
    pillar: Flag,
    objective: Target,
    key_result: TrendingUp,
    initiative: Lightbulb,
  }[strategy.type]

  return (
    <div className="flex items-center gap-2 py-1.5 px-3 bg-background border rounded-lg shadow-lg">
      <div
        className="w-1.5 h-5 rounded-full shrink-0"
        style={{ backgroundColor: strategy.color }}
      />
      <div
        className="p-1 rounded shrink-0"
        style={{ backgroundColor: `${STRATEGY_TYPE_COLORS[strategy.type]}15` }}
      >
        <TypeIcon
          className="h-3.5 w-3.5"
          style={{ color: STRATEGY_TYPE_COLORS[strategy.type] }}
        />
      </div>
      <span className="text-sm font-medium">{strategy.title}</span>
    </div>
  )
}

/**
 * Simple tree for read-only display
 */
export function StrategyTreeReadOnly({
  strategies,
  className,
}: Pick<StrategyTreeProps, 'strategies' | 'className'>) {
  return (
    <StrategyTree
      strategies={strategies}
      defaultExpanded
      enableDragDrop={false}
      className={className}
    />
  )
}
