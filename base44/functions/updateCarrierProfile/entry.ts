import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (user.role !== 'admin' && user.role !== 'manager') {
    return Response.json({ error: 'Forbidden: Manager or Admin access required' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { carrier_id } = body;

    if (!carrier_id) {
      return Response.json({ error: 'carrier_id required' }, { status: 400 });
    }

    // Verify carrier belongs to caller's company
    const callerProfiles = await base44.asServiceRole.entities.UserProfile.filter({ user_id: user.id, is_deleted: false });
    const callerCompanyId = callerProfiles[0]?.company_id;
    if (!callerCompanyId) {
      return Response.json({ error: 'Forbidden: no company profile found.' }, { status: 403 });
    }

    const carriers = await base44.asServiceRole.entities.Carrier.filter({ id: carrier_id, company_id: callerCompanyId, is_deleted: false });
    if (!carriers.length) {
      return Response.json({ error: 'Carrier not found' }, { status: 404 });
    }

    const carrier = carriers[0];
    const carrier_name = carrier.name || carrier.carrier_name;

    // Only aggregate from this company's jobs (not cross-tenant)
    const allJobs = await base44.asServiceRole.entities.Job.filter({ company_id: callerCompanyId, is_deleted: false });
    const allEstimates = await base44.asServiceRole.entities.EstimateDraft.filter({ company_id: callerCompanyId, is_deleted: false });

    const jobIds = new Set(allJobs.map(j => j.id));
    const carrierEstimates = allEstimates.filter(e => jobIds.has(e.job_id));

    const totalJobs = allJobs.length;
    const approvedEstimates = carrierEstimates.filter(e => e.status === 'approved').length;
    const totalEstimates = carrierEstimates.length;

    const avg_approval_rate = totalEstimates > 0 ? (approvedEstimates / totalEstimates) * 100 : 0;

    const reductions = [];
    for (const estimate of carrierEstimates) {
      if (estimate.line_items && estimate.line_items.length > 0) {
        const versions = await base44.asServiceRole.entities.EstimateDraft.filter({ job_id: estimate.job_id, company_id: callerCompanyId, is_deleted: false });
        if (versions.length > 1) {
          const original = versions[0];
          const current = estimate;
          if (original.total && current.total && current.total < original.total) {
            reductions.push(((original.total - current.total) / original.total) * 100);
          }
        }
      }
    }

    const avg_reduction_percent = reductions.length > 0 ? reductions.reduce((sum, r) => sum + r, 0) / reductions.length : 0;

    const disputeCategories = {};
    const rejectedEstimates = carrierEstimates.filter(e => e.status === 'rejected');
    for (const estimate of rejectedEstimates) {
      if (estimate.notes) {
        const notes = estimate.notes.toLowerCase();
        if (notes.includes('documentation')) disputeCategories['documentation'] = (disputeCategories['documentation'] || 0) + 1;
        if (notes.includes('pricing') || notes.includes('cost')) disputeCategories['pricing'] = (disputeCategories['pricing'] || 0) + 1;
        if (notes.includes('scope')) disputeCategories['scope'] = (disputeCategories['scope'] || 0) + 1;
        if (notes.includes('photo')) disputeCategories['photography'] = (disputeCategories['photography'] || 0) + 1;
        if (notes.includes('necessity')) disputeCategories['necessity'] = (disputeCategories['necessity'] || 0) + 1;
      }
    }

    const common_disputes = Object.entries(disputeCategories).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([cat]) => cat);

    const docPreferences = {};
    for (const estimate of carrierEstimates.filter(e => e.status === 'approved')) {
      if (estimate.notes) {
        const notes = estimate.notes.toLowerCase();
        if (notes.includes('moisture')) docPreferences['moisture_logs'] = (docPreferences['moisture_logs'] || 0) + 1;
        if (notes.includes('photo')) docPreferences['photos'] = (docPreferences['photos'] || 0) + 1;
        if (notes.includes('invoice')) docPreferences['invoices'] = (docPreferences['invoices'] || 0) + 1;
        if (notes.includes('report')) docPreferences['reports'] = (docPreferences['reports'] || 0) + 1;
        if (notes.includes('diagram')) docPreferences['diagrams'] = (docPreferences['diagrams'] || 0) + 1;
      }
    }

    const preferred_documentation = Object.entries(docPreferences).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([doc]) => doc);

    let avg_response_time_days = 0;
    let response_behavior = 'moderate';
    const responseTimes = [];
    for (const job of allJobs) {
      if (job.date_of_loss && job.created_date) {
        const daysDiff = (new Date(job.created_date) - new Date(job.date_of_loss)) / (1000 * 60 * 60 * 24);
        if (daysDiff > 0 && daysDiff < 365) responseTimes.push(daysDiff);
      }
    }
    if (responseTimes.length > 0) {
      avg_response_time_days = responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length;
      if (avg_response_time_days <= 2) response_behavior = 'fast';
      else if (avg_response_time_days <= 5) response_behavior = 'moderate';
      else if (avg_response_time_days <= 10) response_behavior = 'slow';
      else response_behavior = 'variable';
    }

    const disputedJobs = allJobs.filter(j => carrierEstimates.filter(e => e.job_id === j.id).some(e => e.status === 'rejected')).length;
    const dispute_rate = totalJobs > 0 ? (disputedJobs / totalJobs) * 100 : 0;

    const existingProfiles = await base44.asServiceRole.entities.CarrierProfile.filter({ carrier_name, is_deleted: false });

    const profileData = {
      carrier_name,
      avg_approval_rate: Math.round(avg_approval_rate * 10) / 10,
      avg_reduction_percent: Math.round(avg_reduction_percent * 10) / 10,
      common_disputes,
      preferred_documentation,
      response_behavior,
      last_updated: new Date().toISOString(),
      total_interactions: totalJobs,
      avg_response_time_days: Math.round(avg_response_time_days * 10) / 10,
      dispute_rate: Math.round(dispute_rate * 10) / 10,
      is_deleted: false,
    };

    let profile_id;
    if (existingProfiles.length > 0) {
      await base44.asServiceRole.entities.CarrierProfile.update(existingProfiles[0].id, profileData);
      profile_id = existingProfiles[0].id;
    } else {
      const newProfile = await base44.asServiceRole.entities.CarrierProfile.create(profileData);
      profile_id = newProfile.id;
    }

    return Response.json({ success: true, profile_id, profile: profileData });

  } catch (error) {
    console.error('[updateCarrierProfile] Error:', error.message);
    return Response.json({ success: false, error: 'An internal error occurred. Please try again.' }, { status: 500 });
  }
});