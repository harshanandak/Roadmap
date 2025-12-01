'use client';

import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  getDepartmentColorClasses,
  isStandardDepartmentColor,
  type Department,
} from '@/lib/types/department';
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

interface DepartmentBadgeProps {
  /** Department data - if null, nothing is rendered */
  department: Department | null | undefined;
  /** Badge size variant */
  size?: 'sm' | 'default';
  /** Whether to show the department icon */
  showIcon?: boolean;
  /** Whether to show tooltip with description on hover */
  showTooltip?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Click handler (optional) */
  onClick?: () => void;
}

/**
 * DepartmentBadge
 *
 * Displays a department as a colored badge with optional icon.
 * Uses the department's color for styling.
 *
 * @example
 * <DepartmentBadge department={selectedDepartment} />
 * <DepartmentBadge department={dept} size="sm" showIcon />
 */
export function DepartmentBadge({
  department,
  size = 'default',
  showIcon = true,
  showTooltip = false,
  className,
  onClick,
}: DepartmentBadgeProps) {
  // Don't render anything if no department
  if (!department) {
    return null;
  }

  const IconComponent = ICON_MAP[department.icon] || Folder;
  const isStandardColor = isStandardDepartmentColor(department.color);
  const colorClasses = getDepartmentColorClasses(department.color);

  // Size-specific classes
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0 h-5',
    default: 'text-sm px-2 py-0.5 h-6',
  };

  const iconSizeClasses = {
    sm: 'h-3 w-3',
    default: 'h-3.5 w-3.5',
  };

  // Build the badge
  const badge = (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 font-medium border cursor-default transition-colors',
        sizeClasses[size],
        onClick && 'cursor-pointer hover:opacity-80',
        // Use Tailwind classes if standard color, otherwise use inline styles
        isStandardColor && [
          colorClasses.bgClass,
          colorClasses.textClass,
          colorClasses.borderClass,
        ],
        className
      )}
      style={
        !isStandardColor
          ? {
              backgroundColor: `${department.color}15`, // 15 = ~8% opacity
              color: department.color,
              borderColor: `${department.color}40`, // 40 = ~25% opacity
            }
          : undefined
      }
      onClick={onClick}
    >
      {showIcon && <IconComponent className={iconSizeClasses[size]} />}
      <span>{department.name}</span>
      {department.is_default && size === 'default' && (
        <span className="text-[10px] opacity-60">(default)</span>
      )}
    </Badge>
  );

  // Wrap with tooltip if requested
  if (showTooltip && department.description) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{badge}</TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs text-sm">{department.description}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badge;
}

/**
 * DepartmentBadgeSkeleton
 *
 * Loading placeholder for department badge.
 */
export function DepartmentBadgeSkeleton({
  size = 'default',
  className,
}: {
  size?: 'sm' | 'default';
  className?: string;
}) {
  const sizeClasses = {
    sm: 'h-5 w-16',
    default: 'h-6 w-20',
  };

  return (
    <div
      className={cn(
        'animate-pulse bg-slate-200 rounded-full',
        sizeClasses[size],
        className
      )}
    />
  );
}
