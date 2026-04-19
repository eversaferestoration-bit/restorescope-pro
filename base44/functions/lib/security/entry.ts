/**
 * Security utilities for backend functions
 * Provides role validation, company isolation, session management, and audit logging
 */

// Role hierarchy and permissions
export const ROLE_HIERARCHY = {
  admin: 4,
  manager: 3,
  estimator: 2,
  technician: 1,
};

export const ADMIN_ONLY_ACTIONS = ['approve', 'lock', 'delete', 'new_version'];
export const MANAGER_PLUS_ACTIONS = ['approve', 'lock', 'submit'];

// Session configuration
export const SESSION_CONFIG = {
  MAX_AGE_MS: 8 * 60 * 60 * 1000, // 8 hours
  WARNING_BEFORE_EXPIRY_MS: 15 * 60 * 1000, // 15 minutes warning
  MAX_FAILED_ATTEMPTS: 5,
  LOCKOUT_DURATION_MS: 15 * 60 * 1000, // 15 minutes
};

/**
 * Validate user authentication and return user object
 */
export async function requireAuth(base44) {
  const user = await base44.auth.me();
  if (!user) {
    throw Response.json({ error: 'Unauthorized', type: 'auth_required' }, { status: 401 });
  }
  return user;
}

/**
 * Validate user has minimum required role
 */
export function requireRole(user, requiredRole) {
  const userLevel = ROLE_HIERARCHY[user.role] || 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;
  
  if (userLevel < requiredLevel) {
    throw Response.json({ 
      error: 'Forbidden', 
      message: `Role '${user.role}' insufficient. Requires '${requiredRole}' or higher.` 
    }, { status: 403 });
  }
}

/**
 * Validate user is admin
 */
export function requireAdmin(user) {
  if (user.role !== 'admin') {
    throw Response.json({ 
      error: 'Forbidden', 
      message: 'Admin access required for this operation.' 
    }, { status: 403 });
  }
}

/**
 * Validate user is manager or admin
 */
export function requireManager(user) {
  if (user.role !== 'admin' && user.role !== 'manager') {
    throw Response.json({ 
      error: 'Forbidden', 
      message: 'Manager or admin access required for this operation.' 
    }, { status: 403 });
  }
}

/**
 * Verify user has access to a specific company
 */
export async function requireCompanyAccess(base44, user, companyId) {
  if (!companyId) {
    throw Response.json({ error: 'Forbidden', message: 'Company ID required' }, { status: 403 });
  }
  
  // Admins have universal access
  if (user.role === 'admin') {
    return;
  }
  
  // Verify user profile exists for this company
  const profiles = await base44.asServiceRole.entities.UserProfile.filter({ 
    user_id: user.id, 
    company_id: companyId, 
    is_deleted: false 
  });
  
  if (!profiles.length) {
    throw Response.json({ 
      error: 'Forbidden', 
      message: 'Access denied: You are not a member of this company.' 
    }, { status: 403 });
  }
}

/**
 * Verify entity belongs to user's company (company isolation)
 */
export async function verifyEntityOwnership(base44, user, entity) {
  if (!entity?.company_id) {
    throw Response.json({ error: 'Forbidden', message: 'Invalid entity: missing company_id' }, { status: 403 });
  }
  
  await requireCompanyAccess(base44, user, entity.company_id);
}

/**
 * Log audit trail entry
 */
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
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
        user_role: user.role,
      },
    });
  } catch (error) {
    console.error('Audit log failed:', error);
  }
}

/**
 * Sanitize sensitive data from response
 */
export function sanitizeResponse(data, user) {
  const canSeePricing = user.role === 'admin' || user.role === 'manager';
  
  if (!canSeePricing && data?.line_items) {
    return {
      ...data,
      line_items: data.line_items.map(item => ({
        ...item,
        unit_cost: undefined,
        line_total: item.line_total,
      })),
    };
  }
  
  return data;
}

/**
 * Check if action is allowed for user role
 */
export function validateAction(user, action) {
  if (ADMIN_ONLY_ACTIONS.includes(action)) {
    requireAdmin(user);
  } else if (MANAGER_PLUS_ACTIONS.includes(action)) {
    requireManager(user);
  }
}

/**
 * Validate session is not expired
 */
export function validateSession(user) {
  if (!user?.created_date) {
    return;
  }
  
  const sessionStart = new Date(user.created_date);
  const now = new Date();
  const sessionAge = now - sessionStart;
  
  if (sessionAge > SESSION_CONFIG.MAX_AGE_MS) {
    throw Response.json({ 
      error: 'Session expired', 
      type: 'session_expired',
      message: 'Your session has expired. Please log in again.' 
    }, { status: 401 });
  }
}

/**
 * Check if user role changed since login (force logout)
 */
export async function checkRoleIntegrity(base44, user) {
  const freshUser = await base44.auth.me();
  if (!freshUser) {
    throw Response.json({ error: 'Unauthorized', type: 'auth_required' }, { status: 401 });
  }
  
  if (freshUser.role !== user.role) {
    throw Response.json({ 
      error: 'Forbidden', 
      type: 'role_changed',
      message: 'Your access permissions have changed. Please log in again.' 
    }, { status: 403 });
  }
}