/**
 * Department Types - Organizational Units Module
 *
 * Types for the departments system with:
 * - Team-scoped organizational categories
 * - Color and icon customization
 * - Sort order for custom ordering
 */

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Available department colors
 * These are curated Tailwind-friendly colors for department badges
 */
export const DEPARTMENT_COLORS = [
  { id: 'indigo', hex: '#6366f1', label: 'Indigo', bgClass: 'bg-indigo-100', textClass: 'text-indigo-700', borderClass: 'border-indigo-200' },
  { id: 'violet', hex: '#8b5cf6', label: 'Violet', bgClass: 'bg-violet-100', textClass: 'text-violet-700', borderClass: 'border-violet-200' },
  { id: 'blue', hex: '#3b82f6', label: 'Blue', bgClass: 'bg-blue-100', textClass: 'text-blue-700', borderClass: 'border-blue-200' },
  { id: 'emerald', hex: '#10b981', label: 'Emerald', bgClass: 'bg-emerald-100', textClass: 'text-emerald-700', borderClass: 'border-emerald-200' },
  { id: 'amber', hex: '#f59e0b', label: 'Amber', bgClass: 'bg-amber-100', textClass: 'text-amber-700', borderClass: 'border-amber-200' },
  { id: 'rose', hex: '#f43f5e', label: 'Rose', bgClass: 'bg-rose-100', textClass: 'text-rose-700', borderClass: 'border-rose-200' },
  { id: 'slate', hex: '#64748b', label: 'Slate', bgClass: 'bg-slate-100', textClass: 'text-slate-700', borderClass: 'border-slate-200' },
  { id: 'cyan', hex: '#06b6d4', label: 'Cyan', bgClass: 'bg-cyan-100', textClass: 'text-cyan-700', borderClass: 'border-cyan-200' },
] as const;

export type DepartmentColorId = typeof DEPARTMENT_COLORS[number]['id'];

/**
 * Available department icons (Lucide icon names)
 */
export const DEPARTMENT_ICONS = [
  { id: 'folder', label: 'Folder' },
  { id: 'code-2', label: 'Engineering' },
  { id: 'palette', label: 'Design' },
  { id: 'megaphone', label: 'Marketing' },
  { id: 'users', label: 'People' },
  { id: 'briefcase', label: 'Business' },
  { id: 'shield', label: 'Security' },
  { id: 'cog', label: 'Operations' },
  { id: 'flask-conical', label: 'Research' },
  { id: 'headphones', label: 'Support' },
  { id: 'bar-chart-3', label: 'Analytics' },
  { id: 'globe', label: 'International' },
] as const;

export type DepartmentIconId = typeof DEPARTMENT_ICONS[number]['id'];

/**
 * Preset department suggestions for quick setup
 */
export const DEPARTMENT_PRESETS = [
  { name: 'Engineering', color: '#6366f1', icon: 'code-2', description: 'Development & technical work' },
  { name: 'Design', color: '#8b5cf6', icon: 'palette', description: 'UI/UX and visual design' },
  { name: 'Product', color: '#10b981', icon: 'briefcase', description: 'Product management & strategy' },
  { name: 'Marketing', color: '#f59e0b', icon: 'megaphone', description: 'Marketing & growth' },
  { name: 'Operations', color: '#64748b', icon: 'cog', description: 'Operations & support' },
] as const;

// ============================================================================
// CORE TYPES
// ============================================================================

/**
 * Department - Core department entity from database
 */
export interface Department {
  id: string;
  team_id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  is_default: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

/**
 * Department with work item statistics
 */
export interface DepartmentWithStats extends Department {
  work_item_count: number;
}

// ============================================================================
// API TYPES
// ============================================================================

/**
 * Request body for creating a department
 */
export interface DepartmentInsert {
  team_id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  is_default?: boolean;
  sort_order?: number;
}

/**
 * Request body for updating a department
 */
export interface DepartmentUpdate {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  is_default?: boolean;
  sort_order?: number;
}

/**
 * API response for department list
 */
export interface DepartmentsResponse {
  data: DepartmentWithStats[];
  error?: string;
}

/**
 * API response for single department
 */
export interface DepartmentResponse {
  data: Department;
  error?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get color config by hex value
 */
export function getDepartmentColorConfig(hex: string) {
  return DEPARTMENT_COLORS.find(c => c.hex.toLowerCase() === hex.toLowerCase());
}

/**
 * Get icon config by id
 */
export function getDepartmentIconConfig(iconId: string) {
  return DEPARTMENT_ICONS.find(i => i.id === iconId);
}

/**
 * Get Tailwind classes for a department's color
 * Falls back to slate if color not found
 */
export function getDepartmentColorClasses(hex: string): {
  bgClass: string;
  textClass: string;
  borderClass: string;
} {
  const config = getDepartmentColorConfig(hex);
  if (config) {
    return {
      bgClass: config.bgClass,
      textClass: config.textClass,
      borderClass: config.borderClass,
    };
  }
  // Fallback for custom colors - use inline styles in component
  return {
    bgClass: 'bg-slate-100',
    textClass: 'text-slate-700',
    borderClass: 'border-slate-200',
  };
}

/**
 * Check if a color is a standard department color
 */
export function isStandardDepartmentColor(hex: string): boolean {
  return DEPARTMENT_COLORS.some(c => c.hex.toLowerCase() === hex.toLowerCase());
}
