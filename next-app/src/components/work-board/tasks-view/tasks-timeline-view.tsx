'use client'

import { useMemo, useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  format,
  startOfWeek,
  endOfWeek,
  eachWeekOfInterval,
  eachDayOfInterval,
  isToday,
  addWeeks,
  subWeeks,
  parseISO,
  startOfDay,
} from 'date-fns'
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Clock,
  CheckCircle2,
  Circle,
  AlertTriangle,
} from 'lucide-react'
import {
  ProductTaskWithRelations,
  TaskStatus,
  TaskType,
  TASK_TYPE_CONFIG,
  TASK_STATUS_CONFIG,
} from '@/lib/types/product-tasks'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'

interface TasksTimelineViewProps {
  workspaceId: string
  teamId: string
  externalSearch?: string
  externalStatusFilter?: TaskStatus | 'all'
  externalTypeFilter?: TaskType | 'all'
  className?: string
}

export function TasksTimelineView({
  workspaceId,
  teamId,
  externalSearch,
  externalStatusFilter = 'all',
  externalTypeFilter = 'all',
  className,
}: TasksTimelineViewProps) {
  const [tasks, setTasks] = useState<ProductTaskWithRelations[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [viewWeeks, setViewWeeks] = useState(4) // Show 4 weeks by default

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        workspace_id: workspaceId,
        team_id: teamId,
      })

      const response = await fetch(`/api/product-tasks?${params}`)
      if (!response.ok) throw new Error('Failed to fetch tasks')

      const data = await response.json()
      setTasks(data.data || [])
    } catch (error) {
      console.error('Error fetching tasks:', error)
    } finally {
      setIsLoading(false)
    }
  }, [workspaceId, teamId])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  // Filter tasks based on external filters
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch =
        !externalSearch ||
        task.title.toLowerCase().includes(externalSearch.toLowerCase()) ||
        task.description?.toLowerCase().includes(externalSearch.toLowerCase())

      const matchesStatus = externalStatusFilter === 'all' || task.status === externalStatusFilter
      const matchesType = externalTypeFilter === 'all' || task.task_type === externalTypeFilter

      return matchesSearch && matchesStatus && matchesType
    })
  }, [tasks, externalSearch, externalStatusFilter, externalTypeFilter])

  // Only show tasks with due dates in timeline
  const tasksWithDueDates = useMemo(() => {
    return filteredTasks.filter(task => task.due_date)
  }, [filteredTasks])

  const tasksWithoutDueDates = useMemo(() => {
    return filteredTasks.filter(task => !task.due_date)
  }, [filteredTasks])

  // Calculate the date range to display
  const dateRange = useMemo(() => {
    const start = currentWeekStart
    const end = addWeeks(currentWeekStart, viewWeeks - 1)
    return { start, end: endOfWeek(end, { weekStartsOn: 1 }) }
  }, [currentWeekStart, viewWeeks])

  // Get all weeks in the range
  const weeks = useMemo(() => {
    return eachWeekOfInterval(dateRange, { weekStartsOn: 1 })
  }, [dateRange])

  // Group tasks by date
  const tasksByDate = useMemo(() => {
    const grouped = new Map<string, ProductTaskWithRelations[]>()

    tasksWithDueDates.forEach(task => {
      if (task.due_date) {
        const dateKey = format(parseISO(task.due_date), 'yyyy-MM-dd')
        const existing = grouped.get(dateKey) || []
        grouped.set(dateKey, [...existing, task])
      }
    })

    return grouped
  }, [tasksWithDueDates])

  // Navigation handlers
  const handlePreviousWeek = () => {
    setCurrentWeekStart(prev => subWeeks(prev, 1))
  }

  const handleNextWeek = () => {
    setCurrentWeekStart(prev => addWeeks(prev, 1))
  }

  const handleToday = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))
  }

  // Get status icon
  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case 'done':
        return <CheckCircle2 className="h-3 w-3 text-green-500" />
      case 'in_progress':
        return <Clock className="h-3 w-3 text-blue-500" />
      case 'todo':
      default:
        return <Circle className="h-3 w-3 text-gray-400" />
    }
  }

  // Check if a task is overdue
  const isOverdue = (task: ProductTaskWithRelations) => {
    if (!task.due_date || task.status === 'done') return false
    return new Date(task.due_date) < startOfDay(new Date())
  }

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Timeline Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePreviousWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleToday}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={handleNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="text-sm text-muted-foreground">
          {format(dateRange.start, 'MMM d')} - {format(dateRange.end, 'MMM d, yyyy')}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={viewWeeks === 2 ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewWeeks(2)}
          >
            2 Weeks
          </Button>
          <Button
            variant={viewWeeks === 4 ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewWeeks(4)}
          >
            4 Weeks
          </Button>
        </div>
      </div>

      {/* Timeline Grid */}
      {tasksWithDueDates.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              {/* Weeks Grid */}
              {weeks.map((weekStart, weekIndex) => {
                const days = eachDayOfInterval({
                  start: weekStart,
                  end: endOfWeek(weekStart, { weekStartsOn: 1 }),
                })

                return (
                  <div key={weekIndex} className="border-b last:border-b-0">
                    {/* Week Header */}
                    <div className="bg-muted/50 px-4 py-2 text-sm font-medium border-b">
                      Week of {format(weekStart, 'MMM d, yyyy')}
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 min-h-[120px]">
                      {days.map((day, dayIndex) => {
                        const dateKey = format(day, 'yyyy-MM-dd')
                        const dayTasks = tasksByDate.get(dateKey) || []
                        const today = isToday(day)

                        return (
                          <div
                            key={dayIndex}
                            className={cn(
                              'border-r last:border-r-0 p-2',
                              today && 'bg-blue-50/50'
                            )}
                          >
                            {/* Day Header */}
                            <div className="flex items-center justify-between mb-2">
                              <span
                                className={cn(
                                  'text-xs font-medium',
                                  today && 'text-blue-600'
                                )}
                              >
                                {format(day, 'EEE')}
                              </span>
                              <span
                                className={cn(
                                  'text-xs px-1.5 py-0.5 rounded',
                                  today && 'bg-blue-600 text-white'
                                )}
                              >
                                {format(day, 'd')}
                              </span>
                            </div>

                            {/* Tasks for this day */}
                            <div className="space-y-1">
                              {dayTasks.map((task) => (
                                <HoverCard key={task.id}>
                                  <HoverCardTrigger asChild>
                                    <div
                                      className={cn(
                                        'text-xs p-1.5 rounded cursor-pointer transition-colors',
                                        'border-l-2',
                                        task.status === 'done' && 'bg-green-50 border-l-green-500',
                                        task.status === 'in_progress' && 'bg-blue-50 border-l-blue-500',
                                        task.status === 'todo' && 'bg-gray-50 border-l-gray-400',
                                        isOverdue(task) && 'bg-red-50 border-l-red-500'
                                      )}
                                    >
                                      <div className="flex items-center gap-1">
                                        {getStatusIcon(task.status)}
                                        {isOverdue(task) && (
                                          <AlertTriangle className="h-3 w-3 text-red-500" />
                                        )}
                                      </div>
                                      <div className="font-medium truncate mt-0.5">
                                        {task.title}
                                      </div>
                                    </div>
                                  </HoverCardTrigger>
                                  <HoverCardContent className="w-80">
                                    <div className="space-y-2">
                                      <div className="font-medium">{task.title}</div>
                                      {task.description && (
                                        <p className="text-sm text-muted-foreground">
                                          {task.description}
                                        </p>
                                      )}
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <Badge variant="outline" className="text-xs">
                                          {TASK_STATUS_CONFIG[task.status]?.label || task.status}
                                        </Badge>
                                        <Badge variant="secondary" className="text-xs">
                                          {TASK_TYPE_CONFIG[task.task_type]?.label || task.task_type}
                                        </Badge>
                                        {task.priority && (
                                          <Badge
                                            variant="outline"
                                            className={cn(
                                              'text-xs',
                                              task.priority === 'critical' && 'border-red-300 text-red-700',
                                              task.priority === 'high' && 'border-orange-300 text-orange-700',
                                              task.priority === 'medium' && 'border-yellow-300 text-yellow-700',
                                              task.priority === 'low' && 'border-green-300 text-green-700'
                                            )}
                                          >
                                            {task.priority}
                                          </Badge>
                                        )}
                                      </div>
                                      {task.assigned_to && (
                                        <div className="text-xs text-muted-foreground">
                                          Assigned to: {task.assigned_to}
                                        </div>
                                      )}
                                    </div>
                                  </HoverCardContent>
                                </HoverCard>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No scheduled tasks</h3>
              <p className="text-muted-foreground mb-4">
                Tasks with due dates will appear on the timeline
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Unscheduled Tasks */}
      {tasksWithoutDueDates.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Unscheduled Tasks</CardTitle>
            <CardDescription>
              {tasksWithoutDueDates.length} task{tasksWithoutDueDates.length !== 1 ? 's' : ''} without due dates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {tasksWithoutDueDates.slice(0, 5).map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-2 border rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    {getStatusIcon(task.status)}
                    <span className="text-sm font-medium">{task.title}</span>
                    <Badge variant="secondary" className="text-xs">
                      {TASK_TYPE_CONFIG[task.task_type]?.label || task.task_type}
                    </Badge>
                  </div>
                  <Button variant="outline" size="sm">
                    Set Due Date
                  </Button>
                </div>
              ))}
              {tasksWithoutDueDates.length > 5 && (
                <div className="text-sm text-muted-foreground text-center pt-2">
                  And {tasksWithoutDueDates.length - 5} more...
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
