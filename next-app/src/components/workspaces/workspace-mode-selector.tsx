'use client';

import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  WORKSPACE_MODES,
  WORKSPACE_MODE_CONFIG,
  type WorkspaceMode,
  getWorkspaceModeEmoji,
  getSuggestedNextMode,
} from '@/lib/types/workspace-mode';
import { cn } from '@/lib/utils';
import {
  Code2,
  Rocket,
  TrendingUp,
  Shield,
  ChevronRight,
} from 'lucide-react';

// Icon mapping for workspace modes
const MODE_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  'code-2': Code2,
  rocket: Rocket,
  'trending-up': TrendingUp,
  shield: Shield,
};

interface WorkspaceModeSelectorProps {
  /** Currently selected mode */
  value: WorkspaceMode;
  /** Callback when mode changes */
  onValueChange: (value: WorkspaceMode) => void;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Whether to show detailed descriptions */
  showDescription?: boolean;
  /** Whether to show mode transition suggestions */
  showTransitionHint?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * WorkspaceModeSelector
 *
 * A dropdown to select the workspace lifecycle mode.
 * Shows mode icon, name, and optional description.
 *
 * @example
 * <WorkspaceModeSelector
 *   value={workspaceMode}
 *   onValueChange={handleModeChange}
 * />
 */
export function WorkspaceModeSelector({
  value,
  onValueChange,
  disabled = false,
  showDescription = true,
  showTransitionHint = false,
  className,
}: WorkspaceModeSelectorProps) {
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional hydration guard pattern
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const selectedConfig = WORKSPACE_MODE_CONFIG[value];
  const suggestedNext = getSuggestedNextMode(value);

  // Render icon for a mode
  const renderIcon = (iconName: string, className?: string) => {
    const IconComponent = MODE_ICON_MAP[iconName] || Code2;
    return <IconComponent className={className} />;
  };

  return (
    <div className={cn('space-y-2', className)}>
      {/* Label */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Workspace Mode
        </label>
      </div>

      {/* Select */}
      <Select
        value={value}
        onValueChange={(v) => onValueChange(v as WorkspaceMode)}
        disabled={disabled}
      >
        <SelectTrigger
          className="w-full"
          aria-label="Select workspace mode"
        >
          <SelectValue>
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: selectedConfig.color }}
                aria-hidden="true"
              />
              {renderIcon(selectedConfig.icon, 'h-4 w-4 shrink-0')}
              <span>{selectedConfig.name}</span>
            </div>
          </SelectValue>
        </SelectTrigger>

        <SelectContent>
          {WORKSPACE_MODES.map((mode) => {
            const config = WORKSPACE_MODE_CONFIG[mode];
            return (
              <SelectItem
                key={mode}
                value={mode}
                className="cursor-pointer py-2"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-3 h-3 rounded-full shrink-0 mt-1"
                    style={{ backgroundColor: config.color }}
                    aria-hidden="true"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {renderIcon(config.icon, 'h-4 w-4 shrink-0')}
                      <span className="font-medium">{config.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {config.description}
                    </p>
                  </div>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      {/* Description of selected mode */}
      {showDescription && (
        <div
          className="rounded-lg p-3 text-sm"
          style={{
            backgroundColor: selectedConfig.bgColor,
            borderColor: selectedConfig.borderColor,
            borderWidth: '1px',
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            {renderIcon(selectedConfig.icon, 'h-4 w-4')}
            <span className="font-medium" style={{ color: selectedConfig.color }}>
              {selectedConfig.name} Mode
            </span>
          </div>
          <p className="text-muted-foreground text-xs">
            {selectedConfig.description}
          </p>
          <p className="text-xs mt-1">
            <span className="font-medium">Focus: </span>
            <span className="text-muted-foreground">{selectedConfig.emphasis}</span>
          </p>
        </div>
      )}

      {/* Transition hint */}
      {showTransitionHint && suggestedNext && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Next typical phase:</span>
          <div className="flex items-center gap-1">
            <span>{getWorkspaceModeEmoji(value)}</span>
            <ChevronRight className="h-3 w-3" />
            <span>{getWorkspaceModeEmoji(suggestedNext)}</span>
            <span className="font-medium">{WORKSPACE_MODE_CONFIG[suggestedNext].name}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * WorkspaceModeBadge
 *
 * Displays the current workspace mode as a badge.
 */
export function WorkspaceModeBadge({
  mode,
  size = 'default',
  showIcon = true,
  className,
}: {
  mode: WorkspaceMode;
  size?: 'sm' | 'default';
  showIcon?: boolean;
  className?: string;
}) {
  const config = WORKSPACE_MODE_CONFIG[mode];

  // Render icon
  const renderIcon = (iconName: string, className?: string) => {
    const IconComponent = MODE_ICON_MAP[iconName] || Code2;
    return <IconComponent className={className} />;
  };

  // Size-specific classes
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0 h-5',
    default: 'text-sm px-2 py-0.5 h-6',
  };

  const iconSizeClasses = {
    sm: 'h-3 w-3',
    default: 'h-3.5 w-3.5',
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 font-medium border cursor-default',
        sizeClasses[size],
        className
      )}
      style={{
        backgroundColor: config.bgColor,
        color: config.color,
        borderColor: config.borderColor,
      }}
    >
      {showIcon && renderIcon(config.icon, iconSizeClasses[size])}
      <span>{config.name}</span>
    </Badge>
  );
}

/**
 * Compact mode selector for inline use
 */
export function CompactWorkspaceModeSelector({
  value,
  onValueChange,
  disabled,
  className,
}: Omit<WorkspaceModeSelectorProps, 'showDescription' | 'showTransitionHint'>) {
  return (
    <WorkspaceModeSelector
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      showDescription={false}
      showTransitionHint={false}
      className={className}
    />
  );
}
