import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file');
  const job_id = formData.get('job_id');
  const room_id = formData.get('room_id') || null;
  const caption = formData.get('caption') || null;
  const photo_type = formData.get('photo_type') || null;
  const taken_at = formData.get('taken_at') || new Date().toISOString();

  if (!file || !job_id) return Response.json({ error: 'file and job_id required' }, { status: 400 });

  const jobs = await base44.asServiceRole.entities.Job.filter({ id: job_id, is_deleted: false });
  if (!jobs.length) return Response.json({ error: 'Job not found' }, { status: 404 });
  const job = jobs[0];

  const profiles = await base44.asServiceRole.entities.UserProfile.filter({ user_id: user.id, company_id: job.company_id, is_deleted: false });
  if (!profiles.length && user.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({ file });

  const photo = await base44.asServiceRole.entities.Photo.create({
    company_id: job.company_id,
    job_id,
    room_id,
    file_url,
    mime_type: file.type,
    file_size: file.size,
    taken_by: user.email,
    taken_at,
    caption,
    photo_type,
    sync_status: 'uploaded',
    offline_status: 'synced',
    analysis_status: 'analysis_pending',
    is_deleted: false,
  });

  await base44.asServiceRole.entities.AuditLog.create({
    company_id: job.company_id,
    entity_type: 'Photo',
    entity_id: photo.id,
    action: 'created',
    actor_email: user.email,
    actor_id: user.id,
    description: `Photo uploaded for job ${job.job_number || job_id}`,
    metadata: { job_id, room_id, file_size: file.size },
  });

  return Response.json({ photo });
});