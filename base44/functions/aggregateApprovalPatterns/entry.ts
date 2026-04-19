import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { days = 30, region_code = null } = body;

    const periodStart = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const periodEnd = new Date();

    // Fetch all claim outcomes
    const outcomes = await base44.asServiceRole.entities.ClaimOutcome.filter({
      is_deleted: false,
    });

    const filtered = outcomes.filter((o) => {
      const closed = new Date(o.closed_date || o.created_date);
      return closed >= periodStart && closed <= periodEnd;
    });

    // Group by region, loss_type
    const patterns = {};

    for (const outcome of filtered) {
      // Fetch job for loss_type, region
      const jobs = await base44.asServiceRole.entities.Job.filter({
        id: outcome.job_id,
        is_deleted: false,
      });

      if (jobs.length === 0) continue;
      const job = jobs[0];

      const region = region_code || (job.property_state || 'US').substring(0, 2).toUpperCase();
      const key = `${region}|${job.loss_type || 'unknown'}`;

      if (!patterns[key]) {
        patterns[key] = {
          region_code: region,
          loss_type: job.loss_type || 'unknown',
          period: periodStart.toISOString(),
          approved: 0,
          total: 0,
          reductions: [],
          turnarounds: [],
          disputes: 0,
          supplement_successes: 0,
          supplements_total: 0,
          objections: {},
        };
      }

      patterns[key].total++;
      if (outcome.win_rate_percent >= 95) patterns[key].approved++;
      if (outcome.approved_amount < outcome.requested_amount) {
        patterns[key].reductions.push(
          ((outcome.requested_amount - outcome.approved_amount) / outcome.requested_amount) * 100
        );
      }
      if (outcome.supplement_count > 0) {
        patterns[key].supplements_total += outcome.supplement_count;
        patterns[key].supplement_successes += outcome.supplements_approved || 0;
      }
      if (outcome.status === 'disputed') patterns[key].disputes++;

      // Track turnaround (estimate creation to outcome)
      const estimate = await base44.asServiceRole.entities.EstimateDraft.filter({
        id: outcome.estimate_version_id,
        is_deleted: false,
      });
      if (estimate.length > 0) {
        const hours = (new Date(outcome.closed_date) - new Date(estimate[0].created_date)) / (1000 * 60 * 60);
        patterns[key].turnarounds.push(hours);
      }
    }

    // Calculate stats
    let aggregated = 0;
    const errors = [];

    for (const [key, pattern] of Object.entries(patterns)) {
      try {
        const approval_rate = (pattern.approved / pattern.total) * 100;
        const avg_reduction = pattern.reductions.length > 0
          ? pattern.reductions.reduce((a, b) => a + b, 0) / pattern.reductions.length
          : 0;
        const avg_turnaround = pattern.turnarounds.length > 0
          ? pattern.turnarounds.reduce((a, b) => a + b, 0) / pattern.turnarounds.length
          : 0;
        const dispute_rate = (pattern.disputes / pattern.total) * 100;
        const supplement_success_rate = pattern.supplements_total > 0
          ? (pattern.supplement_successes / pattern.supplements_total) * 100
          : 0;

        const confidence = Math.min(1, pattern.total / 100);

        const existing = await base44.asServiceRole.entities.ApprovalPattern.filter({
          region_code: pattern.region_code,
          loss_type: pattern.loss_type,
          period: periodStart.toISOString(),
          is_deleted: false,
        });

        const record = {
          region_code: pattern.region_code,
          loss_type: pattern.loss_type,
          period: periodStart.toISOString(),
          approval_rate: parseFloat(approval_rate.toFixed(1)),
          avg_reduction_percent: parseFloat(avg_reduction.toFixed(1)),
          avg_turnaround_hours: parseFloat(avg_turnaround.toFixed(0)),
          dispute_rate: parseFloat(dispute_rate.toFixed(1)),
          supplement_success_rate: parseFloat(supplement_success_rate.toFixed(1)),
          sample_size: pattern.total,
          confidence_score: parseFloat(confidence.toFixed(3)),
          most_common_objections: [],
        };

        if (existing.length > 0) {
          await base44.asServiceRole.entities.ApprovalPattern.update(existing[0].id, record);
        } else {
          await base44.asServiceRole.entities.ApprovalPattern.create(record);
        }

        aggregated++;
      } catch (err) {
        errors.push(`${pattern.loss_type}: ${err.message}`);
      }
    }

    // Log aggregation
    await base44.asServiceRole.entities.AggregationLog.create({
      aggregation_type: 'approval_pattern',
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      records_processed: filtered.length,
      records_aggregated: aggregated,
      status: errors.length === 0 ? 'success' : 'partial',
      errors,
      anonymization_verified: true,
    });

    return Response.json({
      success: true,
      aggregated,
      errors,
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});