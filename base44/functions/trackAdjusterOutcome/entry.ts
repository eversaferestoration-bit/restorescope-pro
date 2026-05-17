import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { 
    estimate_version_id, 
    action,
    adjustment_amount,
    rejected_categories,
    response_time_days
  } = body;

  if (!estimate_version_id || !action) {
    return Response.json({ error: 'estimate_version_id and action required' }, { status: 400 });
  }

  if (!['approved', 'rejected'].includes(action)) {
    return Response.json({ error: 'action must be approved or rejected' }, { status: 400 });
  }

  try {
    const estimates = await base44.asServiceRole.entities.EstimateDraft.filter({
      id: estimate_version_id,
      is_deleted: false
    });

    if (!estimates.length) {
      return Response.json({ error: 'Estimate not found' }, { status: 404 });
    }

    const estimate = estimates[0];

    // Strict company isolation — no role bypass
    const callerProfiles = await base44.asServiceRole.entities.UserProfile.filter({ user_id: user.id, is_deleted: false });
    const callerCompanyId = callerProfiles[0]?.company_id;
    if (!callerCompanyId || callerCompanyId !== estimate.company_id) {
      return Response.json({ error: 'Forbidden', message: 'Access denied: resource belongs to a different company.' }, { status: 403 });
    }

    const jobs = await base44.asServiceRole.entities.Job.filter({
      id: estimate.job_id,
      is_deleted: false
    });

    if (!jobs.length) {
      return Response.json({ error: 'Job not found' }, { status: 404 });
    }

    const job = jobs[0];

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

    const behaviorRecords = await base44.asServiceRole.entities.AdjusterBehavior.filter({
      adjuster_id,
      is_deleted: false
    });

    const behavior = behaviorRecords[0];

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
          .sort(([,a], [,b]) => b - a)
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
        avg_reduction_percent: action === 'approved' && adjustment_amount ? 
          (adjustment_amount / (estimate.total || 1)) * 100 : 0,
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
      metadata: { adjuster_id, estimate_id: estimate_version_id, action, adjustment_amount },
    });

    return Response.json({
      success: true,
      adjuster_id,
      action,
      message: `Adjuster behavior tracked: ${action}`,
    });

  } catch (error) {
    console.error('[trackAdjusterOutcome] Error:', error.message);
    return Response.json({ error: 'An internal error occurred. Please try again.' }, { status: 500 });
  }
});