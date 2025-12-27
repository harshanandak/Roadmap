'use client'

import { useState, useCallback, useEffect, useMemo, type RefObject } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Search,
  X,
  Settings2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  useWorkBoardContext,
  statusDisplayMap,
  typeDisplayMap,
  priorityDisplayMap,
  PRIORITIES,
} from './shared/filter-context'

interface WorkBoardToolbarProps {
  className?: string
  teamMembers?: Array<{ id: string; name: string; email: string }>
  searchInputRef?: RefObject<HTMLInputElement | null>
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// Column definitions for visibility toggle
// Grouped by level: Work Item (merged/rowspan) vs Timeline Item (per-row)
const columns = [
  // Work Item Level - LEFT side (merged for items with multiple timelines)
  { id: 'owner', label: 'Owner', level: 'workItem' as const },
  { id: 'priority', label: 'Priority', level: 'workItem' as const },
  { id: 'tags', label: 'Tags', level: 'workItem' as const },
  // Timeline Item Level - RIGHT side (per-row for each timeline)
  { id: 'timeline', label: 'Timeline', level: 'timeline' as const },
  { id: 'status', label: 'Status', level: 'timeline' as const },
  { id: 'notes', label: 'Notes', level: 'timeline' as const },
  { id: 'links', label: 'Links', level: 'timeline' as const },
]

export function WorkBoardToolbar({
  className,
  teamMembers = [],
  searchInputRef,
}: WorkBoardToolbarProps) {
  const {
    primaryTab,
    filters,
    setFilters,
    clearFilters,
    hasActiveFilters,
    statusOptions,
    typeOptions,
    preferences,
    toggleColumnVisibility,
    isColumnVisible,
  } = useWorkBoardContext()

  const [searchInput, setSearchInput] = useState(filters.search)
  const debouncedSearch = useDebounce(searchInput, 300)

  // Sync debounced search to filters
  useEffect(() => {
    setFilters({ search: debouncedSearch })
  }, [debouncedSearch, setFilters])

  // Sync search input when filters are cleared
  useEffect(() => {
    if (filters.search === '' && searchInput !== '') {
      setSearchInput('')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only sync when external search changes
  }, [filters.search])

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value)
  }, [])

  const handleClearSearch = useCallback(() => {
    setSearchInput('')
    setFilters({ search: '' })
  }, [setFilters])

  // Count active filters (excluding search)
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.status) count++
    if (filters.type) count++
    if (filters.priority) count++
    if (filters.assignee) count++
    if (filters.standalone !== null) count++
    return count
  }, [filters])

  return (
    <div className={cn('flex flex-wrap items-center gap-3', className)}>
      {/* Search Input */}
      <div className="relative flex-1 min-w-[200px] max-w-[320px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={searchInputRef}
          placeholder={`Search ${primaryTab === 'tasks' ? 'tasks' : 'work items'}... (press /)`}
          value={searchInput}
          onChange={handleSearchChange}
          className="pl-9 pr-8 h-9"
        />
        {searchInput && (
          <button
            onClick={handleClearSearch}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Status Filter */}
      <Select
        value={filters.status ?? 'all'}
        onValueChange={(value) => setFilters({ status: value === 'all' ? null : value })}
      >
        <SelectTrigger className="w-[140px] h-9">
          <SelectValue placeholder="All Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          {statusOptions.map((status) => (
            <SelectItem key={status} value={status}>
              {statusDisplayMap[status]?.label || status}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Type Filter */}
      <Select
        value={filters.type ?? 'all'}
        onValueChange={(value) => setFilters({ type: value === 'all' ? null : value })}
      >
        <SelectTrigger className="w-[140px] h-9">
          <SelectValue placeholder="All Types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          {typeOptions.map((type) => (
            <SelectItem key={type} value={type}>
              {typeDisplayMap[type]?.label || type}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Priority Filter */}
      <Select
        value={filters.priority ?? 'all'}
        onValueChange={(value) => setFilters({ priority: value === 'all' ? null : value })}
      >
        <SelectTrigger className="w-[130px] h-9">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Priority</SelectItem>
          {PRIORITIES.map((priority) => (
            <SelectItem key={priority} value={priority}>
              {priorityDisplayMap[priority]?.label || priority}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Assignee Filter (only if team members provided) */}
      {teamMembers.length > 0 && (
        <Select
          value={filters.assignee ?? 'all'}
          onValueChange={(value) => setFilters({ assignee: value === 'all' ? null : value })}
        >
          <SelectTrigger className="w-[150px] h-9">
            <SelectValue placeholder="Assignee" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Assignees</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {teamMembers.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {member.name || member.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Tasks: Standalone filter */}
      {primaryTab === 'tasks' && (
        <Select
          value={filters.standalone === true ? 'standalone' : filters.standalone === false ? 'linked' : 'all'}
          onValueChange={(value) =>
            setFilters({
              standalone: value === 'standalone' ? true : value === 'linked' ? false : null,
            })
          }
        >
          <SelectTrigger className="w-[130px] h-9">
            <SelectValue placeholder="All Tasks" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tasks</SelectItem>
            <SelectItem value="standalone">Quick Tasks</SelectItem>
            <SelectItem value="linked">Linked Tasks</SelectItem>
          </SelectContent>
        </Select>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="h-9 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4 mr-1" />
          Clear filters
          {activeFilterCount > 0 && (
            <span className="ml-1 bg-muted px-1.5 py-0.5 rounded-full text-xs">
              {activeFilterCount}
            </span>
          )}
        </Button>
      )}

      {/* Column Visibility (only for table view) */}
      {preferences.viewMode === 'table' && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9">
              <Settings2 className="h-4 w-4 mr-2" />
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[180px]">
            <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {columns.map((column) => (
              <DropdownMenuCheckboxItem
                key={column.id}
                checked={isColumnVisible(column.id)}
                onCheckedChange={() => toggleColumnVisibility(column.id)}
              >
                {column.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
