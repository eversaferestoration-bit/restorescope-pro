import { base44 } from '@/api/base44Client';

/**
 * Log an action to AuditLog.
 * @param {object} user - Current user from useAuth()
 * @param {string} entityType - e.g. 'Job'
 * @param {string} entityId - ID of the affected record
 * @param {string} action - e.g. 'created', 'updated', 'deleted'
 * @param {string} description - Human-readable description
 * @param {object} [metadata] - Optional extra data
 */
export async function logAction(user, entityType, entityId, action, description, metadata = {}) {
  await base44.entities.AuditLog.create({
    company_id: user?.company_id || '',
    entity_type: entityType,
    entity_id: entityId,
    action,
    actor_email: user?.email || 'unknown',
    actor_id: user?.id || '',
    description,
    metadata,
  });
}