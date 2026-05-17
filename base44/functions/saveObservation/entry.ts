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