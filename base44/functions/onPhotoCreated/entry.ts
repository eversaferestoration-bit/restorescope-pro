import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Automation handler: fires when a Photo record is created.
 */

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const body = await req.json();

  const entityData = body.data;
  if (!entityData?.company_id || entityData?.is_deleted) {
    return Response.json({ ok: true, skipped: true });
  }

  await base44.asServiceRole.functions.invoke('trackUsageEvent', {
    event_type: 'photo_uploaded',
    company_id: entityData.company_id,
    occurred_at: entityData.created_date || new Date().toISOString(),
    _from_automation: true,
  });

  return Response.json({ ok: true });
});