import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { job_id, room_id, equipment_type, model, serial_number, quantity, status, notes } = body;

  if (!job_id || !room_id) return Response.json({ error: 'job_id and room_id required' }, { status: 400 });
  if (!equipment_type) return Response.json({ error: 'equipment_type required' }, { status: 400 });

  let job;
  try { job = await base44.asServiceRole.entities.Job.get(job_id); } catch { job = null; }
  if (!job || job.is_deleted) return Response.json({ error: 'Job not found', job_id }, { status: 404 });

  const userProfiles = await base44.asServiceRole.entities.UserProfile.filter({ user_id: user.id, is_deleted: false });
  const userCompanyId = userProfiles[0]?.company_id;
  if (!userCompanyId || userCompanyId !== job.company_id) {
    return Response.json({ error: 'Forbidden', message: 'Access denied: resource belongs to a different company.' }, { status: 403 });
  }

  let room;
  try { room = await base44.asServiceRole.entities.Room.get(room_id); } catch { room = null; }
  if (!room || room.job_id !== job_id || room.is_deleted) return Response.json({ error: 'Room not found or not part of this job' }, { status: 404 });
  const rooms = [room];

  const log = await base44.asServiceRole.entities.EquipmentLog.create({
    company_id: job.company_id,
    job_id,
    room_id,
    equipment_type,
    model: model || null,
    serial_number: serial_number || null,
    quantity: quantity ? Number(quantity) : 1,
    status: status || 'placed',
    notes: notes || null,
    placed_by: user.email,
    placed_at: new Date().toISOString(),
    is_deleted: false,
  });

  await base44.asServiceRole.entities.AuditLog.create({
    company_id: job.company_id,
    entity_type: 'EquipmentLog',
    entity_id: log.id,
    action: 'created',
    actor_email: user.email,
    actor_id: user.id,
    description: `${equipment_type} logged in room ${rooms[0].name} on job ${job.job_number || job_id}`,
    metadata: { job_id, room_id, equipment_type, quantity },
  });

  return Response.json({ equipment_log: log });
});