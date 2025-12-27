'use client'

/**
 * Widget Picker
 * Sidebar component for selecting widgets to add to custom dashboard
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Plus,
  Search,
  Gauge,
  PieChart,
  Activity,
  TrendingUp,
  LayoutGrid,
  CheckCircle2,
  AlertTriangle,
  Heart,
  Target,
  Clock,
  Timer,
  BarChart3,
  GitBranch,
  Link2Off,
} from 'lucide-react'
import { getWidgetCategories, type WidgetId } from './widget-registry'
import type { WidgetCategory } from '@/lib/types/analytics'
import { cn } from '@/lib/utils'

// Icon mapping for widgets
const ICON_MAP: Record<string, React.ReactNode> = {
  LayoutGrid: <LayoutGrid className="h-4 w-4" />,
  CheckCircle: <CheckCircle2 className="h-4 w-4" />,
  AlertTriangle: <AlertTriangle className="h-4 w-4" />,
  Heart: <Heart className="h-4 w-4" />,
  Target: <Target className="h-4 w-4" />,
  Clock: <Clock className="h-4 w-4" />,
  Timer: <Timer className="h-4 w-4" />,
  PieChart: <PieChart className="h-4 w-4" />,
  BarChart3: <BarChart3 className="h-4 w-4" />,
  TrendingUp: <TrendingUp className="h-4 w-4" />,
  Activity: <Activity className="h-4 w-4" />,
  GitBranch: <GitBranch className="h-4 w-4" />,
  Link2Off: <Link2Off className="h-4 w-4" />,
  Gauge: <Gauge className="h-4 w-4" />,
}

// Category icons
const CATEGORY_ICON_MAP: Record<WidgetCategory, React.ReactNode> = {
  metrics: <Gauge className="h-4 w-4" />,
  charts: <PieChart className="h-4 w-4" />,
  lists: <Activity className="h-4 w-4" />,
  progress: <TrendingUp className="h-4 w-4" />,
}

interface WidgetPickerProps {
  onAddWidget: (widgetId: WidgetId) => void
  addedWidgetIds: WidgetId[]
  className?: string
}

export function WidgetPicker({ onAddWidget, addedWidgetIds, className }: WidgetPickerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [open, setOpen] = useState(false)
  const categories = getWidgetCategories()

  // Filter widgets by search query
  const filteredCategories = categories.map((cat) => ({
    ...cat,
    widgets: cat.widgets.filter(
      (w) =>
        w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.description.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter((cat) => cat.widgets.length > 0)

  const handleAddWidget = (widgetId: WidgetId) => {
    onAddWidget(widgetId)
    // Keep sheet open for adding multiple widgets
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className={cn('gap-2', className)}>
          <Plus className="h-4 w-4" />
          Add Widget
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Add Widget</SheetTitle>
          <SheetDescription>
            Choose widgets to add to your custom dashboard
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search widgets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Widget Categories */}
          <ScrollArea className="h-[calc(100vh-200px)]">
            <Accordion type="multiple" defaultValue={['metrics', 'charts', 'lists', 'progress']}>
              {filteredCategories.map((category) => (
                <AccordionItem key={category.category} value={category.category}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      {CATEGORY_ICON_MAP[category.category]}
                      <span>{category.label}</span>
                      <Badge variant="secondary" className="ml-2">
                        {category.widgets.length}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid gap-2">
                      {category.widgets.map((widget) => {
                        const isAdded = addedWidgetIds.includes(widget.id as WidgetId)
                        return (
                          <Card
                            key={widget.id}
                            className={cn(
                              'cursor-pointer transition-colors hover:bg-accent',
                              isAdded && 'opacity-50'
                            )}
                            onClick={() => !isAdded && handleAddWidget(widget.id as WidgetId)}
                          >
                            <CardContent className="flex items-center gap-3 p-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                {ICON_MAP[widget.icon] || <LayoutGrid className="h-4 w-4" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{widget.name}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {widget.description}
                                </p>
                              </div>
                              {isAdded ? (
                                <Badge variant="secondary">Added</Badge>
                              ) : (
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                  <Plus className="h-4 w-4" />
                                </Button>
                              )}
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            {filteredCategories.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Search className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  No widgets found matching &quot;{searchQuery}&quot;
                </p>
              </div>
            )}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  )
}
