import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { job_id, name, room_type, floor_level, size_sqft, ceiling_height_ft, status, notes, affected_materials, contains_contents } = body;

  if (!job_id) return Response.json({ error: 'job_id required' }, { status: 400 });
  if (!name) return Response.json({ error: 'Room name required' }, { status: 400 });

  const jobs = await base44.asServiceRole.entities.Job.filter({ id: job_id, is_deleted: false });
  if (!jobs.length) return Response.json({ error: 'Job not found' }, { status: 404 });
  const job = jobs[0];

  const profiles = await base44.asServiceRole.entities.UserProfile.filter({ user_id: user.id, company_id: job.company_id, is_deleted: false });
  if (!profiles.length && user.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const room = await base44.asServiceRole.entities.Room.create({
    company_id: job.company_id,
    job_id,
    name,
    room_type: room_type || null,
    floor_level: floor_level || null,
    size_sqft: size_sqft ? Number(size_sqft) : undefined,
    ceiling_height_ft: ceiling_height_ft ? Number(ceiling_height_ft) : undefined,
    status: status || null,
    notes: notes || null,
    affected_materials: affected_materials || [],
    contains_contents: !!contains_contents,
    is_deleted: false,
  });

  await base44.asServiceRole.entities.AuditLog.create({
    company_id: job.company_id,
    entity_type: 'Room',
    entity_id: room.id,
    action: 'created',
    actor_email: user.email,
    actor_id: user.id,
    description: `Room "${name}" added to job ${job.job_number || job_id}`,
    metadata: { job_id },
  });

  return Response.json({ room });
});