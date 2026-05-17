import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { days = 30, region_code = null } = body;

    const periodStart = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const periodEnd = new Date();

    const estimates = await base44.asServiceRole.entities.EstimateDraft.filter({ status: 'approved', is_deleted: false });

    const filtered = estimates.filter((e) => {
      const created = new Date(e.created_date || e.approved_at);
      return created >= periodStart && created <= periodEnd;
    });

    const trends = {};

    for (const estimate of filtered) {
      const jobs = await base44.asServiceRole.entities.Job.filter({ id: estimate.job_id, is_deleted: false });
      if (jobs.length === 0) continue;
      const job = jobs[0];

      const region = region_code || (job.property_state || 'US').substring(0, 2).toUpperCase();
      const key = `${region}|${job.loss_type || 'unknown'}`;

      if (!trends[key]) {
        trends[key] = {
          region_code: region,
          loss_type: job.loss_type || 'unknown',
          service_type: job.service_type,
          period: periodStart.toISOString(),
          categories: {},
        };
      }

      (estimate.line_items || []).forEach((item) => {
        const cat = item.category || 'other';
        if (!trends[key].categories[cat]) {
          trends[key].categories[cat] = { prices: [], count: 0 };
        }
        if (item.unit_cost) {
          trends[key].categories[cat].prices.push(item.unit_cost);
          trends[key].categories[cat].count++;
        }
      });
    }

    let aggregated = 0;
    const errors = [];

    for (const [key, trend] of Object.entries(trends)) {
      for (const [category, data] of Object.entries(trend.categories)) {
        if (data.prices.length === 0) continue;

        const prices = data.prices.sort((a, b) => a - b);
        const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
        const median = prices[Math.floor(prices.length / 2)];
        const variance = prices.reduce((sum, p) => sum + Math.pow(p - avg, 2), 0) / prices.length;
        const stddev = Math.sqrt(variance);
        const confidence = Math.min(1, data.count / 100);

        try {
          const existing = await base44.asServiceRole.entities.PricingTrend.filter({
            region_code: trend.region_code,
            loss_type: trend.loss_type,
            category,
            period: periodStart.toISOString(),
            is_deleted: false,
          });

          const record = {
            region_code: trend.region_code,
            loss_type: trend.loss_type,
            service_type: trend.service_type,
            category,
            period: periodStart.toISOString(),
            avg_unit_price: parseFloat(avg.toFixed(2)),
            median_unit_price: parseFloat(median.toFixed(2)),
            price_stddev: parseFloat(stddev.toFixed(2)),
            min_price: Math.min(...prices),
            max_price: Math.max(...prices),
            sample_size: data.count,
            confidence_score: parseFloat(confidence.toFixed(3)),
          };

          if (existing.length > 0) {
            await base44.asServiceRole.entities.PricingTrend.update(existing[0].id, record);
          } else {
            await base44.asServiceRole.entities.PricingTrend.create(record);
          }
          aggregated++;
        } catch (err) {
          errors.push(`${category}: ${err.message}`);
        }
      }
    }

    await base44.asServiceRole.entities.AggregationLog.create({
      aggregation_type: 'pricing_trend',
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      records_processed: filtered.length,
      records_aggregated: aggregated,
      status: errors.length === 0 ? 'success' : 'partial',
      errors,
      anonymization_verified: true,
    });

    return Response.json({ success: true, aggregated, errors });
  } catch (error) {
    console.error('[aggregatePricingTrends] Error:', error.message);
    return Response.json({ error: 'An internal error occurred. Please try again.' }, { status: 500 });
  }
});