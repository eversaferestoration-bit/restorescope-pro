import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Tracks adjuster behavior when estimates are approved or rejected.
 * Called automatically on estimate status changes.
 * Updates AdjusterBehavior entity with outcomes.
 * Access: Owner_Admin and Manager only.
 */

const FORBIDDEN = Response.json(
  { success: false, message: 'Forbidden', code: 'FORBIDDEN' },
  { status: 403 }
);

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Role check — always read from auth context, never trust client-supplied values
  const allowedRoles = ['admin', 'manager'];
  if (!allowedRoles.includes(user.role)) {
    base44.asServiceRole.entities.AuditLog.create({
      company_id: user.company_id || '',
      entity_type: 'function',
      entity_id: 'trackAdjusterOutcome',
      action: 'forbidden',
      actor_email: user.email,
      actor_id: user.id,
      description: `Forbidden access attempt to trackAdjusterOutcome by role: ${user.role}`,
    }).catch(() => {});
    return FORBIDDEN;
  }

  const body = await req.json();
  const {
    estimate_version_id,
    action, // 'approved' | 'rejected'
    adjustment_amount,
    rejected_categories,
    response_time_days
  } = body;

  if (!estimate_version_id || !action) {
    return Response.json({ error: 'estimate_version_id and action required' }, { status: 400 });
  }

  try {
    // Fetch estimate to get job and adjuster info
    const estimates = await base44.asServiceRole.entities.EstimateDraft.filter({
      id: estimate_version_id,
      is_deleted: false
    });

    if (!estimates.length) {
      return Response.json({ error: 'Estimate not found' }, { status: 404 });
    }

    const estimate = estimates[0];

    // Validate same-company access
    if (estimate.company_id && user.company_id && estimate.company_id !== user.company_id) {
      base44.asServiceRole.entities.AuditLog.create({
        company_id: user.company_id,
        entity_type: 'function',
        entity_id: 'trackAdjusterOutcome',
        action: 'forbidden',
        actor_email: user.email,
        actor_id: user.id,
        description: `Cross-company access attempt on estimate ${estimate_version_id}`,
      }).catch(() => {});
      return FORBIDDEN;
    }

    // Fetch job to get adjuster
    const jobs = await base44.asServiceRole.entities.Job.filter({
      id: estimate.job_id,
      is_deleted: false
    });

    if (!jobs.length) {
      return Response.json({ error: 'Job not found' }, { status: 404 });
    }

    const job = jobs[0];

    // Extra company guard on the job itself
    if (job.company_id && user.company_id && job.company_id !== user.company_id) {
      return FORBIDDEN;
    }

    if (!job.claim_id) {
      return Response.json({ error: 'No claim/adjuster associated with this job' }, { status: 400 });
    }

    const claims = await base44.asServiceRole.entities.Claim.filter({
      id: job.claim_id,
      is_deleted: false
    });

    if (!claims.length) {
      return Response.json({ error: 'Claim not found' }, { status: 404 });
    }

    const claim = claims[0];
    const adjuster_id = claim.adjuster_id;

    if (!adjuster_id) {
      return Response.json({ error: 'No adjuster assigned to this claim' }, { status: 400 });
    }

    // Fetch or create adjuster behavior record
    const behaviorRecords = await base44.asServiceRole.entities.AdjusterBehavior.filter({
      adjuster_id,
      is_deleted: false
    });

    const behavior = behaviorRecords[0];

    // Calculate metrics based on action
    const updateData = {
      adjuster_id,
      total_interactions: (behavior?.total_interactions || 0) + 1,
      last_updated: new Date().toISOString(),
    };

    if (action === 'approved') {
      const total = (behavior?.total_interactions || 0) + 1;
      const approved = ((behavior?.approval_rate || 0) * (total - 1) / 100) + 1;
      updateData.approval_rate = (approved / total) * 100;

      if (adjustment_amount && adjustment_amount > 0) {
        const originalTotal = estimate.total || 0;
        const reductionPercent = (adjustment_amount / originalTotal) * 100;
        const prevAvg = behavior?.avg_reduction_percent || 0;
        const prevCount = (behavior?.total_interactions || 0);
        updateData.avg_reduction_percent = ((prevAvg * prevCount) + reductionPercent) / (prevCount + 1);
      }
    } else if (action === 'rejected') {
      const total = (behavior?.total_interactions || 0) + 1;
      const approved = (behavior?.approval_rate || 0) * (total - 1) / 100;
      updateData.approval_rate = (approved / total) * 100;

      if (rejected_categories && rejected_categories.length > 0) {
        const existingCategories = behavior?.common_rejected_categories || [];
        const categoryCounts = {};
        [...existingCategories, ...rejected_categories].forEach(cat => {
          categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        });
        updateData.common_rejected_categories = Object.entries(categoryCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([cat]) => cat);
      }
    }

    if (response_time_days) {
      const prevAvg = behavior?.avg_response_time_days || 0;
      const prevCount = (behavior?.total_interactions || 0);
      updateData.avg_response_time_days = ((prevAvg * prevCount) + response_time_days) / (prevCount + 1);
    }

    let adjuster_name = 'Unknown';

    if (behavior) {
      await base44.asServiceRole.entities.AdjusterBehavior.update(behavior.id, updateData);
    } else {
      if (claim.adjuster_id) {
        const adjusters = await base44.asServiceRole.entities.Adjuster.filter({
          id: claim.adjuster_id,
          is_deleted: false
        });
        if (adjusters.length) adjuster_name = adjusters[0].full_name;
      }

      await base44.asServiceRole.entities.AdjusterBehavior.create({
        adjuster_id,
        adjuster_name,
        carrier_id: claim.carrier_id,
        approval_rate: action === 'approved' ? 100 : 0,
        avg_reduction_percent: action === 'approved' && adjustment_amount
          ? (adjustment_amount / (estimate.total || 1)) * 100 : 0,
        common_rejected_categories: rejected_categories || [],
        avg_response_time_days: response_time_days || null,
        total_interactions: 1,
        notes: null,
        last_updated: new Date().toISOString(),
        is_deleted: false,
      });
    }

    await base44.asServiceRole.entities.AuditLog.create({
      company_id: job.company_id,
      entity_type: 'AdjusterBehavior',
      entity_id: behavior?.id || 'new',
      action: 'track_outcome',
      actor_email: user.email,
      actor_id: user.id,
      description: `Adjuster ${action} outcome tracked for ${adjuster_name}`,
      metadata: {
        adjuster_id,
        estimate_id: estimate_version_id,
        action,
        adjustment_amount,
      },
    });

    return Response.json({
      success: true,
      adjuster_id,
      action,
      message: `Adjuster behavior tracked: ${action}`,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});