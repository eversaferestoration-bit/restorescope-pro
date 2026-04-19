import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { job_id, room_id, equipment_type, model, serial_number, quantity, status, notes } = body;

  if (!job_id || !room_id) return Response.json({ error: 'job_id and room_id required' }, { status: 400 });
  if (!equipment_type) return Response.json({ error: 'equipment_type required' }, { status: 400 });

  const jobs = await base44.asServiceRole.entities.Job.filter({ id: job_id, is_deleted: false });
  if (!jobs.length) return Response.json({ error: 'Job not found' }, { status: 404 });
  const job = jobs[0];

  const profiles = await base44.asServiceRole.entities.UserProfile.filter({ user_id: user.id, company_id: job.company_id, is_deleted: false });
  if (!profiles.length && user.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const rooms = await base44.asServiceRole.entities.Room.filter({ id: room_id, job_id, is_deleted: false });
  if (!rooms.length) return Response.json({ error: 'Room not found or not part of this job' }, { status: 404 });

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