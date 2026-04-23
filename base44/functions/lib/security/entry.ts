/**
 * Security utilities for backend functions.
 * All company isolation checks enforce companyId from the USER's profile — never from the request payload.
 * Admin role does NOT bypass multi-tenant isolation.
 */

export const ROLE_HIERARCHY = {
  admin: 4,
  manager: 3,
  estimator: 2,
  technician: 1,
};

export const SESSION_CONFIG = {
  MAX_AGE_MS: 8 * 60 * 60 * 1000,
  WARNING_BEFORE_EXPIRY_MS: 15 * 60 * 1000,
  MAX_FAILED_ATTEMPTS: 5,
  LOCKOUT_DURATION_MS: 15 * 60 * 1000,
};

/**
 * Authenticate and return user. Throws 401 if not logged in.
 */
export async function requireAuth(base44) {
  const user = await base44.auth.me();
  if (!user) {
    throw Response.json({ error: 'Unauthorized', type: 'auth_required' }, { status: 401 });
  }
  return user;
}

/**
 * Resolve the calling user's company_id from their UserProfile.
 * NEVER trusts a client-supplied company_id as the user's company.
 * Returns the company_id string or throws 403 if no profile found.
 */
export async function resolveUserCompanyId(base44, user) {
  const profiles = await base44.asServiceRole.entities.UserProfile.filter({
    user_id: user.id,
    is_deleted: false,
  });
  if (!profiles.length) {
    throw Response.json({ error: 'Forbidden', message: 'No company profile found for this user.' }, { status: 403 });
  }
  const company_id = profiles[0].company_id;
  if (!company_id) {
    throw Response.json({ error: 'Forbidden', message: 'User is not associated with any company.' }, { status: 403 });
  }
  return company_id;
}

/**
 * Verify that a resource's company_id matches the calling user's company_id.
 * Admin role does NOT bypass this check — admins are still scoped to their own company.
 * Throws 403 if there is a mismatch.
 */
export async function requireCompanyAccess(base44, user, resourceCompanyId) {
  if (!resourceCompanyId) {
    throw Response.json({ error: 'Forbidden', message: 'Resource is missing company_id.' }, { status: 403 });
  }
  const userCompanyId = await resolveUserCompanyId(base44, user);
  if (userCompanyId !== resourceCompanyId) {
    throw Response.json({
      error: 'Forbidden',
      message: 'Access denied: resource belongs to a different company.',
    }, { status: 403 });
  }
}

/**
 * Verify an entity object belongs to the calling user's company.
 */
export async function verifyEntityOwnership(base44, user, entity) {
  if (!entity?.company_id) {
    throw Response.json({ error: 'Forbidden', message: 'Invalid entity: missing company_id.' }, { status: 403 });
  }
  await requireCompanyAccess(base44, user, entity.company_id);
}

/**
 * Require minimum role level. Throws 403 if insufficient.
 */
export function requireRole(user, requiredRole) {
  const userLevel = ROLE_HIERARCHY[user.role] || 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;
  if (userLevel < requiredLevel) {
    throw Response.json({
      error: 'Forbidden',
      message: `Role '${user.role}' insufficient. Requires '${requiredRole}' or higher.`,
    }, { status: 403 });
  }
}

/** Require admin role (within the user's own company). */
export function requireAdmin(user) {
  if (user.role !== 'admin') {
    throw Response.json({ error: 'Forbidden', message: 'Admin access required.' }, { status: 403 });
  }
}

/** Require manager or admin role. */
export function requireManager(user) {
  if (user.role !== 'admin' && user.role !== 'manager') {
    throw Response.json({ error: 'Forbidden', message: 'Manager or admin access required.' }, { status: 403 });
  }
}

/** Log audit trail entry. */
export async function logAudit(base44, user, companyId, entityType, entityId, action, description, metadata = {}) {
  try {
    await base44.asServiceRole.entities.AuditLog.create({
      company_id: companyId,
      entity_type: entityType,
      entity_id: entityId,
      action,
      actor_email: user.email,
      actor_id: user.id,
      description,
      metadata: { ...metadata, timestamp: new Date().toISOString(), user_role: user.role },
    });
  } catch (error) {
    console.error('Audit log failed:', error);
  }
}

/** Sanitize sensitive pricing data from response for non-managers. */
export function sanitizeResponse(data, user) {
  const canSeePricing = user.role === 'admin' || user.role === 'manager';
  if (!canSeePricing && data?.line_items) {
    return {
      ...data,
      line_items: data.line_items.map((item) => ({ ...item, unit_cost: undefined })),
    };
  }
  return data;
}

/**
 * validateSession — REMOVED.
 * Session validity is determined solely by the platform auth token.
 * Using created_date as a session timestamp caused all accounts older
 * than MAX_AGE_MS to be immediately logged out.
 */
export function validateSession(_user) {
  // No-op
}

/** Check if user role changed (force logout). */
export async function checkRoleIntegrity(base44, user) {
  const freshUser = await base44.auth.me();
  if (!freshUser) {
    throw Response.json({ error: 'Unauthorized', type: 'auth_required' }, { status: 401 });
  }
  if (freshUser.role !== user.role) {
    throw Response.json({
      error: 'Forbidden',
      type: 'role_changed',
      message: 'Your access permissions have changed. Please log in again.',
    }, { status: 403 });
  }
}