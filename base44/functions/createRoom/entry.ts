import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { job_id, name, room_type, floor_level, size_sqft, ceiling_height_ft, status, notes, affected_materials, contains_contents } = body;

  console.log('[createRoom] user.id:', user.id, '| user.email:', user.email, '| job_id:', job_id, '| name:', name);

  if (!job_id) return Response.json({ error: 'job_id required' }, { status: 400 });
  if (!name) return Response.json({ error: 'Room name required' }, { status: 400 });

  // Fetch the job using service role — we need to verify it exists and get company_id
  let job;
  try {
    job = await base44.asServiceRole.entities.Job.get(job_id);
    console.log('[createRoom] Job found:', { id: job?.id, company_id: job?.company_id, is_deleted: job?.is_deleted });
  } catch (err) {
    console.error('[createRoom] Job lookup error:', err?.message || err);
    job = null;
  }

  if (!job || job.is_deleted) {
    console.warn('[createRoom] Job not found or deleted for job_id:', job_id);
    return Response.json({ error: 'Job not found', job_id, detail: 'The job does not exist or has been deleted.' }, { status: 404 });
  }

  // Resolve user's company_id from UserProfile
  // Check all profiles for this user — pick one that matches job.company_id, or any with a company_id
  let userCompanyId = null;
  try {
    const profiles = await base44.asServiceRole.entities.UserProfile.filter({ user_id: user.id, is_deleted: false });
    console.log('[createRoom] UserProfiles found:', profiles.length, '| company_ids:', profiles.map(p => p.company_id));
    
    // Prefer a profile whose company_id matches the job's company_id
    const matchingProfile = profiles.find(p => p.company_id === job.company_id);
    if (matchingProfile) {
      userCompanyId = matchingProfile.company_id;
    } else {
      // Fall back to any profile with a company_id
      userCompanyId = profiles.find(p => p.company_id)?.company_id || null;
    }
    console.log('[createRoom] Resolved userCompanyId:', userCompanyId);
  } catch (err) {
    console.warn('[createRoom] UserProfile lookup failed:', err?.message);
  }

  // If still no company_id, allow if user is the job creator (fallback for onboarding edge cases)
  if (!userCompanyId) {
    if (job.created_by && (job.created_by === user.email || job.created_by === user.id)) {
      console.log('[createRoom] Fallback: user is job creator, granting access');
      userCompanyId = job.company_id;
    } else {
      console.warn('[createRoom] Cannot verify company membership — no UserProfile company_id and not job creator');
      return Response.json({
        error: 'Could not verify company membership',
        detail: 'UserProfile is missing company_id. Please complete company setup.',
      }, { status: 403 });
    }
  }

  // Company isolation check
  if (userCompanyId !== job.company_id) {
    console.warn('[createRoom] Company mismatch:', { userCompanyId, jobCompanyId: job.company_id });
    return Response.json({ error: 'Forbidden', detail: 'Job belongs to a different company.' }, { status: 403 });
  }

  // Create the room
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

  console.log('[createRoom] Room created:', { id: room.id, job_id, company_id: job.company_id });

  // Audit log (non-blocking)
  base44.asServiceRole.entities.AuditLog.create({
    company_id: job.company_id,
    entity_type: 'Room',
    entity_id: room.id,
    action: 'created',
    actor_email: user.email,
    actor_id: user.id,
    description: `Room "${name}" added to job ${job.job_number || job_id}`,
    metadata: { job_id },
  }).catch((err) => console.warn('[createRoom] Audit log failed:', err?.message));

  return Response.json({ room });
});