import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Saves an offline draft — a client-side JSON blob representing work done while offline.
 * Drafts are stored as a generic entity keyed by (user, job, draft_type).
 * The frontend calls this immediately when reconnecting, before syncOfflineDraft processes it.
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { job_id, draft_type, payload } = body;

  if (!job_id) return Response.json({ error: 'job_id required' }, { status: 400 });
  if (!draft_type) return Response.json({ error: 'draft_type required' }, { status: 400 });
  if (!payload) return Response.json({ error: 'payload required' }, { status: 400 });

  const jobs = await base44.asServiceRole.entities.Job.filter({ id: job_id, is_deleted: false });
  if (!jobs.length) return Response.json({ error: 'Job not found' }, { status: 404 });
  const job = jobs[0];

  const profiles = await base44.asServiceRole.entities.UserProfile.filter({ user_id: user.id, company_id: job.company_id, is_deleted: false });
  if (!profiles.length && user.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Use AuditLog with action='offline_draft' to persist the payload without a separate entity
  const draft = await base44.asServiceRole.entities.AuditLog.create({
    company_id: job.company_id,
    entity_type: draft_type,
    entity_id: job_id,
    action: 'offline_draft',
    actor_email: user.email,
    actor_id: user.id,
    description: `Offline draft: ${draft_type} for job ${job.job_number || job_id}`,
    metadata: { job_id, draft_type, payload, synced: false },
  });

  return Response.json({ draft_id: draft.id, status: 'saved' });
});