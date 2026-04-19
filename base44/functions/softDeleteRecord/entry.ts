import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const DELETABLE_ENTITIES = ['Job', 'Room', 'Photo', 'Observation', 'MoistureReading', 'EnvironmentalReading', 'EquipmentLog', 'Containment', 'Claim'];
const ADMIN_ONLY_ENTITIES = ['Job', 'Claim'];

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { entity_type, entity_id } = body;

  if (!entity_type || !entity_id) return Response.json({ error: 'entity_type and entity_id required' }, { status: 400 });
  if (!DELETABLE_ENTITIES.includes(entity_type)) {
    return Response.json({ error: `Cannot delete entity type: ${entity_type}` }, { status: 400 });
  }
  if (ADMIN_ONLY_ENTITIES.includes(entity_type) && !['admin', 'manager'].includes(user.role)) {
    return Response.json({ error: `Forbidden: only admins/managers can delete ${entity_type}` }, { status: 403 });
  }

  const records = await base44.asServiceRole.entities[entity_type].filter({ id: entity_id, is_deleted: false });
  if (!records.length) return Response.json({ error: 'Record not found' }, { status: 404 });
  const record = records[0];

  // Resolve company_id from the record
  const company_id = record.company_id;
  if (company_id) {
    const profiles = await base44.asServiceRole.entities.UserProfile.filter({ user_id: user.id, company_id, is_deleted: false });
    if (!profiles.length && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: not a member of this company' }, { status: 403 });
    }
  }

  await base44.asServiceRole.entities[entity_type].update(entity_id, { is_deleted: true });

  await base44.asServiceRole.entities.AuditLog.create({
    company_id: company_id || '',
    entity_type,
    entity_id,
    action: 'deleted',
    actor_email: user.email,
    actor_id: user.id,
    description: `${entity_type} ${entity_id} soft-deleted`,
    metadata: { entity_type, entity_id },
  });

  return Response.json({ success: true });
});