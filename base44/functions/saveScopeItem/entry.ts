import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const VALID_CATEGORIES = ['containment', 'demolition', 'drying', 'cleaning', 'deodorization', 'hepa', 'contents', 'documentation'];
const VALID_SOURCES = ['rules_engine', 'ai_suggested', 'manual'];
const VALID_STATUSES = ['suggested', 'confirmed', 'rejected'];

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { action, item_id, job_id, room_id, category, description, unit, quantity, source, confidence, rule_id, status, notes } = body;
  // action: 'create' | 'update_status'

  if (!action) return Response.json({ error: 'action required (create|update_status)' }, { status: 400 });

  if (action === 'create') {
    if (!job_id) return Response.json({ error: 'job_id required' }, { status: 400 });
    if (!category || !VALID_CATEGORIES.includes(category)) return Response.json({ error: 'valid category required' }, { status: 400 });
    if (!description) return Response.json({ error: 'description required' }, { status: 400 });

    const job = await base44.asServiceRole.entities.Job.get(job_id).catch(() => null);
    if (!job || job.is_deleted) return Response.json({ error: 'Job not found' }, { status: 404 });

    if (user.role !== 'admin') {
      const profiles = await base44.asServiceRole.entities.UserProfile.filter({ user_id: user.id, company_id: job.company_id, is_deleted: false });
      if (!profiles.length) return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const item = await base44.asServiceRole.entities.ScopeItem.create({
      company_id: job.company_id,
      job_id,
      room_id: room_id || null,
      category,
      description,
      unit: unit || 'EA',
      quantity: quantity != null ? Number(quantity) : 1,
      source: VALID_SOURCES.includes(source) ? source : 'manual',
      confidence: confidence != null ? Number(confidence) : 1.0,
      rule_id: rule_id || null,
      status: VALID_STATUSES.includes(status) ? status : 'suggested',
      notes: notes || null,
      is_deleted: false,
    });

    return Response.json({ item });
  }

  if (action === 'update_status') {
    if (!item_id) return Response.json({ error: 'item_id required' }, { status: 400 });
    if (!status || !VALID_STATUSES.includes(status)) return Response.json({ error: 'valid status required' }, { status: 400 });

    // Technicians cannot confirm/reject
    if (user.role === 'technician') return Response.json({ error: 'Forbidden: technicians cannot update scope status' }, { status: 403 });

    const existing = await base44.asServiceRole.entities.ScopeItem.get(item_id).catch(() => null);
    if (!existing || existing.is_deleted) return Response.json({ error: 'Item not found' }, { status: 404 });

    if (user.role !== 'admin') {
      const profiles = await base44.asServiceRole.entities.UserProfile.filter({ user_id: user.id, company_id: existing.company_id, is_deleted: false });
      if (!profiles.length) return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updateData = { status };
    if (status === 'confirmed') {
      updateData.confirmed_by = user.email;
      updateData.confirmed_at = new Date().toISOString();
    }

    const item = await base44.asServiceRole.entities.ScopeItem.update(item_id, updateData);
    return Response.json({ item });
  }

  return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
});