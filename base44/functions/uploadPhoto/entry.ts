import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const contentType = req.headers.get('content-type') || '';
  let job_id, room_id, caption, photo_type, taken_at, file_url, mime_type, file_size, taken_by, file;

  if (contentType.includes('multipart/form-data')) {
    // Direct browser upload via FormData
    const formData = await req.formData();
    file = formData.get('file');
    job_id = formData.get('job_id');
    room_id = formData.get('room_id') || null;
    caption = formData.get('caption') || null;
    photo_type = formData.get('photo_type') || null;
    taken_at = formData.get('taken_at') || new Date().toISOString();
  } else {
    // JSON path — file already uploaded, file_url provided
    const body = await req.json();
    job_id = body.job_id;
    room_id = body.room_id || null;
    caption = body.caption || null;
    photo_type = body.photo_type || null;
    taken_at = body.taken_at || new Date().toISOString();
    file_url = body.file_url;
    mime_type = body.mime_type || null;
    file_size = body.file_size || null;
    taken_by = body.taken_by || user.email;
  }

  if (!job_id) return Response.json({ error: 'job_id required' }, { status: 400 });
  if (!file && !file_url) return Response.json({ error: 'file or file_url required' }, { status: 400 });

  const jobs = await base44.asServiceRole.entities.Job.filter({ id: job_id, is_deleted: false });
  if (!jobs.length) return Response.json({ error: 'Job not found' }, { status: 404 });
  const job = jobs[0];

  // Strict company isolation — no role bypasses cross-tenant access
  const userProfiles = await base44.asServiceRole.entities.UserProfile.filter({ user_id: user.id, is_deleted: false });
  const userCompanyId = userProfiles[0]?.company_id;
  if (!userCompanyId || userCompanyId !== job.company_id) {
    return Response.json({ error: 'Forbidden', message: 'Access denied: resource belongs to a different company.' }, { status: 403 });
  }

  // If FormData path, upload the binary first
  if (file) {
    const uploaded = await base44.asServiceRole.integrations.Core.UploadFile({ file });
    file_url = uploaded.file_url;
    mime_type = file.type;
    file_size = file.size;
    taken_by = user.email;
  }

  const photo = await base44.asServiceRole.entities.Photo.create({
    company_id: job.company_id,
    job_id,
    room_id,
    file_url,
    mime_type: mime_type || null,
    file_size: file_size || null,
    taken_by: taken_by || user.email,
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
    metadata: { job_id, room_id, file_size: file_size || null },
  });

  return Response.json({ photo });
});