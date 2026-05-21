import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const STAGES = ['new', 'contacted', 'inspection_scheduled', 'estimate_sent', 'follow_up', 'won', 'lost'];
const STAGE_ORDER = { new: 0, contacted: 1, inspection_scheduled: 2, estimate_sent: 3, follow_up: 4, won: 5, lost: 6 };

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { lead_id, stage } = body;

  if (!lead_id || !stage) return Response.json({ error: 'lead_id and stage required' }, { status: 400 });
  if (!STAGES.includes(stage)) return Response.json({ error: 'Invalid stage' }, { status: 400 });

  let lead;
  try { lead = await base44.asServiceRole.entities.CRMLead.get(lead_id); } catch { lead = null; }
  if (!lead || lead.is_deleted) return Response.json({ error: 'Lead not found' }, { status: 404 });

  const userProfiles = await base44.asServiceRole.entities.UserProfile.filter({ user_id: user.id, is_deleted: false });
  const userCompanyId = userProfiles[0]?.company_id;
  if (!userCompanyId || userCompanyId !== lead.company_id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Update lead stage — INSTANT
  const updated = await base44.asServiceRole.entities.CRMLead.update(lead_id, {
    pipeline_stage: stage,
    stage_order: STAGE_ORDER[stage],
    stage_changed_at: new Date().toISOString(),
    last_activity_at: new Date().toISOString(),
  });

  // Log activity (non-blocking)
  base44.asServiceRole.entities.LeadActivity.create({
    company_id: lead.company_id,
    lead_id,
    activity_type: 'stage_change',
    description: `Lead moved to ${stage}`,
    metadata: { from_stage: lead.pipeline_stage, to_stage: stage },
    actor_email: user.email,
  }).catch(() => {});

  return Response.json({ lead: updated });
});