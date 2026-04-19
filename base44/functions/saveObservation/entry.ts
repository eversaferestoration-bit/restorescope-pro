import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { job_id, room_id, description, observation_type, severity } = body;

  if (!job_id) return Response.json({ error: 'job_id required' }, { status: 400 });
  if (!room_id) return Response.json({ error: 'room_id required' }, { status: 400 });
  if (!description) return Response.json({ error: 'description required' }, { status: 400 });

  const jobs = await base44.asServiceRole.entities.Job.filter({ id: job_id, is_deleted: false });
  if (!jobs.length) return Response.json({ error: 'Job not found' }, { status: 404 });
  const job = jobs[0];

  const profiles = await base44.asServiceRole.entities.UserProfile.filter({ user_id: user.id, company_id: job.company_id, is_deleted: false });
  if (!profiles.length && user.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const rooms = await base44.asServiceRole.entities.Room.filter({ id: room_id, job_id, is_deleted: false });
  if (!rooms.length) return Response.json({ error: 'Room not found or not part of this job' }, { status: 404 });

  const observation = await base44.asServiceRole.entities.Observation.create({
    company_id: job.company_id,
    job_id,
    room_id,
    description,
    observation_type: observation_type || null,
    severity: severity || null,
    recorded_by: user.email,
    recorded_at: new Date().toISOString(),
    is_deleted: false,
  });

  await base44.asServiceRole.entities.AuditLog.create({
    company_id: job.company_id,
    entity_type: 'Observation',
    entity_id: observation.id,
    action: 'created',
    actor_email: user.email,
    actor_id: user.id,
    description: `Observation added to room ${rooms[0].name} on job ${job.job_number || job_id}`,
    metadata: { job_id, room_id, severity },
  });

  return Response.json({ observation });
});