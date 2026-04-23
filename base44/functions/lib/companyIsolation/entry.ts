/**
 * Company isolation enforcement for backend functions.
 *
 * Rules:
 * - "admin" platform role == platform_admin (can manage beta, invites, all companies)
 * - All other roles (including company-level admins) are NEVER cross-tenant
 * - UserProfile.company_id is the single source of truth for which company a user belongs to
 */

/**
 * Resolve the authenticated user's company_id from their UserProfile.
 * Returns the company_id string, or throws a 403 Response if not found.
 */
export async function getUserCompanyId(base44, userId) {
  const profiles = await base44.asServiceRole.entities.UserProfile.filter({
    user_id: userId,
    is_deleted: false,
  });
  const companyId = profiles[0]?.company_id;
  if (!companyId) {
    throw Response.json(
      { error: 'Forbidden', message: 'No company membership found for this user.' },
      { status: 403 }
    );
  }
  return companyId;
}

/**
 * Assert that the caller's company matches the target company_id.
 * platform_admin (user.role === 'admin') bypasses this check — they manage
 * ALL companies at the platform level.
 * Everyone else (including company-level admins) is strictly scoped.
 */
export async function assertCompanyAccess(base44, user, targetCompanyId) {
  if (!targetCompanyId) {
    throw Response.json(
      { error: 'Forbidden', message: 'Target company could not be determined.' },
      { status: 403 }
    );
  }
  // Platform admin has cross-tenant access (beta management, etc.)
  if (user.role === 'admin') return;

  const userCompanyId = await getUserCompanyId(base44, user.id);
  if (userCompanyId !== targetCompanyId) {
    throw Response.json(
      { error: 'Forbidden', message: 'Access denied: resource belongs to a different company.' },
      { status: 403 }
    );
  }
  return userCompanyId;
}

/**
 * Strictly enforce company isolation — no role bypass whatsoever.
 * Use this for actions where even platform_admin should not cross company lines
 * (e.g. modifying another company's jobs/rooms/photos/scope).
 * Returns the caller's company_id.
 */
export async function assertStrictCompanyAccess(base44, user, targetCompanyId) {
  if (!targetCompanyId) {
    throw Response.json(
      { error: 'Forbidden', message: 'Target company could not be determined.' },
      { status: 403 }
    );
  }
  const userCompanyId = await getUserCompanyId(base44, user.id);
  if (userCompanyId !== targetCompanyId) {
    throw Response.json(
      { error: 'Forbidden', message: 'Access denied: resource belongs to a different company.' },
      { status: 403 }
    );
  }
  return userCompanyId;
}

/**
 * Assert caller is a platform_admin (role === 'admin').
 */
export function assertPlatformAdmin(user) {
  if (user.role !== 'admin') {
    throw Response.json(
      { error: 'Forbidden', message: 'Platform admin access required.' },
      { status: 403 }
    );
  }
}