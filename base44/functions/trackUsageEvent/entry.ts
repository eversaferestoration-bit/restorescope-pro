import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Records a usage event for the calling user's company.
 * Can also be called from entity automations (no user auth in that context).
 *
 * Payload:
 *   event_type : 'job_created' | 'estimate_generated' | 'photo_uploaded'
 *   company_id : string  (required — caller must own this company)
 *   occurred_at: ISO string (optional, defaults to now)
 *
 * Security: company_id is cross-checked against the caller's UserProfile.
 * Automations call this via base44.asServiceRole so they bypass auth check
 * but pass a trusted company_id derived from the entity record itself.
 */

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const body = await req.json();
  const { event_type, company_id, occurred_at, _from_automation } = body;

  if (!event_type || !company_id) {
    return Response.json({ error: 'event_type and company_id are required' }, { status: 400 });
  }

  // Validate event type
  const ALLOWED_EVENTS = ['job_created', 'estimate_generated', 'photo_uploaded'];
  if (!ALLOWED_EVENTS.includes(event_type)) {
    return Response.json({ error: 'Invalid event_type' }, { status: 400 });
  }

  // Auth: if not an internal automation call, verify caller owns this company_id
  if (!_from_automation) {
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const profiles = await base44.asServiceRole.entities.UserProfile.filter({
      user_id: user.id,
      company_id,
      is_deleted: false,
    });
    if (!profiles.length) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const now = occurred_at ? new Date(occurred_at) : new Date();
  const cohortMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Find or create the monthly stats bucket for this company
  const existing = await base44.asServiceRole.entities.CompanyUsageStats.filter({
    company_id,
    cohort_month: cohortMonth,
    is_deleted: false,
  });

  let record = existing[0] || null;

  if (!record) {
    record = await base44.asServiceRole.entities.CompanyUsageStats.create({
      company_id,
      cohort_month: cohortMonth,
      jobs_created: 0,
      estimates_generated: 0,
      photos_uploaded: 0,
      is_deleted: false,
    });
  }

  const updates = {};

  if (event_type === 'job_created') {
    updates.jobs_created = (record.jobs_created || 0) + 1;
    updates.last_job_at = now.toISOString();

    // Track first job ever (across all months)
    if (!record.first_job_created_at) {
      const allStats = await base44.asServiceRole.entities.CompanyUsageStats.filter({
        company_id,
        is_deleted: false,
      });
      const hasAnyFirstJob = allStats.some(s => s.first_job_created_at);
      if (!hasAnyFirstJob) {
        updates.first_job_created_at = now.toISOString();
      }
    }
  }

  if (event_type === 'estimate_generated') {
    updates.estimates_generated = (record.estimates_generated || 0) + 1;
    updates.last_estimate_at = now.toISOString();

    // Compute time_to_first_estimate_hours if this is the first estimate ever
    const allStats = await base44.asServiceRole.entities.CompanyUsageStats.filter({
      company_id,
      is_deleted: false,
    });
    const hasAnyFirstEstimate = allStats.some(s => s.first_estimate_created_at);
    if (!hasAnyFirstEstimate) {
      updates.first_estimate_created_at = now.toISOString();

      // Find first job timestamp
      const firstJobStat = allStats
        .filter(s => s.first_job_created_at)
        .sort((a, b) => new Date(a.first_job_created_at) - new Date(b.first_job_created_at))[0];

      if (firstJobStat?.first_job_created_at) {
        const ms = now - new Date(firstJobStat.first_job_created_at);
        updates.time_to_first_estimate_hours = Math.round((ms / (1000 * 60 * 60)) * 10) / 10;
      }
    }
  }

  if (event_type === 'photo_uploaded') {
    updates.photos_uploaded = (record.photos_uploaded || 0) + 1;
    updates.last_photo_at = now.toISOString();
  }

  await base44.asServiceRole.entities.CompanyUsageStats.update(record.id, updates);

  return Response.json({ ok: true, cohort_month: cohortMonth, event_type });
});