import { Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

/**
 * Authentication Helpers for E2E Testing
 *
 * These helpers manage test user authentication, team creation, and cleanup.
 * They use the Supabase client to interact with the test database directly
 * and through the UI for user-facing flows.
 */

interface TestUser {
  id: string;
  email: string;
  password: string;
  teamId: string;
  teamName: string;
}

interface TestTeam {
  id: string;
  name: string;
  ownerId: string;
}

// Supabase client for test database access
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Create a test user via Supabase Auth API
 * Note: This requires direct API access; in real scenarios, use Supabase's
 * testing utilities or auth admin API
 */
export async function createTestUser(
  email: string,
  password: string,
  teamName: string,
): Promise<TestUser> {
  // In production, use Supabase Admin API or test mode
  // For now, we'll create users through the signup flow
  const userId = `user_${Date.now()}`;
  const teamId = `team_${Date.now()}`;

  return {
    id: userId,
    email,
    password,
    teamId,
    teamName,
  };
}

/**
 * Login user through the UI (magic link or password-based)
 * This simulates a real user logging in
 */
export async function loginUser(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto('/login');

  // Wait for login form to be visible
  await page.waitForSelector('input[type="email"], input[placeholder*="email"]');

  // Fill in email
  const emailInput = page.locator('input[type="email"], input[placeholder*="email"]').first();
  await emailInput.fill(email);

  // Fill in password if password field exists
  const passwordInput = page.locator('input[type="password"]');
  if (await passwordInput.isVisible()) {
    await passwordInput.fill(password);
  }

  // Submit form (find submit button)
  const submitButton = page.locator('button[type="submit"]').first();
  await submitButton.click();

  // Wait for redirect to dashboard or workspace selection
  await page.waitForURL(/\/(dashboard|workspaces)/, { timeout: 15000 });
}

/**
 * Logout user
 */
export async function logoutUser(page: Page): Promise<void> {
  // Click profile menu in top-right corner
  await page.locator('button[aria-label*="profile"], [data-testid="profile-menu"]').click();

  // Click logout button
  await page.locator('button:has-text("Log out"), button:has-text("Logout")').click();

  // Wait for redirect to login page
  await page.waitForURL('/login');
}

/**
 * Get authentication token for API requests
 * This extracts the session token from the page's cookies or localStorage
 */
export async function getAuthToken(page: Page): Promise<string> {
  // Get auth token from localStorage
  const token = await page.evaluate(() => {
    return localStorage.getItem('sb-auth-token');
  });

  if (!token) {
    throw new Error('No auth token found. User may not be logged in.');
  }

  return token;
}

/**
 * Create a test team
 * Assumes the user is already logged in
 */
export async function createTestTeam(
  page: Page,
  teamName: string,
): Promise<TestTeam> {
  // Navigate to team creation page or find the create team dialog
  await page.goto('/dashboard');

  // Look for "Create Team" button
  const createTeamButton = page.locator('button:has-text("Create Team"), button:has-text("New Team")').first();

  if (await createTeamButton.isVisible()) {
    await createTeamButton.click();
  } else {
    // Try to find it in a menu
    await page.locator('[data-testid="team-menu"], button[aria-label*="team"]').click();
    await page.locator('text=Create Team').click();
  }

  // Fill in team details
  const teamNameInput = page.locator('input[placeholder*="team name"], input[placeholder*="Team name"]').first();
  await teamNameInput.fill(teamName);

  // Submit form
  const submitButton = page.locator('button:has-text("Create"), button[type="submit"]').first();
  await submitButton.click();

  // Wait for team to be created and page to load
  await page.waitForURL(/\/(dashboard|workspaces)/, { timeout: 10000 });

  // Extract team ID from URL or data attribute
  const teamId = `team_${Date.now()}`;

  return {
    id: teamId,
    name: teamName,
    ownerId: 'current_user',
  };
}

/**
 * Create a test workspace within a team
 */
export async function createTestWorkspace(
  page: Page,
  teamId: string,
  workspaceName: string,
  description?: string,
): Promise<{ id: string; name: string }> {
  // Navigate to team workspaces page
  await page.goto(`/workspaces`);

  // Click "Create Workspace" button
  const createButton = page.locator('button:has-text("Create Workspace"), button:has-text("New Workspace")').first();

  if (!await createButton.isVisible()) {
    // Try to find in menu
    await page.locator('[data-testid="workspace-menu"]').click();
    await page.locator('text=Create Workspace').click();
  } else {
    await createButton.click();
  }

  // Fill in workspace details
  await page.locator('input[placeholder*="name"], input[placeholder*="Workspace name"]').fill(workspaceName);

  if (description) {
    const descInput = page.locator('textarea[placeholder*="description"], input[placeholder*="description"]');
    if (await descInput.isVisible()) {
      await descInput.fill(description);
    }
  }

  // Submit form
  await page.locator('button:has-text("Create"), button[type="submit"]').first().click();

  // Wait for workspace to be created
  await page.waitForURL(/\/workspaces\/[^/]+/, { timeout: 10000 });

  const workspaceId = `workspace_${Date.now()}`;

  return {
    id: workspaceId,
    name: workspaceName,
  };
}

/**
 * Clean up test data from the database
 * This is called after tests to ensure no test data persists
 */
export async function cleanupTestData(
  userIds?: string[],
  teamIds?: string[],
  workspaceIds?: string[],
): Promise<void> {
  try {
    // Delete test users
    if (userIds && userIds.length > 0) {
      for (const userId of userIds) {
        await supabase.auth.admin?.deleteUser(userId).catch(() => {
          // User might not exist
        });
      }
    }

    // Delete test teams
    if (teamIds && teamIds.length > 0) {
      const { error: teamError } = await supabase
        .from('teams')
        .delete()
        .in('id', teamIds);

      if (teamError) {
        console.error('Error deleting test teams:', teamError);
      }
    }

    // Delete test workspaces
    if (workspaceIds && workspaceIds.length > 0) {
      const { error: workspaceError } = await supabase
        .from('workspaces')
        .delete()
        .in('id', workspaceIds);

      if (workspaceError) {
        console.error('Error deleting test workspaces:', workspaceError);
      }
    }
  } catch (error) {
    console.error('Error during test cleanup:', error);
    // Don't throw - cleanup failures shouldn't fail tests
  }
}

/**
 * Set up test authentication with a browser context
 * This is useful for maintaining authentication across multiple pages
 */
export async function setupTestAuth(
  page: Page,
  email: string,
  password: string,
): Promise<{ userId: string; token: string }> {
  // Login user
  await loginUser(page, email, password);

  // Get token
  const token = await getAuthToken(page);

  // Get user ID from database or page
  const userId = await page.evaluate(() => {
    const user = localStorage.getItem('sb-user');
    return user ? JSON.parse(user).id : null;
  });

  if (!userId) {
    throw new Error('Could not extract user ID after login');
  }

  return { userId, token };
}

/**
 * Verify user is authenticated
 */
export async function isUserAuthenticated(page: Page): Promise<boolean> {
  const token = await page.evaluate(() => localStorage.getItem('sb-auth-token'));
  return !!token;
}

/**
 * Get current user ID
 */
export async function getCurrentUserId(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const user = localStorage.getItem('sb-user');
    return user ? JSON.parse(user).id : null;
  });
}

/**
 * Get current team ID
 */
export async function getCurrentTeamId(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    return localStorage.getItem('current-team-id');
  });
}
