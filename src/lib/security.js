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
 * @param {Object} base44 - Base44 SDK client
 * @returns {Promise<Object>} User object
 * @throws {Response} 401 if not authenticated
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
 * @param {Object} user - User object
 * @param {string} requiredRole - Minimum role required
 * @throws {Response} 403 if role insufficient
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
 * @param {Object} user - User object
 * @throws {Response} 403 if not admin
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
 * @param {Object} user - User object
 * @throws {Response} 403 if not manager+
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
 * @param {Object} base44 - Base44 SDK client
 * @param {Object} user - User object
 * @param {string} companyId - Company ID to verify
 * @throws {Response} 403 if no access
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
 * @param {Object} base44 - Base44 SDK client
 * @param {Object} user - User object
 * @param {Object} entity - Entity record
 * @throws {Response} 403 if entity belongs to different company
 */
export async function verifyEntityOwnership(base44, user, entity) {
  if (!entity?.company_id) {
    throw Response.json({ error: 'Forbidden', message: 'Invalid entity: missing company_id' }, { status: 403 });
  }
  
  await requireCompanyAccess(base44, user, entity.company_id);
}

/**
 * Log audit trail entry
 * @param {Object} base44 - Base44 SDK client
 * @param {Object} user - User object
 * @param {string} companyId - Company ID
 * @param {string} entityType - Entity type (e.g., 'Job', 'EstimateDraft')
 * @param {string} entityId - Entity ID
 * @param {string} action - Action performed
 * @param {string} description - Human-readable description
 * @param {Object} metadata - Additional metadata
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
    // Don't throw - audit logging should not block operations
  }
}

/**
 * Sanitize sensitive data from response
 * Removes pricing internals, cost data, and other sensitive fields
 * @param {Object} data - Data to sanitize
 * @param {Object} user - User object
 * @returns {Object} Sanitized data
 */
export function sanitizeResponse(data, user) {
  // Only admins and managers can see full pricing data
  const canSeePricing = user.role === 'admin' || user.role === 'manager';
  
  if (!canSeePricing && data?.line_items) {
    // Technicians can see quantities but not unit costs
    return {
      ...data,
      line_items: data.line_items.map(item => ({
        ...item,
        unit_cost: undefined, // Hide unit cost
        line_total: item.line_total, // Keep totals visible
      })),
    };
  }
  
  return data;
}

/**
 * Check if action is allowed for user role
 * @param {Object} user - User object
 * @param {string} action - Action to validate
 * @throws {Response} 403 if action not allowed
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
 * @param {Object} user - User object with created_date
 * @throws {Response} 401 if session expired
 */
export function validateSession(user) {
  if (!user?.created_date) {
    return; // Can't validate without timestamp
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
 * @param {Object} base44 - Base44 SDK client
 * @param {Object} user - Cached user object
 * @throws {Response} 403 if role changed
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