'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GitBranch } from 'lucide-react';
import type { WorkItem, TimelineItem, LinkedItem } from '@/lib/types/work-items';
import type { Database } from '@/lib/supabase/types';

/** Workspace row from the database */
type Workspace = Database['public']['Tables']['workspaces']['Row'];

interface DependenciesViewProps {
  workspace: Workspace;
  workItems: WorkItem[];
  timelineItems: TimelineItem[];
  linkedItems: LinkedItem[];
}

export function DependenciesView({
  workspace: _workspace,
  workItems: _workItems,
  timelineItems: _timelineItems,
  linkedItems: _linkedItems,
}: DependenciesViewProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Dependencies</h2>
          <p className="text-muted-foreground">
            Visualize relationships between features
          </p>
        </div>
      </div>

      {/* Dependencies Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Dependency Graph
          </CardTitle>
          <CardDescription>
            Visual dependency graph coming soon
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-12">
          <div className="text-6xl mb-4">🔗</div>
          <h3 className="text-lg font-semibold mb-2">
            Dependencies view in development
          </h3>
          <p className="text-muted-foreground">
            Interactive dependency graph will be available soon
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
