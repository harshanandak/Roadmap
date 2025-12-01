/**
 * Department [id] API Routes
 *
 * Operations on individual departments.
 *
 * Security:
 * - All team members can view departments (GET)
 * - Only admins/owners can update/delete departments (PATCH/DELETE)
 *
 * Endpoints:
 * - GET    /api/departments/[id] - Get single department
 * - PATCH  /api/departments/[id] - Update department (admin only)
 * - DELETE /api/departments/[id] - Delete department (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { DepartmentUpdate } from '@/lib/types/department';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/departments/[id]
 *
 * Get a single department with work item count.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Validate authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the department
    const { data: department, error } = await supabase
      .from('departments')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !department) {
      return NextResponse.json(
        { error: 'Department not found' },
        { status: 404 }
      );
    }

    // Validate team membership
    const { data: membership } = await supabase
      .from('team_members')
      .select('id')
      .eq('team_id', department.team_id)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: 'Not a team member' },
        { status: 403 }
      );
    }

    // Get work item count
    const { count } = await supabase
      .from('work_items')
      .select('id', { count: 'exact', head: true })
      .eq('department_id', id);

    return NextResponse.json({
      data: {
        ...department,
        work_item_count: count || 0,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/departments/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/departments/[id]
 *
 * Update a department.
 * Only admins/owners can update departments.
 *
 * Request body:
 * - name (optional): New department name
 * - description (optional): New description
 * - color (optional): New hex color
 * - icon (optional): New icon name
 * - is_default (optional): Set as default department
 * - sort_order (optional): New sort order
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    const body = await req.json() as DepartmentUpdate;

    // Validate authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the department first
    const { data: department, error: fetchError } = await supabase
      .from('departments')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !department) {
      return NextResponse.json(
        { error: 'Department not found' },
        { status: 404 }
      );
    }

    // Validate admin/owner role
    const { data: membership } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', department.team_id)
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
        { error: 'Only admins can update departments' },
        { status: 403 }
      );
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.name !== undefined) {
      updateData.name = body.name.trim();
    }
    if (body.description !== undefined) {
      updateData.description = body.description?.trim() || null;
    }
    if (body.color !== undefined) {
      updateData.color = body.color;
    }
    if (body.icon !== undefined) {
      updateData.icon = body.icon;
    }
    if (body.sort_order !== undefined) {
      updateData.sort_order = body.sort_order;
    }

    // Handle is_default separately
    if (body.is_default === true) {
      // Clear existing default first
      await supabase
        .from('departments')
        .update({ is_default: false })
        .eq('team_id', department.team_id)
        .eq('is_default', true)
        .neq('id', id);
      updateData.is_default = true;
    } else if (body.is_default === false) {
      updateData.is_default = false;
    }

    // Update the department
    const { data: updated, error: updateError } = await supabase
      .from('departments')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      // Handle unique constraint violation
      if (updateError.code === '23505') {
        return NextResponse.json(
          { error: 'A department with this name already exists' },
          { status: 400 }
        );
      }
      console.error('Error updating department:', updateError);
      return NextResponse.json(
        { error: 'Failed to update department' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('Error in PATCH /api/departments/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/departments/[id]
 *
 * Delete a department.
 * Only admins/owners can delete departments.
 * Cannot delete if department has assigned work items.
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Validate authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the department first
    const { data: department, error: fetchError } = await supabase
      .from('departments')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !department) {
      return NextResponse.json(
        { error: 'Department not found' },
        { status: 404 }
      );
    }

    // Validate admin/owner role
    const { data: membership } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', department.team_id)
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
        { error: 'Only admins can delete departments' },
        { status: 403 }
      );
    }

    // Check if department has assigned work items
    const { count } = await supabase
      .from('work_items')
      .select('id', { count: 'exact', head: true })
      .eq('department_id', id);

    if (count && count > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete department with ${count} assigned work item${count > 1 ? 's' : ''}. Please reassign or remove the department from these items first.`,
          work_item_count: count,
        },
        { status: 400 }
      );
    }

    // Delete the department
    const { error: deleteError } = await supabase
      .from('departments')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting department:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete department' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Department deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/departments/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
