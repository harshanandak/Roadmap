'use client';

import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, X, Plus } from 'lucide-react';
import type { DepartmentWithStats } from '@/lib/types/department';
import { cn } from '@/lib/utils';
import {
  Folder,
  Code2,
  Palette,
  Megaphone,
  Users,
  Briefcase,
  Shield,
  Cog,
  FlaskConical,
  Headphones,
  BarChart3,
  Globe,
} from 'lucide-react';

// Icon mapping for dynamic rendering
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  folder: Folder,
  'code-2': Code2,
  palette: Palette,
  megaphone: Megaphone,
  users: Users,
  briefcase: Briefcase,
  shield: Shield,
  cog: Cog,
  'flask-conical': FlaskConical,
  headphones: Headphones,
  'bar-chart-3': BarChart3,
  globe: Globe,
};

interface DepartmentSelectorProps {
  /** Currently selected department ID */
  value: string | undefined;
  /** Callback when selection changes */
  onValueChange: (value: string | undefined) => void;
  /** Team ID to fetch departments for */
  teamId: string;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Whether selection is required */
  required?: boolean;
  /** Whether to show a clear button */
  allowClear?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Callback when "Add Department" is clicked */
  onAddDepartment?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * DepartmentSelector
 *
 * A dropdown to select a department for a work item.
 * Fetches departments from the API and displays them with color indicators.
 *
 * @example
 * <DepartmentSelector
 *   value={selectedDepartmentId}
 *   onValueChange={setSelectedDepartmentId}
 *   teamId={teamId}
 * />
 */
export function DepartmentSelector({
  value,
  onValueChange,
  teamId,
  disabled = false,
  required = false,
  allowClear = true,
  placeholder = 'Select department...',
  onAddDepartment,
  className,
}: DepartmentSelectorProps) {
  const [departments, setDepartments] = useState<DepartmentWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch departments
  useEffect(() => {
    if (!teamId) return;

    const fetchDepartments = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/departments?team_id=${teamId}`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch departments');
        }

        setDepartments(result.data || []);
      } catch (err) {
        console.error('Error fetching departments:', err);
        setError(err instanceof Error ? err.message : 'Failed to load departments');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDepartments();
  }, [teamId]);

  // Don't render until mounted (hydration safety)
  if (!mounted) {
    return null;
  }

  // Find selected department
  const selectedDepartment = departments.find(d => d.id === value);

  // Handle clear
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onValueChange(undefined);
  };

  // Render icon for a department
  const renderIcon = (iconName: string, className?: string) => {
    const IconComponent = ICON_MAP[iconName] || Folder;
    return <IconComponent className={className} />;
  };

  return (
    <div className={cn('space-y-1', className)}>
      {/* Label */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Department
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      </div>

      {/* Select */}
      <div className="flex items-center gap-2">
        <Select
          value={value || ''}
          onValueChange={(v) => onValueChange(v || undefined)}
          disabled={disabled || isLoading}
          required={required}
        >
          <SelectTrigger
            className="w-full"
            aria-label="Select department for work item"
          >
            <SelectValue placeholder={isLoading ? 'Loading...' : placeholder}>
              {selectedDepartment && (
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: selectedDepartment.color }}
                    aria-hidden="true"
                  />
                  {renderIcon(selectedDepartment.icon, 'h-3.5 w-3.5 shrink-0')}
                  <span className="truncate">{selectedDepartment.name}</span>
                  {selectedDepartment.is_default && (
                    <span className="text-xs text-muted-foreground">(default)</span>
                  )}
                </div>
              )}
            </SelectValue>
          </SelectTrigger>

          <SelectContent>
            {error ? (
              <div className="py-2 px-3 text-sm text-red-500">{error}</div>
            ) : departments.length === 0 ? (
              <div className="py-2 px-3 text-sm text-muted-foreground">
                No departments yet
                {onAddDepartment && (
                  <Button
                    variant="link"
                    size="sm"
                    className="px-1 h-auto"
                    onClick={onAddDepartment}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add one
                  </Button>
                )}
              </div>
            ) : (
              <>
                {departments.map((dept) => (
                  <SelectItem
                    key={dept.id}
                    value={dept.id}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: dept.color }}
                        aria-hidden="true"
                      />
                      {renderIcon(dept.icon, 'h-3.5 w-3.5 shrink-0 text-muted-foreground')}
                      <span className="flex-1 truncate">{dept.name}</span>
                      {dept.is_default && (
                        <span className="text-xs text-muted-foreground shrink-0">(default)</span>
                      )}
                      <span className="text-xs text-muted-foreground shrink-0">
                        {dept.work_item_count}
                      </span>
                    </div>
                  </SelectItem>
                ))}

                {onAddDepartment && (
                  <>
                    <div className="h-px bg-border my-1" />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-muted-foreground hover:text-foreground"
                      onClick={onAddDepartment}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Department
                    </Button>
                  </>
                )}
              </>
            )}
          </SelectContent>
        </Select>

        {/* Clear button */}
        {allowClear && value && !disabled && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={handleClear}
            aria-label="Clear department selection"
          >
            <X className="h-4 w-4" />
          </Button>
        )}

        {/* Loading indicator */}
        {isLoading && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>
    </div>
  );
}

/**
 * Compact version without label
 */
export function CompactDepartmentSelector({
  value,
  onValueChange,
  teamId,
  disabled,
  className,
}: Omit<DepartmentSelectorProps, 'required' | 'allowClear' | 'placeholder' | 'onAddDepartment'>) {
  return (
    <DepartmentSelector
      value={value}
      onValueChange={onValueChange}
      teamId={teamId}
      disabled={disabled}
      required={false}
      allowClear={true}
      placeholder="Dept..."
      className={className}
    />
  );
}
