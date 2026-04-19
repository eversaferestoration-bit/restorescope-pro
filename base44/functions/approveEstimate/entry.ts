import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Valid status transitions
const TRANSITIONS = {
  draft:     ['submitted'],
  submitted: ['approved', 'rejected', 'draft'],
  approved:  ['locked'],
  locked:    [],       // terminal — new version only
  rejected:  ['draft'],
};

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { draft_id, action, rejection_reason } = await req.json();
  // action: 'submit' | 'approve' | 'reject' | 'reopen' | 'lock' | 'new_version'
  if (!draft_id || !action) return Response.json({ error: 'draft_id and action required' }, { status: 400 });

  const drafts = await base44.asServiceRole.entities.EstimateDraft.filter({ id: draft_id, is_deleted: false });
  if (!drafts.length) return Response.json({ error: 'Draft not found' }, { status: 404 });
  const draft = drafts[0];

  // Verify caller belongs to this company
  if (user.role !== 'admin') {
    const profiles = await base44.asServiceRole.entities.UserProfile.filter({ user_id: user.id, company_id: draft.company_id, is_deleted: false });
    if (!profiles.length) return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Derive target status
  const ACTION_MAP = {
    submit:      { from: 'draft',      to: 'submitted' },
    approve:     { from: 'submitted',  to: 'approved' },
    reject:      { from: 'submitted',  to: 'rejected' },
    reopen:      null, // handled specially below — works from both 'rejected' and 'submitted'
    lock:        { from: 'approved',   to: 'locked' },
  };

  // Special case: reopen works from both 'submitted' and 'rejected' → back to 'draft'
  if (action === 'reopen') {
    if (!['submitted', 'rejected'].includes(draft.status)) {
      return Response.json({ error: `Cannot reopen an estimate with status "${draft.status}".` }, { status: 422 });
    }
    await base44.asServiceRole.entities.EstimateDraft.update(draft_id, { status: 'draft' });
    await base44.asServiceRole.entities.AuditLog.create({
      company_id: draft.company_id,
      entity_type: 'EstimateDraft',
      entity_id: draft_id,
      action: 'reopen',
      actor_email: user.email,
      actor_id: user.id,
      description: `Estimate v${draft.version_number} reopened as draft`,
      metadata: { job_id: draft.job_id, from: draft.status, to: 'draft' },
    });
    return Response.json({ success: true, status: 'draft' });
  }

  // new_version: clone approved/locked draft as new draft
  if (action === 'new_version') {
    if (!['approved', 'locked'].includes(draft.status)) {
      return Response.json({ error: 'Can only create a new version from an approved or locked estimate.' }, { status: 422 });
    }

    // Get next version number
    const allDrafts = await base44.asServiceRole.entities.EstimateDraft.filter({ job_id: draft.job_id, is_deleted: false });
    const nextVersion = Math.max(...allDrafts.map((d) => d.version_number || 1)) + 1;

    const newDraft = await base44.asServiceRole.entities.EstimateDraft.create({
      company_id: draft.company_id,
      job_id: draft.job_id,
      version_number: nextVersion,
      label: `Draft v${nextVersion}`,
      pricing_profile_id: draft.pricing_profile_id,
      status: 'draft',
      subtotal: draft.subtotal,
      modifier_total: draft.modifier_total,
      total: draft.total,
      applied_modifiers: draft.applied_modifiers,
      line_items: draft.line_items,
      created_by: user.email,
      notes: `Revised from v${draft.version_number}`,
      is_deleted: false,
    });

    await base44.asServiceRole.entities.AuditLog.create({
      company_id: draft.company_id,
      entity_type: 'EstimateDraft',
      entity_id: newDraft.id,
      action: 'new_version',
      actor_email: user.email,
      actor_id: user.id,
      description: `New estimate v${nextVersion} created from v${draft.version_number}`,
      metadata: { job_id: draft.job_id, source_draft_id: draft_id, version: nextVersion },
    });

    return Response.json({ draft: newDraft });
  }

  const transition = ACTION_MAP[action];
  if (!transition) return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });

  if (draft.status !== transition.from) {
    return Response.json({ error: `Cannot ${action} an estimate with status "${draft.status}". Expected "${transition.from}".` }, { status: 422 });
  }

  // Manager-only: approve and lock
  if (['approve', 'lock'].includes(action)) {
    const isManager = user.role === 'admin' || user.role === 'manager';
    if (!isManager) {
      return Response.json({ error: 'Manager approval required. Only admins or managers can approve estimates.' }, { status: 403 });
    }
  }

  const updateData = { status: transition.to };
  if (action === 'approve') {
    updateData.approved_by = user.email;
    updateData.approved_at = new Date().toISOString();
  }
  if (action === 'reject' && rejection_reason) {
    updateData.notes = rejection_reason;
  }

  await base44.asServiceRole.entities.EstimateDraft.update(draft_id, updateData);

  await base44.asServiceRole.entities.AuditLog.create({
    company_id: draft.company_id,
    entity_type: 'EstimateDraft',
    entity_id: draft_id,
    action,
    actor_email: user.email,
    actor_id: user.id,
    description: `Estimate v${draft.version_number} ${action}${action === 'reject' && rejection_reason ? `: ${rejection_reason}` : ''}`,
    metadata: { job_id: draft.job_id, from: transition.from, to: transition.to },
  });

  return Response.json({ success: true, status: transition.to });
});