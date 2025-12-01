/**
 * Departments API Routes
 *
 * CRUD operations for team-scoped departments.
 *
 * Security:
 * - All team members can view departments (SELECT)
 * - Only admins/owners can create departments (INSERT)
 *
 * Endpoints:
 * - GET  /api/departments?team_id=X - List departments for team
 * - POST /api/departments - Create a new department (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { DepartmentInsert } from '@/lib/types/department';

/**
 * GET /api/departments
 *
 * List departments for a team with work item counts.
 * Query params:
 * - team_id (required): The team to list departments for
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get('team_id');

    if (!teamId) {
      return NextResponse.json(
        { error: 'team_id is required' },
        { status: 400 }
      );
    }

    // Validate authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate team membership
    const { data: membership } = await supabase
      .from('team_members')
      .select('id')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: 'Not a team member' },
        { status: 403 }
      );
    }

    // Get departments with work item count
    const { data: departments, error } = await supabase
      .from('departments')
      .select('*')
      .eq('team_id', teamId)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching departments:', error);
      return NextResponse.json(
        { error: 'Failed to fetch departments' },
        { status: 500 }
      );
    }

    // Get work item counts for each department
    const departmentIds = departments.map(d => d.id);

    if (departmentIds.length > 0) {
      const { data: workItemCounts, error: countError } = await supabase
        .from('work_items')
        .select('department_id')
        .eq('team_id', teamId)
        .in('department_id', departmentIds);

      if (!countError && workItemCounts) {
        // Count work items per department
        const countMap = workItemCounts.reduce((acc, item) => {
          if (item.department_id) {
            acc[item.department_id] = (acc[item.department_id] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>);

        // Add counts to departments
        const departmentsWithStats = departments.map(dept => ({
          ...dept,
          work_item_count: countMap[dept.id] || 0,
        }));

        return NextResponse.json({ data: departmentsWithStats });
      }
    }

    // Return departments with zero counts if no work items
    const departmentsWithStats = departments.map(dept => ({
      ...dept,
      work_item_count: 0,
    }));

    return NextResponse.json({ data: departmentsWithStats });
  } catch (error) {
    console.error('Error in GET /api/departments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/departments
 *
 * Create a new department.
 * Only admins/owners can create departments.
 *
 * Request body:
 * - team_id (required): The team to create the department for
 * - name (required): Department name
 * - description (optional): Department description
 * - color (optional): Hex color (default: #6366f1)
 * - icon (optional): Lucide icon name (default: folder)
 * - is_default (optional): Make this the default department
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await req.json() as DepartmentInsert;

    const { team_id, name, description, color, icon, is_default } = body;

    // Validate required fields
    if (!team_id) {
      return NextResponse.json(
        { error: 'team_id is required' },
        { status: 400 }
      );
    }

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'name is required' },
        { status: 400 }
      );
    }

    // Validate authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate admin/owner role
    const { data: membership } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', team_id)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: 'Not a team member' },
        { status: 403 }
      );
    }

    if (!['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'Only admins can create departments' },
        { status: 403 }
      );
    }

    // Get the next sort_order
    const { data: existingDepts } = await supabase
      .from('departments')
      .select('sort_order')
      .eq('team_id', team_id)
      .order('sort_order', { ascending: false })
      .limit(1);

    const nextSortOrder = existingDepts && existingDepts.length > 0
      ? (existingDepts[0].sort_order + 1)
      : 0;

    // If setting as default, clear existing default first
    if (is_default) {
      await supabase
        .from('departments')
        .update({ is_default: false })
        .eq('team_id', team_id)
        .eq('is_default', true);
    }

    // Create the department with timestamp-based ID
    const { data: department, error } = await supabase
      .from('departments')
      .insert({
        id: Date.now().toString(),
        team_id,
        name: name.trim(),
        description: description?.trim() || null,
        color: color || '#6366f1',
        icon: icon || 'folder',
        is_default: is_default || false,
        sort_order: nextSortOrder,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      // Handle unique constraint violation
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A department with this name already exists' },
          { status: 400 }
        );
      }
      console.error('Error creating department:', error);
      return NextResponse.json(
        { error: 'Failed to create department' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { data: { ...department, work_item_count: 0 } },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/departments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
