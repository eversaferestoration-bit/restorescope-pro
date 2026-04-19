import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { draft_id, line_items } = body; // line_items = updated array with possible unit_cost/quantity overrides

  if (!draft_id) return Response.json({ error: 'draft_id required' }, { status: 400 });

  const drafts = await base44.asServiceRole.entities.EstimateDraft.filter({ id: draft_id, is_deleted: false });
  if (!drafts.length) return Response.json({ error: 'Draft not found' }, { status: 404 });
  const draft = drafts[0];

  // Verify company membership
  if (user.role !== 'admin') {
    const profiles = await base44.asServiceRole.entities.UserProfile.filter({ user_id: user.id, company_id: draft.company_id, is_deleted: false });
    if (!profiles.length) return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (draft.status !== 'draft') {
    return Response.json({ error: 'Cannot recalculate an approved or superseded estimate.' }, { status: 400 });
  }

  // Validate overrides have reasons
  for (const item of line_items) {
    const original = draft.line_items?.find((o) => o.scope_item_id === item.scope_item_id);
    if (original && (item.unit_cost !== original.unit_cost || item.quantity !== original.quantity)) {
      if (!item.override_reason?.trim()) {
        return Response.json({
          error: 'override_reason_required',
          message: `Override reason required for: "${item.description}"`,
          item_description: item.description,
        }, { status: 422 });
      }
    }
  }

  // Recompute line totals
  const updatedItems = line_items.map((item) => ({
    ...item,
    line_total: +(item.unit_cost * item.quantity).toFixed(2),
  }));

  const subtotal = +updatedItems.reduce((s, l) => s + l.line_total, 0).toFixed(2);
  const total = +(subtotal * (draft.modifier_total || 1.0)).toFixed(2);

  const updated = await base44.asServiceRole.entities.EstimateDraft.update(draft_id, {
    line_items: updatedItems,
    subtotal,
    total,
  });

  await base44.asServiceRole.entities.AuditLog.create({
    company_id: draft.company_id,
    entity_type: 'EstimateDraft',
    entity_id: draft_id,
    action: 'recalculated',
    actor_email: user.email,
    actor_id: user.id,
    description: `Estimate recalculated — new total $${total.toLocaleString()}`,
    metadata: { draft_id, subtotal, total },
  });

  return Response.json({ draft: updated });
});