import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const READING_TYPES = ['moisture', 'environmental'];

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { job_id, room_id, reading_type, data } = body;

  if (!job_id || !room_id) return Response.json({ error: 'job_id and room_id required' }, { status: 400 });
  if (!READING_TYPES.includes(reading_type)) return Response.json({ error: `reading_type must be one of: ${READING_TYPES.join(', ')}` }, { status: 400 });

  const jobs = await base44.asServiceRole.entities.Job.filter({ id: job_id, is_deleted: false });
  if (!jobs.length) return Response.json({ error: 'Job not found' }, { status: 404 });
  const job = jobs[0];

  const profiles = await base44.asServiceRole.entities.UserProfile.filter({ user_id: user.id, company_id: job.company_id, is_deleted: false });
  if (!profiles.length && user.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const rooms = await base44.asServiceRole.entities.Room.filter({ id: room_id, job_id, is_deleted: false });
  if (!rooms.length) return Response.json({ error: 'Room not found or not part of this job' }, { status: 404 });

  const base = { company_id: job.company_id, job_id, room_id, recorded_by: user.email, recorded_at: new Date().toISOString(), is_deleted: false };

  let record;
  if (reading_type === 'moisture') {
    if (data.reading_value === undefined) return Response.json({ error: 'reading_value required for moisture' }, { status: 400 });
    record = await base44.asServiceRole.entities.MoistureReading.create({
      ...base,
      reading_value: Number(data.reading_value),
      unit: data.unit || '%WME',
      material: data.material || null,
      instrument: data.instrument || null,
      location_description: data.location_description || null,
    });
  } else {
    record = await base44.asServiceRole.entities.EnvironmentalReading.create({
      ...base,
      temperature_f: data.temperature_f != null ? Number(data.temperature_f) : undefined,
      relative_humidity: data.relative_humidity != null ? Number(data.relative_humidity) : undefined,
      dew_point: data.dew_point != null ? Number(data.dew_point) : undefined,
      gpp: data.gpp != null ? Number(data.gpp) : undefined,
      instrument: data.instrument || null,
    });
  }

  await base44.asServiceRole.entities.AuditLog.create({
    company_id: job.company_id,
    entity_type: reading_type === 'moisture' ? 'MoistureReading' : 'EnvironmentalReading',
    entity_id: record.id,
    action: 'created',
    actor_email: user.email,
    actor_id: user.id,
    description: `${reading_type} reading saved for room ${rooms[0].name} on job ${job.job_number || job_id}`,
    metadata: { job_id, room_id, reading_type },
  });

  return Response.json({ reading: record });
});