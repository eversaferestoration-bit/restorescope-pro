import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Processes a previously saved offline draft, creating the real entity records.
 * Supported draft_types: observation, moisture_reading, environmental_reading, equipment_log, containment
 */
const HANDLERS = {
  async observation(base44, job, payload, user) {
    if (!payload.room_id || !payload.description) throw new Error('room_id and description required');
    return base44.asServiceRole.entities.Observation.create({
      company_id: job.company_id, job_id: job.id,
      room_id: payload.room_id, description: payload.description,
      observation_type: payload.observation_type || null, severity: payload.severity || null,
      recorded_by: user.email, recorded_at: payload.recorded_at || new Date().toISOString(), is_deleted: false,
    });
  },
  async moisture_reading(base44, job, payload, user) {
    if (!payload.room_id || payload.reading_value === undefined) throw new Error('room_id and reading_value required');
    return base44.asServiceRole.entities.MoistureReading.create({
      company_id: job.company_id, job_id: job.id,
      room_id: payload.room_id, reading_value: Number(payload.reading_value),
      unit: payload.unit || '%WME', material: payload.material || null,
      instrument: payload.instrument || null, location_description: payload.location_description || null,
      recorded_by: user.email, recorded_at: payload.recorded_at || new Date().toISOString(), is_deleted: false,
    });
  },
  async environmental_reading(base44, job, payload, user) {
    if (!payload.room_id) throw new Error('room_id required');
    const n = (v) => v != null ? Number(v) : undefined;
    return base44.asServiceRole.entities.EnvironmentalReading.create({
      company_id: job.company_id, job_id: job.id,
      room_id: payload.room_id, temperature_f: n(payload.temperature_f),
      relative_humidity: n(payload.relative_humidity), dew_point: n(payload.dew_point),
      gpp: n(payload.gpp), instrument: payload.instrument || null,
      recorded_by: user.email, recorded_at: payload.recorded_at || new Date().toISOString(), is_deleted: false,
    });
  },
  async equipment_log(base44, job, payload, user) {
    if (!payload.room_id || !payload.equipment_type) throw new Error('room_id and equipment_type required');
    return base44.asServiceRole.entities.EquipmentLog.create({
      company_id: job.company_id, job_id: job.id,
      room_id: payload.room_id, equipment_type: payload.equipment_type,
      model: payload.model || null, serial_number: payload.serial_number || null,
      quantity: payload.quantity ? Number(payload.quantity) : 1,
      status: payload.status || 'placed', notes: payload.notes || null,
      placed_by: user.email, placed_at: payload.placed_at || new Date().toISOString(), is_deleted: false,
    });
  },
  async containment(base44, job, payload, user) {
    if (!payload.room_id || !payload.containment_type) throw new Error('room_id and containment_type required');
    return base44.asServiceRole.entities.Containment.create({
      company_id: job.company_id, job_id: job.id,
      room_id: payload.room_id, containment_type: payload.containment_type,
      description: payload.description || null, status: payload.status || 'installed',
      installed_by: user.email, installed_at: payload.installed_at || new Date().toISOString(), is_deleted: false,
    });
  },
};

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { draft_id, job_id, draft_type, payload } = body;

  if (!job_id || !draft_type || !payload) return Response.json({ error: 'job_id, draft_type, payload required' }, { status: 400 });

  if (!HANDLERS[draft_type]) {
    return Response.json({ error: `Unsupported draft_type: ${draft_type}` }, { status: 400 });
  }

  const jobs = await base44.asServiceRole.entities.Job.filter({ id: job_id, is_deleted: false });
  if (!jobs.length) return Response.json({ error: 'Job not found' }, { status: 404 });
  const job = jobs[0];

  const profiles = await base44.asServiceRole.entities.UserProfile.filter({ user_id: user.id, company_id: job.company_id, is_deleted: false });
  if (!profiles.length && user.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const record = await HANDLERS[draft_type](base44, job, payload, user);

  await base44.asServiceRole.entities.AuditLog.create({
    company_id: job.company_id,
    entity_type: draft_type,
    entity_id: record.id,
    action: 'synced_from_offline',
    actor_email: user.email,
    actor_id: user.id,
    description: `Offline ${draft_type} synced for job ${job.job_number || job_id}`,
    metadata: { draft_id, job_id, draft_type },
  });

  return Response.json({ record, status: 'synced' });
});