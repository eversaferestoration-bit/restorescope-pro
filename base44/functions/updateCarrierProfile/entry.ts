import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Update Carrier Profile by aggregating outcomes across all jobs
 * Tracks trends per carrier (not per company)
 */

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

    // Get carrier details
    const carriers = await base44.asServiceRole.entities.Carrier.filter({
      id: carrier_id,
      is_deleted: false,
    });

    if (!carriers.length) {
      return Response.json({ error: 'Carrier not found' }, { status: 404 });
    }

    const carrier = carriers[0];
    const carrier_name = carrier.name || carrier.carrier_name;

    // Get all jobs for this carrier across all companies (carrier-wide trends)
    const allJobs = await base44.asServiceRole.entities.Job.filter({
      carrier_id,
      is_deleted: false,
    });

    // Get all estimates for these jobs
    const allEstimates = await base44.asServiceRole.entities.EstimateDraft.filter({
      is_deleted: false,
    });

    const jobIds = new Set(allJobs.map(j => j.id));
    const carrierEstimates = allEstimates.filter(e => jobIds.has(e.job_id));

    // Aggregate metrics
    let totalJobs = allJobs.length;
    let approvedEstimates = carrierEstimates.filter(e => e.status === 'approved').length;
    let totalEstimates = carrierEstimates.length;

    // Calculate approval rate
    let avg_approval_rate = totalEstimates > 0 
      ? (approvedEstimates / totalEstimates) * 100 
      : 0;

    // Calculate average reduction (from estimate versions and supplements)
    const reductions = [];
    for (const estimate of carrierEstimates) {
      if (estimate.line_items && estimate.line_items.length > 0) {
        // Track if there were multiple versions (indicating negotiations)
        const versions = await base44.asServiceRole.entities.EstimateDraft.filter({
          job_id: estimate.job_id,
          is_deleted: false,
        });
        if (versions.length > 1) {
          const original = versions[0];
          const current = estimate;
          if (original.total && current.total && current.total < original.total) {
            const reduction = ((original.total - current.total) / original.total) * 100;
            reductions.push(reduction);
          }
        }
      }
    }

    let avg_reduction_percent = reductions.length > 0
      ? reductions.reduce((sum, r) => sum + r, 0) / reductions.length
      : 0;

    // Identify common disputes (from rejected estimates and claim defense)
    const disputeCategories = {};
    const rejectedEstimates = carrierEstimates.filter(e => e.status === 'rejected');
    
    for (const estimate of rejectedEstimates) {
      if (estimate.notes) {
        // Extract dispute categories from rejection notes
        const notes = estimate.notes.toLowerCase();
        if (notes.includes('documentation')) disputeCategories['documentation'] = (disputeCategories['documentation'] || 0) + 1;
        if (notes.includes('pricing') || notes.includes('cost')) disputeCategories['pricing'] = (disputeCategories['pricing'] || 0) + 1;
        if (notes.includes('scope')) disputeCategories['scope'] = (disputeCategories['scope'] || 0) + 1;
        if (notes.includes('photo')) disputeCategories['photography'] = (disputeCategories['photography'] || 0) + 1;
        if (notes.includes('necessity')) disputeCategories['necessity'] = (disputeCategories['necessity'] || 0) + 1;
      }
    }

    const common_disputes = Object.entries(disputeCategories)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category]) => category);

    // Determine preferred documentation (from approved estimates)
    const docPreferences = {};
    const approvedDocs = carrierEstimates.filter(e => e.status === 'approved');
    
    for (const estimate of approvedDocs) {
      if (estimate.notes) {
        const notes = estimate.notes.toLowerCase();
        if (notes.includes('moisture')) docPreferences['moisture_logs'] = (docPreferences['moisture_logs'] || 0) + 1;
        if (notes.includes('photo')) docPreferences['photos'] = (docPreferences['photos'] || 0) + 1;
        if (notes.includes('invoice')) docPreferences['invoices'] = (docPreferences['invoices'] || 0) + 1;
        if (notes.includes('report')) docPreferences['reports'] = (docPreferences['reports'] || 0) + 1;
        if (notes.includes('diagram')) docPreferences['diagrams'] = (docPreferences['diagrams'] || 0) + 1;
      }
    }

    const preferred_documentation = Object.entries(docPreferences)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([doc]) => doc);

    // Calculate response behavior
    let avg_response_time_days = 0;
    let response_behavior = 'moderate';

    if (allJobs.length > 0) {
      const responseTimes = [];
      for (const job of allJobs) {
        if (job.date_of_loss && job.created_date) {
          const lossDate = new Date(job.date_of_loss);
          const createdDate = new Date(job.created_date);
          const daysDiff = (createdDate - lossDate) / (1000 * 60 * 60 * 24);
          if (daysDiff > 0 && daysDiff < 365) {
            responseTimes.push(daysDiff);
          }
        }
      }

      if (responseTimes.length > 0) {
        avg_response_time_days = responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length;
        
        if (avg_response_time_days <= 2) response_behavior = 'fast';
        else if (avg_response_time_days <= 5) response_behavior = 'moderate';
        else if (avg_response_time_days <= 10) response_behavior = 'slow';
        else response_behavior = 'variable';
      }
    }

    // Calculate dispute rate
    const disputedJobs = allJobs.filter(j => {
      const jobEstimates = carrierEstimates.filter(e => e.job_id === j.id);
      return jobEstimates.some(e => e.status === 'rejected');
    }).length;

    const dispute_rate = totalJobs > 0 ? (disputedJobs / totalJobs) * 100 : 0;

    // Upsert carrier profile
    const existingProfiles = await base44.asServiceRole.entities.CarrierProfile.filter({
      carrier_name,
      is_deleted: false,
    });

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

    return Response.json({
      success: true,
      profile_id,
      profile: profileData,
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
});